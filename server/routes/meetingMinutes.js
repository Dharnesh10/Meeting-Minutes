const router = require('express').Router();
const authMiddleware = require('../middleware/auth');
const { MeetingMinute } = require('../models/meetingMinute');
const { ScheduledMeeting } = require('../models/scheduledMeeting');
const { User } = require('../models/user');

// Get all minutes for a meeting + permissions
router.get('/:meetingId', authMiddleware, async (req, res) => {
  try {
    const meeting = await ScheduledMeeting.findById(req.params.meetingId)
      .populate('createdBy')
      .populate('currentScribe')
      .populate('attendees.user');

    if (!meeting) {
      return res.status(404).send({ message: 'Meeting not found' });
    }

    const minutes = await MeetingMinute.find({
      meeting: req.params.meetingId,
      isDeleted: false
    })
      .populate('createdBy', 'firstName lastName email')
      .sort({ order: 1, createdAt: 1 });

    // Calculate permissions
    const isCreator = meeting.createdBy._id.toString() === req.user.id;
    const isScribe = meeting.currentScribe && meeting.currentScribe._id.toString() === req.user.id;
    const isAttendee = meeting.attendees.some(a => a.user._id.toString() === req.user.id);

    // FIXED: Can take minutes if meeting has started AND (is creator with no scribe OR is scribe)
    const canTakeMinutes = meeting.meetingStarted && !meeting.meetingEnded && (
      (isCreator && !meeting.currentScribe) || // Creator when no scribe assigned
      (isCreator && isScribe) ||                // Creator who is also the scribe
      isScribe                                   // Assigned scribe
    );

    const permissions = {
      canTakeMinutes,
      isCreator,
      isScribe,
      canApproveScribe: isCreator && !meeting.meetingEnded,
      canView: isCreator || isScribe || isAttendee,
      meetingStarted: meeting.meetingStarted
    };

    res.status(200).send({
      minutes,
      permissions,
      meetingState: {
        currentScribe: meeting.currentScribe,
        meetingStarted: meeting.meetingStarted,
        meetingEnded: meeting.meetingEnded,
        status: meeting.status
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).send({ message: 'Server error' });
  }
});

// Add a new minute - FIXED PERMISSION LOGIC
router.post('/:meetingId', authMiddleware, async (req, res) => {
  try {
    const { content } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).send({ message: 'Content is required' });
    }

    const meeting = await ScheduledMeeting.findById(req.params.meetingId);

    if (!meeting) {
      return res.status(404).send({ message: 'Meeting not found' });
    }

    // CHECK 1: Meeting must have started
    if (!meeting.meetingStarted) {
      return res.status(400).send({ 
        message: 'Cannot add minutes before the meeting has started' 
      });
    }

    // CHECK 2: Meeting must not have ended
    if (meeting.meetingEnded) {
      return res.status(400).send({ message: 'Cannot add minutes to ended meeting' });
    }

    // CHECK 3: Permission check - FIXED LOGIC
    const isCreator = meeting.createdBy.toString() === req.user.id;
    const isScribe = meeting.currentScribe && meeting.currentScribe.toString() === req.user.id;

    // FIXED: Allow if:
    // 1. Creator when no scribe is assigned, OR
    // 2. User is the assigned scribe (regardless of if they're also creator)
    const canTakeMinutes = (isCreator && !meeting.currentScribe) || isScribe;

    if (!canTakeMinutes) {
      // Provide helpful error message
      if (!isCreator && !isScribe) {
        return res.status(403).send({ 
          message: 'Only the meeting host or assigned scribe can take minutes' 
        });
      }
      if (isCreator && meeting.currentScribe && !isScribe) {
        return res.status(403).send({ 
          message: 'A scribe has been assigned. Only the scribe can take minutes now.' 
        });
      }
      return res.status(403).send({ 
        message: 'You do not have permission to take minutes' 
      });
    }

    // Get the next order number
    const lastMinute = await MeetingMinute.findOne({
      meeting: req.params.meetingId
    }).sort({ order: -1 });

    const order = lastMinute ? lastMinute.order + 1 : 1;

    const minute = new MeetingMinute({
      meeting: req.params.meetingId,
      content: content.trim(),
      createdBy: req.user.id,
      isScribe: isScribe,
      order
    });

    await minute.save();
    await minute.populate('createdBy', 'firstName lastName email');

    res.status(201).send({ minute });
  } catch (err) {
    console.error(err);
    res.status(500).send({ message: 'Server error' });
  }
});

