// backend/services/autoCompleteMeeting.js
const cron = require('node-cron');
const { ScheduledMeeting } = require('../models/scheduledMeeting');

// Run every 5 minutes to check for meetings that should be auto-completed
const startAutoCompleteMeetingService = () => {
  // Run every 5 minutes: '*/5 * * * *'
  // For testing, run every minute: '* * * * *'
  cron.schedule('*/5 * * * *', async () => {
    try {
      console.log('[AUTO-COMPLETE] Checking for meetings past end time...');
      
      const now = new Date();

      // Find meetings that:
      // 1. Have passed their end time
      // 2. Are still marked as approved or in progress
      // 3. Haven't been completed yet
      const expiredMeetings = await ScheduledMeeting.find({
        meeting_end_datetime: { $lt: now },
        status: 'approved',
        meetingEnded: { $ne: true }
      })
        .populate('createdBy', 'firstName lastName email')
        .populate('attendees.user', 'firstName lastName email');

      if (expiredMeetings.length === 0) {
        console.log('[AUTO-COMPLETE] No expired meetings found');
        return;
      }

      console.log(`[AUTO-COMPLETE] Found ${expiredMeetings.length} meetings to auto-complete`);

      for (const meeting of expiredMeetings) {
        try {
          // Mark meeting as completed
          meeting.status = 'completed';
          meeting.meetingEnded = true;
          meeting.meetingEndedAt = new Date();
          meeting.completionNotes = 'Auto-completed: Meeting time expired';
          meeting.autoCompleted = true; // Flag to track auto-completion
          
          await meeting.save();

          console.log(`[AUTO-COMPLETE] ✅ Completed meeting: ${meeting.meeting_name} (ID: ${meeting.meetingid})`);
          console.log(`   - Scheduled: ${meeting.meeting_datetime}`);
          console.log(`   - End time: ${meeting.meeting_end_datetime}`);
          console.log(`   - Host: ${meeting.createdBy.firstName} ${meeting.createdBy.lastName}`);
        } catch (err) {
          console.error(`[AUTO-COMPLETE] ❌ Error completing meeting ${meeting.meetingid}:`, err);
        }
      }

      console.log(`[AUTO-COMPLETE] Completed ${expiredMeetings.length} meeting(s)`);
    } catch (error) {
      console.error('[AUTO-COMPLETE] Service error:', error);
    }
  });

  console.log('[AUTO-COMPLETE] Service started - Running every 5 minutes');
};

module.exports = { startAutoCompleteMeetingService };