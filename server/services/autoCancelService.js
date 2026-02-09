const { ScheduledMeeting } = require('../models/scheduledMeeting');

/**
 * Auto-cancel meetings that were not started on time
 * This should run every 30 minutes
 */
async function autoCancelExpiredMeetings() {
  try {
    console.log('[AUTO-CANCEL] Checking for expired meetings...');
    
    const now = new Date();
    
    // Find approved meetings where:
    // 1. Status is 'approved' (not started yet)
    // 2. Meeting end time + 1 hour grace period has passed
    // 3. Meeting was never started
    
    const expiredMeetings = await ScheduledMeeting.find({
      status: 'approved',
      meetingStarted: false,
      meeting_end_datetime: { $lt: new Date(now.getTime() - 60 * 60000) } // 1 hour ago
    }).populate('createdBy', 'firstName lastName email');

    if (expiredMeetings.length === 0) {
      console.log('[AUTO-CANCEL] No expired meetings found');
      return { cancelled: 0, meetings: [] };
    }

    console.log(`[AUTO-CANCEL] Found ${expiredMeetings.length} expired meeting(s)`);

    const cancelledMeetings = [];

    for (const meeting of expiredMeetings) {
      meeting.status = 'cancelled';
      meeting.cancellationReason = 'Meeting not started by the user! Meeting cancelled due to overtime.';
      meeting.cancelledBy = meeting.createdBy._id;
      meeting.cancelledAt = now;
      
      await meeting.save();
      
      cancelledMeetings.push({
        meetingId: meeting.meetingid,
        name: meeting.meeting_name,
        scheduledTime: meeting.meeting_datetime,
        host: `${meeting.createdBy.firstName} ${meeting.createdBy.lastName}`
      });

      console.log(`[AUTO-CANCEL] Cancelled meeting: ${meeting.meeting_name} (ID: ${meeting.meetingid})`);
    }

    console.log(`[AUTO-CANCEL] Successfully cancelled ${cancelledMeetings.length} meeting(s)`);
    
    return {
      cancelled: cancelledMeetings.length,
      meetings: cancelledMeetings
    };

  } catch (error) {
    console.error('[AUTO-CANCEL] Error:', error);
    return { cancelled: 0, meetings: [], error: error.message };
  }
}

/**
 * Check if a specific meeting should be auto-cancelled
 * Used when user tries to start a meeting
 */
async function checkAndCancelIfExpired(meetingId) {
  try {
    const meeting = await ScheduledMeeting.findById(meetingId);
    
    if (!meeting) {
      return { cancelled: false, reason: 'Meeting not found' };
    }

    // Don't auto-cancel if already started, ended, or cancelled
    if (meeting.meetingStarted || meeting.meetingEnded || meeting.status === 'cancelled' || meeting.status === 'completed') {
      return { cancelled: false, reason: 'Meeting already in terminal state' };
    }

    // Don't auto-cancel if not approved
    if (meeting.status !== 'approved') {
      return { cancelled: false, reason: 'Meeting not approved' };
    }

    const now = new Date();
    const meetingEndTime = new Date(meeting.meeting_end_datetime);
    const graceEndTime = new Date(meetingEndTime.getTime() + 60 * 60000); // 1 hour grace

    if (now > graceEndTime) {
      meeting.status = 'cancelled';
      meeting.cancellationReason = 'Meeting not started by the user! Meeting cancelled due to overtime.';
      meeting.cancelledBy = meeting.createdBy;
      meeting.cancelledAt = now;
      await meeting.save();

      return { 
        cancelled: true, 
        reason: 'Meeting not started by the user! Meeting cancelled due to overtime.',
        meeting 
      };
    }

    return { cancelled: false, reason: 'Meeting still within grace period' };

  } catch (error) {
    console.error('[CHECK-EXPIRE] Error:', error);
    return { cancelled: false, error: error.message };
  }
}

module.exports = {
  autoCancelExpiredMeetings,
  checkAndCancelIfExpired
};