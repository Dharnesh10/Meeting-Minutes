// =====================================================================
// FIXED AUTO-COMPLETE SERVICE
// File: server/services/autoCompleteMeeting.js
// =====================================================================

const cron = require('node-cron');
const { ScheduledMeeting } = require('../models/scheduledMeeting');
const Notification = require('../models/notification');

// =====================================================================
// 1. AUTO-COMPLETE MEETINGS (at END time + 15-min grace)
// =====================================================================
async function autoCompleteMeetings() {
  try {
    const now = new Date();
    const fifteenMinutesAgo = new Date(now.getTime() - 15 * 60 * 1000);

    console.log('[AUTO-COMPLETE] Checking for expired meetings...');
    console.log(`   Current time: ${now.toISOString()}`);

    // Find meetings that:
    // 1. Have been started
    // 2. Have NOT been ended yet
    // 3. End time was more than 15 minutes ago
    const expiredMeetings = await ScheduledMeeting.find({
      meetingStarted: true,
      meetingEnded: false,
      meeting_end_datetime: { $lt: fifteenMinutesAgo }
    })
    .populate('createdBy', 'firstName lastName email')
    .limit(50);

    if (expiredMeetings.length > 0) {
      console.log(`   Found ${expiredMeetings.length} meetings to auto-complete`);

      for (const meeting of expiredMeetings) {
        try {
          // Calculate how late the auto-complete is
          const endTime = new Date(meeting.meeting_end_datetime);
          const minutesOverdue = Math.floor((now - endTime) / (60 * 1000));

          console.log(`   Auto-completing: "${meeting.meeting_name}" (ID: ${meeting.meetingid})`);
          console.log(`      Scheduled end: ${endTime.toISOString()}`);
          console.log(`      Overdue by: ${minutesOverdue} minutes`);

          // Update the meeting
          meeting.meetingEnded = true;
          meeting.meetingEndedAt = now;
          meeting.status = 'completed';
          meeting.autoCompleted = true;
          meeting.completionNotes = `Meeting auto-completed ${minutesOverdue} minutes after scheduled end time.`;

          await meeting.save();

          // Send notification to host
          try {
            await Notification.create({
              recipient: meeting.createdBy._id,
              type: 'meeting_ended',
              title: 'Meeting Auto-Completed',
              message: `Your meeting "${meeting.meeting_name}" was automatically completed after ${minutesOverdue} minutes past the scheduled end time.`,
              relatedMeeting: meeting._id,
              triggeredBy: meeting.createdBy._id
            });
          } catch (notifError) {
            console.error('      Failed to send auto-complete notification:', notifError.message);
          }

          console.log(`   ✅ Auto-completed successfully`);
        } catch (err) {
          console.error(`   ❌ Error auto-completing meeting ${meeting.meetingid}:`, err.message);
        }
      }
    } else {
      console.log('   No meetings to auto-complete');
    }
  } catch (err) {
    console.error('[AUTO-COMPLETE ERROR]:', err.message);
    console.error(err.stack);
  }
}

// =====================================================================
// 2. AUTO-CANCEL UNSTARTED MEETINGS (1hr after end time)
// =====================================================================
async function autoCancelExpiredMeetings() {
  try {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

    console.log('[AUTO-CANCEL] Checking for unstarted expired meetings...');

    // Find approved meetings that:
    // 1. Were NEVER started
    // 2. End time was over 1 hour ago
    const unstartedExpired = await ScheduledMeeting.find({
      status: 'approved',
      meetingStarted: false,
      meeting_end_datetime: { $lt: oneHourAgo }
    }).limit(50);

    if (unstartedExpired.length > 0) {
      console.log(`   Found ${unstartedExpired.length} unstarted expired meetings to cancel`);

      const result = await ScheduledMeeting.updateMany(
        {
          status: 'approved',
          meetingStarted: false,
          meeting_end_datetime: { $lt: oneHourAgo }
        },
        {
          $set: {
            status: 'cancelled',
            cancellationReason: 'Meeting not started by the user! Meeting cancelled due to overtime.'
          }
        }
      );

      console.log(`   ✅ Cancelled ${result.modifiedCount} unstarted meetings`);
    } else {
      console.log('   No unstarted meetings to cancel');
    }
  } catch (err) {
    console.error('[AUTO-CANCEL ERROR]:', err.message);
    console.error(err.stack);
  }
}