// Update a minute - ONLY BY CREATOR AND ONLY DURING MEETING
router.put('/:meetingId/:minuteId', authMiddleware, async (req, res) => {
  try {
    const { content } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).send({ message: 'Content is required' });
    }

    const meeting = await ScheduledMeeting.findById(req.params.meetingId);

    if (!meeting) {
      return res.status(404).send({ message: 'Meeting not found' });
    }

    // Cannot edit after meeting has ended
    if (meeting.meetingEnded) {
      return res.status(400).send({ message: 'Cannot edit minutes after meeting has ended' });
    }

    const minute = await MeetingMinute.findById(req.params.minuteId);

    if (!minute) {
      return res.status(404).send({ message: 'Minute not found' });
    }

    // Only the author/creator of the minute can edit it
    if (minute.createdBy.toString() !== req.user.id) {
      return res.status(403).send({ message: 'You can only edit your own minutes' });
    }

    minute.content = content.trim();
    await minute.save();

    res.status(200).send({ minute });
  } catch (err) {
    console.error(err);
    res.status(500).send({ message: 'Server error' });
  }
});

// Delete a minute - ONLY BY CREATOR AND ONLY DURING MEETING
router.delete('/:meetingId/:minuteId', authMiddleware, async (req, res) => {
  try {
    const meeting = await ScheduledMeeting.findById(req.params.meetingId);

    if (!meeting) {
      return res.status(404).send({ message: 'Meeting not found' });
    }

    // Cannot delete after meeting has ended
    if (meeting.meetingEnded) {
      return res.status(400).send({ message: 'Cannot delete minutes after meeting has ended' });
    }

    const minute = await MeetingMinute.findById(req.params.minuteId);

    if (!minute) {
      return res.status(404).send({ message: 'Minute not found' });
    }

    // Only the author/creator can delete their own minutes
    if (minute.createdBy.toString() !== req.user.id) {
      return res.status(403).send({ message: 'You can only delete your own minutes' });
    }

    minute.isDeleted = true;
    minute.deletedAt = new Date();
    minute.deletedBy = req.user.id;
    await minute.save();

    res.status(200).send({ message: 'Minute deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).send({ message: 'Server error' });
  }
});

// Approve scribe
router.post('/:meetingId/scribe/approve', authMiddleware, async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).send({ message: 'User ID is required' });
    }

    const meeting = await ScheduledMeeting.findById(req.params.meetingId);

    if (!meeting) {
      return res.status(404).send({ message: 'Meeting not found' });
    }

    // Only creator can approve scribe
    if (meeting.createdBy.toString() !== req.user.id) {
      return res.status(403).send({ message: 'Only the meeting creator can approve a scribe' });
    }

    if (meeting.meetingEnded) {
      return res.status(400).send({ message: 'Cannot change scribe after meeting has ended' });
    }

    // Check if user is an attendee
    const isAttendee = meeting.attendees.some(a => a.user.toString() === userId);

    if (!isAttendee) {
      return res.status(400).send({ message: 'User must be an attendee to become scribe' });
    }

    meeting.currentScribe = userId;
    meeting.scribeApprovedAt = new Date();
    await meeting.save();

    const scribe = await User.findById(userId).select('firstName lastName email');

    res.status(200).send({
      message: 'Scribe approved successfully',
      scribe
    });
  } catch (err) {
    console.error(err);
    res.status(500).send({ message: 'Server error' });
  }
});

// Remove scribe
router.post('/:meetingId/scribe/remove', authMiddleware, async (req, res) => {
  try {
    const meeting = await ScheduledMeeting.findById(req.params.meetingId);

    if (!meeting) {
      return res.status(404).send({ message: 'Meeting not found' });
    }

    // Only creator can remove scribe
    if (meeting.createdBy.toString() !== req.user.id) {
      return res.status(403).send({ message: 'Only the meeting creator can remove a scribe' });
    }

    if (meeting.meetingEnded) {
      return res.status(400).send({ message: 'Cannot change scribe after meeting has ended' });
    }

    meeting.currentScribe = null;
    meeting.scribeApprovedAt = null;
    await meeting.save();

    res.status(200).send({
      message: 'Scribe removed successfully'
    });
  } catch (err) {
    console.error(err);
    res.status(500).send({ message: 'Server error' });
  }
});

