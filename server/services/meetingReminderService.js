// backend/services/meetingReminder.js
const cron = require('node-cron');
const ScheduledMeeting = require('../models/scheduledMeeting');
const Notification = require('../models/notification');

// Run every 30 minutes to check for meetings starting in 3 hours
const startMeetingReminderService = () => {
  // Run every 30 minutes: '*/30 * * * *'
  // For testing, run every minute: '* * * * *'
  cron.schedule('*/30 * * * *', async () => {
    try {
      console.log('[Reminder Service] Checking for upcoming meetings...');
      
      const now = new Date();
      const threeHoursLater = new Date(now.getTime() + 3 * 60 * 60 * 1000);
      const threeHoursThirtyMinLater = new Date(now.getTime() + 3.5 * 60 * 60 * 1000);

      // Find meetings that start between 3 and 3.5 hours from now
      // This prevents duplicate notifications
      const upcomingMeetings = await ScheduledMeeting.find({
        meeting_datetime: {
          $gte: threeHoursLater,
          $lt: threeHoursThirtyMinLater
        },
        status: 'approved', // Only approved meetings
        meetingEnded: false,
        reminderSent: { $ne: true } // Don't send duplicate reminders
      })
        .populate('attendees.user', 'firstName lastName email')
        .populate('createdBy', 'firstName lastName');

      console.log(`[Reminder Service] Found ${upcomingMeetings.length} meetings needing reminders`);

      for (const meeting of upcomingMeetings) {
        try {
          // Create reminder notifications for all attendees
          const attendeeIds = meeting.attendees.map(a => a.user._id);
          
          const notifications = attendeeIds.map(recipientId => ({
            recipient: recipientId,
            type: 'meeting_reminder',
            title: 'Meeting Reminder',
            message: `"${meeting.meeting_name}" starts in 3 hours`,
            relatedMeeting: meeting._id,
            triggeredBy: meeting.createdBy._id,
            metadata: {
              meetingTime: meeting.meeting_datetime,
              meetingName: meeting.meeting_name,
              action: 'reminder'
            }
          }));

          await Notification.insertMany(notifications);

          // Mark reminder as sent
          meeting.reminderSent = true;
          await meeting.save();

          console.log(`[Reminder Service] Sent reminders for: ${meeting.meeting_name}`);
        } catch (err) {
          console.error(`[Reminder Service] Error processing meeting ${meeting._id}:`, err);
        }
      }
    } catch (error) {
      console.error('[Reminder Service] Error:', error);
    }
  });

  console.log('[Reminder Service] Started - Running every 30 minutes');
};

module.exports = { startMeetingReminderService };