// =====================================================================
// 3. AUTO-REJECT OVERTIME PENDING APPROVALS
// =====================================================================
async function autoRejectOvertimePendingMeetings() {
  try {
    const now = new Date();

    console.log('[AUTO-REJECT] Checking for overtime pending approvals...');

    // Find pending meetings where start time has passed
    const overtimePending = await ScheduledMeeting.find({
      status: 'pending_approval',
      meeting_datetime: { $lt: now }
    }).limit(50);

    if (overtimePending.length > 0) {
      console.log(`   Found ${overtimePending.length} overtime pending meetings to reject`);

      const result = await ScheduledMeeting.updateMany(
        {
          status: 'pending_approval',
          meeting_datetime: { $lt: now }
        },
        {
          $set: {
            status: 'rejected',
            rejectionReason: 'Meeting approval request expired - start time has passed.'
          }
        }
      );

      console.log(`   ✅ Rejected ${result.modifiedCount} overtime pending meetings`);
    } else {
      console.log('   No overtime pending meetings to reject');
    }
  } catch (err) {
    console.error('[AUTO-REJECT ERROR]:', err.message);
    console.error(err.stack);
  }
}

// =====================================================================
// 4. SEND 5-MINUTE END WARNINGS
// =====================================================================
async function sendMeetingEndWarnings() {
  try {
    const now = new Date();
    const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60 * 1000);
    const sixMinutesFromNow = new Date(now.getTime() + 6 * 60 * 1000);

    console.log('[END-WARNING] Checking for meetings ending soon...');

    // Find meetings that:
    // 1. Are currently running
    // 2. End in 5-6 minutes
    // 3. Haven't been warned yet
    const endingSoon = await ScheduledMeeting.find({
      meetingStarted: true,
      meetingEnded: false,
      endWarningShown: false,
      meeting_end_datetime: {
        $gte: fiveMinutesFromNow,
        $lte: sixMinutesFromNow
      }
    })
    .populate('createdBy', 'firstName lastName email')
    .limit(50);

    if (endingSoon.length > 0) {
      console.log(`   Found ${endingSoon.length} meetings ending soon`);

      for (const meeting of endingSoon) {
        try {
          const endTime = new Date(meeting.meeting_end_datetime);
          const minutesLeft = Math.ceil((endTime - now) / (60 * 1000));

          console.log(`   Sending end warning for: "${meeting.meeting_name}"`);
          console.log(`      Ends in: ${minutesLeft} minutes`);

          // Send notification to host
          await Notification.create({
            recipient: meeting.createdBy._id,
            type: 'meeting_ending_soon',
            title: 'Meeting Ending Soon',
            message: `Your meeting "${meeting.meeting_name}" will end in ${minutesLeft} minutes.`,
            relatedMeeting: meeting._id,
            triggeredBy: meeting.createdBy._id
          });

          // Mark as warned
          meeting.endWarningShown = true;
          await meeting.save();

          console.log(`   ✅ End warning sent`);
        } catch (err) {
          console.error(`   ❌ Error sending end warning:`, err.message);
        }
      }
    } else {
      console.log('   No meetings ending soon');
    }
  } catch (err) {
    console.error('[END-WARNING ERROR]:', err.message);
    console.error(err.stack);
  }
}