// Start meeting - WITH ALL VALIDATIONS
router.post('/:meetingId/start', authMiddleware, async (req, res) => {
  try {
    const meeting = await ScheduledMeeting.findById(req.params.meetingId);

    if (!meeting) {
      return res.status(404).send({ message: 'Meeting not found' });
    }

    // Only creator can start meeting
    if (meeting.createdBy.toString() !== req.user.id) {
      return res.status(403).send({ message: 'Only the meeting creator can start the meeting' });
    }

    // Must be approved by HOD
    if (meeting.status !== 'approved') {
      return res.status(400).send({ 
        message: 'Meeting must be approved by HOD before it can be started',
        currentStatus: meeting.status
      });
    }

    // Cannot start cancelled meetings
    if (meeting.status === 'cancelled') {
      return res.status(400).send({ message: 'Cannot start a cancelled meeting' });
    }

    // Already started
    if (meeting.meetingStarted) {
      return res.status(400).send({ message: 'Meeting has already been started' });
    }

    // Check if current time is within allowed window
    const now = new Date();
    const meetingTime = new Date(meeting.meeting_datetime);
    const meetingEndTime = new Date(meeting.meeting_end_datetime);
    
    // Allow starting 15 minutes before scheduled time
    const allowedStartTime = new Date(meetingTime.getTime() - 15 * 60000);
    
    // Check if meeting time has passed (with 1 hour grace period)
    const graceEndTime = new Date(meetingEndTime.getTime() + 60 * 60000);
    
    if (now < allowedStartTime) {
      const minutesUntil = Math.ceil((allowedStartTime - now) / 60000);
      return res.status(400).send({ 
        message: `Meeting can only be started 15 minutes before scheduled time. Please wait ${minutesUntil} minutes.`,
        scheduledTime: meetingTime,
        currentTime: now
      });
    }

    if (now > graceEndTime) {
      // AUTO-CANCEL: Meeting time has passed
      meeting.status = 'cancelled';
      meeting.cancellationReason = 'Meeting not started by the user! Meeting cancelled due to overtime.';
      meeting.cancelledBy = req.user.id;
      meeting.cancelledAt = now;
      await meeting.save();

      return res.status(400).send({ 
        message: 'Meeting time has expired. The meeting has been automatically cancelled.',
        reason: 'Meeting not started by the user! Meeting cancelled due to overtime.'
      });
    }

    // All checks passed - start the meeting
    meeting.meetingStarted = true;
    meeting.meetingStartedAt = new Date();
    await meeting.save();

    res.status(200).send({
      message: 'Meeting started successfully',
      meeting
    });
  } catch (err) {
    console.error(err);
    res.status(500).send({ message: 'Server error' });
  }
});

// End meeting - CHANGES STATUS TO COMPLETED
router.post('/:meetingId/end', authMiddleware, async (req, res) => {
  try {
    const meeting = await ScheduledMeeting.findById(req.params.meetingId);

    if (!meeting) {
      return res.status(404).send({ message: 'Meeting not found' });
    }

    // Only creator can end meeting
    if (meeting.createdBy.toString() !== req.user.id) {
      return res.status(403).send({ message: 'Only the meeting creator can end the meeting' });
    }

    if (meeting.status === 'cancelled') {
      return res.status(400).send({ message: 'Cannot end a cancelled meeting' });
    }

    if (meeting.meetingEnded) {
      return res.status(400).send({ message: 'Meeting has already been ended' });
    }

    // Change status to 'completed' when ending meeting
    meeting.meetingEnded = true;
    meeting.meetingEndedAt = new Date();
    meeting.status = 'completed';
    await meeting.save();

    res.status(200).send({
      message: 'Meeting ended successfully',
      meeting
    });
  } catch (err) {
    console.error(err);
    res.status(500).send({ message: 'Server error' });
  }
});

// Poll for updates
router.get('/:meetingId/poll', authMiddleware, async (req, res) => {
  try {
    const { lastUpdate } = req.query;
    const lastUpdateDate = lastUpdate ? new Date(lastUpdate) : new Date(0);

    const updates = await MeetingMinute.find({
      meeting: req.params.meetingId,
      isDeleted: false,
      updatedAt: { $gt: lastUpdateDate }
    })
      .populate('createdBy', 'firstName lastName email')
      .sort({ order: 1 });

    const deleted = await MeetingMinute.find({
      meeting: req.params.meetingId,
      isDeleted: true,
      deletedAt: { $gt: lastUpdateDate }
    }).select('_id');

    const meeting = await ScheduledMeeting.findById(req.params.meetingId)
      .select('currentScribe meetingStarted meetingEnded status');

    res.status(200).send({
      updates,
      deleted: deleted.map(d => d._id.toString()),
      meetingState: {
        currentScribe: meeting.currentScribe,
        meetingStarted: meeting.meetingStarted,
        meetingEnded: meeting.meetingEnded,
        status: meeting.status
      },
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.error(err);
    res.status(500).send({ message: 'Server error' });
  }
});

module.exports = router;