// =====================================================================
// 5. SEND 3-HOUR MEETING REMINDERS
// =====================================================================
async function sendMeetingReminders() {
  try {
    const now = new Date();
    const threeHoursFromNow = new Date(now.getTime() + 3 * 60 * 60 * 1000);
    const threeHoursOneMinuteFromNow = new Date(now.getTime() + 181 * 60 * 1000);

    console.log('[REMINDER] Checking for upcoming meetings...');

    // Find approved meetings starting in ~3 hours
    const upcomingMeetings = await ScheduledMeeting.find({
      status: 'approved',
      meetingStarted: false,
      reminderSent: { $ne: true },
      meeting_datetime: {
        $gte: threeHoursFromNow,
        $lte: threeHoursOneMinuteFromNow
      }
    })
    .populate('createdBy', 'firstName lastName email')
    .populate('attendees.user', 'firstName lastName email')
    .limit(50);

    if (upcomingMeetings.length > 0) {
      console.log(`   Found ${upcomingMeetings.length} meetings to remind`);

      for (const meeting of upcomingMeetings) {
        try {
          console.log(`   Sending reminders for: "${meeting.meeting_name}"`);

          // Notify all attendees
          const attendeeIds = meeting.attendees.map(a => a.user._id);
          
          for (const attendeeId of attendeeIds) {
            await Notification.create({
              recipient: attendeeId,
              type: 'meeting_reminder',
              title: 'Meeting Reminder',
              message: `Reminder: "${meeting.meeting_name}" starts in 3 hours.`,
              relatedMeeting: meeting._id,
              triggeredBy: meeting.createdBy._id
            });
          }

          // Mark as reminded
          meeting.reminderSent = true;
          await meeting.save();

          console.log(`   ✅ Sent ${attendeeIds.length} reminders`);
        } catch (err) {
          console.error(`   ❌ Error sending reminders:`, err.message);
        }
      }
    } else {
      console.log('   No meetings to remind');
    }
  } catch (err) {
    console.error('[REMINDER ERROR]:', err.message);
    console.error(err.stack);
  }
}

// =====================================================================
// 6. CHECK AND CANCEL SPECIFIC MEETING IF EXPIRED
// =====================================================================
async function checkAndCancelIfExpired(meetingId) {
  try {
    const meeting = await ScheduledMeeting.findById(meetingId);
    
    if (!meeting) {
      return { cancelled: false, reason: 'Meeting not found' };
    }

    const now = new Date();
    
    // Cancel if start time has passed and status is pending
    if (meeting.status === 'pending_approval' && new Date(meeting.meeting_datetime) < now) {
      meeting.status = 'rejected';
      meeting.rejectionReason = 'Meeting approval request expired';
      await meeting.save();
      
      return { cancelled: true, reason: 'Approval expired' };
    }

    return { cancelled: false, reason: 'No action needed' };
  } catch (err) {
    console.error('[CHECK-CANCEL ERROR]:', err.message);
    return { cancelled: false, reason: 'Error: ' + err.message };
  }
}

// =====================================================================
// 7. START SERVICE - RUNS EVERY MINUTE
// =====================================================================
function startAutoCompleteMeetingService() {
  console.log('✅ [MEETING-SERVICE] Started - Running every minute');

  // Run all checks every minute
  cron.schedule('* * * * *', async () => {
    console.log('');
    console.log('🔄 [MEETING-SERVICE] Running all checks...');
    console.log(`   Time: ${new Date().toISOString()}`);
    console.log('');

    try {
      await autoCompleteMeetings();
      await autoCancelExpiredMeetings();
      await autoRejectOvertimePendingMeetings();
      await sendMeetingEndWarnings();
      await sendMeetingReminders();
    } catch (err) {
      console.error('❌ [MEETING-SERVICE ERROR]:', err.message);
      console.error(err.stack);
    }

    console.log('');
    console.log('✅ [MEETING-SERVICE] All checks completed');
    console.log('==========================================');
  });

  // Run once on startup (after 5 seconds)
  setTimeout(async () => {
    console.log('🔄 [MEETING-SERVICE] Running initial check...');
    
    try {
      await autoCompleteMeetings();
      await autoCancelExpiredMeetings();
      await autoRejectOvertimePendingMeetings();
    } catch (err) {
      console.error('❌ [MEETING-SERVICE] Initial check error:', err.message);
    }
  }, 5000);
}

// =====================================================================
// EXPORTS
// =====================================================================
module.exports = {
  startAutoCompleteMeetingService,
  autoCompleteMeetings,
  autoCancelExpiredMeetings,
  autoRejectOvertimePendingMeetings,
  sendMeetingEndWarnings,
  sendMeetingReminders,
  checkAndCancelIfExpired
};