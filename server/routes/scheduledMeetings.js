const router = require('express').Router();
const authMiddleware = require('../middleware/auth');
const { ScheduledMeeting } = require('../models/scheduledMeeting');
const { User } = require('../models/user');
const { Department } = require('../models/department');
const { Venue } = require('../models/venue');

// Generate unique meeting ID
async function generateUniqueMeetingId() {
  let meetingid;
  let exists = true;

  while (exists) {
    meetingid = Math.floor(100000 + Math.random() * 900000);
    const existing = await ScheduledMeeting.findOne({ meetingid });
    exists = !!existing;
  }

  return meetingid;
}

// Check if users have conflicting meetings
async function checkUserAvailability(userIds, meetingStart, meetingEnd, excludeMeetingId = null) {
  const conflicts = [];
  
  for (const userId of userIds) {
    // Find meetings where this user is:
    // 1. The creator, OR
    // 2. An attendee
    // AND the meeting overlaps with the proposed time
    // AND the meeting is not cancelled/rejected
    
    const query = {
      status: { $in: ['pending_approval', 'approved'] },
      $or: [
        { createdBy: userId },
        { 'attendees.user': userId }
      ],
      $or: [
        // Meeting starts during proposed time
        { 
          meeting_datetime: { $gte: meetingStart, $lt: meetingEnd }
        },
        // Meeting ends during proposed time
        {
          meeting_end_datetime: { $gt: meetingStart, $lte: meetingEnd }
        },
        // Meeting spans the entire proposed time
        {
          meeting_datetime: { $lte: meetingStart },
          meeting_end_datetime: { $gte: meetingEnd }
        }
      ]
    };

    // Exclude current meeting if editing
    if (excludeMeetingId) {
      query._id = { $ne: excludeMeetingId };
    }

    const conflictingMeetings = await ScheduledMeeting.find(query)
      .populate('createdBy', 'firstName lastName email facultyId')
      .populate('attendees.user', 'firstName lastName email facultyId')
      .select('meeting_name meeting_datetime meeting_end_datetime meetingid createdBy');

    if (conflictingMeetings.length > 0) {
      const user = await User.findById(userId).select('firstName lastName email facultyId');
      conflicts.push({
        user: {
          _id: user._id,
          name: `${user.firstName} ${user.lastName}`,
          email: user.email,
          facultyId: user.facultyId
        },
        conflictingMeetings: conflictingMeetings.map(m => ({
          meetingId: m.meetingid,
          name: m.meeting_name,
          startTime: m.meeting_datetime,
          endTime: m.meeting_end_datetime,
          host: `${m.createdBy.firstName} ${m.createdBy.lastName}`
        }))
      });
    }
  }

  return conflicts;
}

// Get pending approval count for HODs
router.get('/pending-count', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    
    if (!user.canApproveMeetings) {
      return res.status(200).send({ count: 0 });
    }

    const count = await ScheduledMeeting.countDocuments({
      status: 'pending_approval',
      approver: req.user.id
    });

    res.status(200).send({ count });
  } catch (err) {
    console.error(err);
    res.status(500).send({ message: 'Server error' });
  }
});

// Get rejected and cancelled meetings
router.get('/rejected-cancelled', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).populate('department');

    const meetings = await ScheduledMeeting.find({
      $or: [
        { createdBy: req.user.id },
        { 'attendees.user': req.user.id },
        { departments: user.department._id }
      ],
      status: { $in: ['rejected', 'cancelled'] }
    })
      .populate('createdBy', 'firstName lastName email facultyId')
      .populate('venue', 'name code')
      .populate('attendees.user', 'firstName lastName email facultyId')
      .populate('departments', 'name code')
      .populate('approver', 'firstName lastName email')
      .populate('cancelledBy', 'firstName lastName email')
      .sort({ updatedAt: -1 });

    res.status(200).send(meetings);
  } catch (err) {
    console.error(err);
    res.status(500).send({ message: 'Server error' });
  }
});

// Get all meetings for logged-in user with filters
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { status, role, filter } = req.query;
    const user = await User.findById(req.user.id).populate('department');

    let query = {};

    // Base query for user's meetings
    if (role === 'created') {
      query.createdBy = req.user.id;
    } else if (role === 'attending') {
      query['attendees.user'] = req.user.id;
    } else if (role === 'pending_approval' && user.canApproveMeetings) {
      query.status = 'pending_approval';
      query.approver = req.user.id;
    } else if (role === 'department') {
      query.departments = user.department._id;
    } else {
      query.$or = [
        { createdBy: req.user.id },
        { 'attendees.user': req.user.id },
        { departments: user.department._id }
      ];
    }

    // Status filter
    if (status) {
      query.status = status;
    } else {
      // Exclude rejected and cancelled from normal views
      query.status = { $nin: ['rejected', 'cancelled'] };
    }

    // Additional filters
    if (filter) {
      switch (filter) {
        case 'created':
          query.createdBy = req.user.id;
          break;
        case 'department':
          query.departments = user.department._id;
          break;
        case 'followup':
          query.isFollowup = true;
          break;
        case 'high_priority':
          query.priority = { $in: ['high', 'urgent'] };
          break;
        case 'this_week':
          const today = new Date();
          const weekFromNow = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
          query.meeting_datetime = {
            $gte: today,
            $lte: weekFromNow
          };
          break;
      }
    }

    const meetings = await ScheduledMeeting.find(query)
      .populate('createdBy', 'firstName lastName email facultyId role')
      .populate('venue', 'name code capacity')
      .populate('attendees.user', 'firstName lastName email facultyId department role')
      .populate('departments', 'name code')
      .populate('approver', 'firstName lastName email role')
      .populate('parentMeeting', 'meeting_name meetingid')
      .populate('currentScribe', 'firstName lastName email')
      .sort({ meeting_datetime: 1 });

    res.status(200).send(meetings);
  } catch (err) {
    console.error(err);
    res.status(500).send({ message: 'Server error' });
  }
});

// Get single meeting
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const meeting = await ScheduledMeeting.findById(req.params.id)
      .populate('createdBy', 'firstName lastName email facultyId role department')
      .populate('venue', 'name code capacity facilities floor building')
      .populate('attendees.user', 'firstName lastName email facultyId department role')
      .populate('departments', 'name code fullName')
      .populate('approver', 'firstName lastName email role')
      .populate('currentScribe', 'firstName lastName email facultyId')
      .populate('parentMeeting', 'meeting_name meetingid meeting_datetime')
      .populate('followupMeetings', 'meeting_name meetingid meeting_datetime status')
      .populate('actionItems.assignedTo', 'firstName lastName email')
      .populate('decisions.madeBy', 'firstName lastName email')
      .populate('completedBy', 'firstName lastName email')
      .populate('cancelledBy', 'firstName lastName email');

    if (!meeting) {
      return res.status(404).send({ message: 'Meeting not found' });
    }

    res.status(200).send(meeting);
  } catch (err) {
    console.error(err);
    res.status(500).send({ message: 'Server error' });
  }
});

// Create scheduled meeting - WITH ATTENDEE CONFLICT CHECKING
router.post('/', authMiddleware, async (req, res) => {
  try {
    const {
      meeting_name,
      meeting_description,
      meeting_date,
      meeting_time,
      meeting_duration,
      venue,
      attendees,
      departments,
      agenda,
      meetingType,
      priority,
      isFollowup,
      parentMeetingId
    } = req.body;

    // Validation
    if (!meeting_name || !meeting_date || !meeting_time || !venue) {
      return res.status(400).send({ message: 'Required fields are missing' });
    }

    // Get user details
    const user = await User.findById(req.user.id).populate('department');
    
    // Combine date + time
    const meeting_datetime = new Date(`${meeting_date}T${meeting_time}:00`);

    // Validate future datetime
    if (meeting_datetime < new Date()) {
      return res.status(400).send({ message: 'Meeting date/time must be in the future' });
    }

    // Calculate duration and end time
    const duration = meeting_duration || 60;
    const meeting_end_datetime = new Date(meeting_datetime.getTime() + duration * 60000);

    // Check venue availability
    const venueConflicts = await ScheduledMeeting.find({
      venue: venue,
      status: { $in: ['pending_approval', 'approved'] },
      $or: [
        { meeting_datetime: { $gte: meeting_datetime, $lt: meeting_end_datetime } },
        { meeting_end_datetime: { $gt: meeting_datetime, $lte: meeting_end_datetime } },
        { 
          meeting_datetime: { $lte: meeting_datetime },
          meeting_end_datetime: { $gte: meeting_end_datetime }
        }
      ]
    });

    if (venueConflicts.length > 0) {
      return res.status(400).send({ 
        message: 'Venue is not available for the selected time slot',
        conflicts: venueConflicts
      });
    }

    // Collect all attendee IDs (individual + department members)
    let allAttendeeIds = new Set();

    if (attendees && attendees.length > 0) {
      attendees.forEach(id => allAttendeeIds.add(id.toString()));
    }

    if (departments && departments.length > 0) {
      for (const deptId of departments) {
        const deptUsers = await User.find({ 
          department: deptId,
          isActive: true 
        }).select('_id');
        
        deptUsers.forEach(u => allAttendeeIds.add(u._id.toString()));
      }
    }

    // CRITICAL CHECK: Check if creator has conflicting meetings
    const creatorConflicts = await checkUserAvailability(
      [req.user.id],
      meeting_datetime,
      meeting_end_datetime
    );

    if (creatorConflicts.length > 0) {
      return res.status(400).send({
        message: 'You cannot create this meeting because you have a conflicting meeting or Your attendees have conflicting meetings at this time!',
        conflictType: 'creator',
        conflicts: creatorConflicts[0].conflictingMeetings
      });
    }

    // CRITICAL CHECK: Check if any attendees have conflicting meetings
    const attendeeConflicts = await checkUserAvailability(
      Array.from(allAttendeeIds),
      meeting_datetime,
      meeting_end_datetime
    );

    if (attendeeConflicts.length > 0) {
      return res.status(400).send({
        message: 'Some attendees have conflicting meetings at this time',
        conflictType: 'attendees',
        conflicts: attendeeConflicts
      });
    }

    // All availability checks passed - proceed with creation

    const formattedAttendees = Array.from(allAttendeeIds).map(userId => ({
      user: userId,
      responseStatus: 'pending'
    }));

    // Determine approver
    const department = await Department.findById(user.department._id);
    let approver = null;
    let status = 'approved';

    if (user.role !== 'HOD' && user.role !== 'Admin') {
      if (!department.hod) {
        return res.status(400).send({ 
          message: 'No HOD assigned to your department. Please contact admin.' 
        });
      }
      approver = department.hod;
      status = 'pending_approval';
    }

    // Generate unique meeting ID
    const meetingid = await generateUniqueMeetingId();

    // Create meeting
    const meeting = new ScheduledMeeting({
      meeting_name,
      meeting_description,
      meeting_host_name: `${user.firstName} ${user.lastName}`,
      createdBy: req.user.id,
      meeting_datetime,
      meeting_duration: duration,
      meeting_end_datetime,
      venue,
      attendees: formattedAttendees,
      departments: departments || [],
      agenda: agenda || [],
      meetingid,
      status,
      approver,
      meetingType: meetingType || 'internal',
      priority: priority || 'medium',
      isFollowup: isFollowup || false,
      parentMeeting: parentMeetingId || null
    });

    await meeting.save();

    // If this is a followup, update parent meeting
    if (isFollowup && parentMeetingId) {
      await ScheduledMeeting.findByIdAndUpdate(parentMeetingId, {
        $push: { followupMeetings: meeting._id },
        meeting_followup: true
      });
    }

    await meeting.populate('createdBy', 'firstName lastName email');
    await meeting.populate('venue', 'name code');
    await meeting.populate('attendees.user', 'firstName lastName email');
    await meeting.populate('departments', 'name code');
    await meeting.populate('approver', 'firstName lastName email');

    res.status(201).send({
      message: status === 'pending_approval' 
        ? 'Meeting created and sent for approval' 
        : 'Meeting created successfully',
      meeting,
      requiresApproval: status === 'pending_approval',
      totalAttendees: formattedAttendees.length,
      isFollowup: isFollowup || false
    });
  } catch (err) {
    console.error('Create meeting error:', err);
    res.status(500).send({ message: 'Server error', error: err.message });
  }
});

// Complete a meeting
router.post('/:id/complete', authMiddleware, async (req, res) => {
  try {
    const { completionNotes, rating, feedback } = req.body;

    const meeting = await ScheduledMeeting.findById(req.params.id);

    if (!meeting) {
      return res.status(404).send({ message: 'Meeting not found' });
    }

    // Only creator or HOD can complete
    const user = await User.findById(req.user.id);
    const isCreator = meeting.createdBy.toString() === req.user.id;

    if (!isCreator && !user.canApproveMeetings) {
      return res.status(403).send({ message: 'Only the creator or HOD can complete meetings' });
    }

    if (meeting.status === 'cancelled') {
      return res.status(400).send({ message: 'Cannot complete a cancelled meeting' });
    }

    meeting.status = 'completed';
    meeting.meetingEnded = true;
    meeting.meetingEndedAt = new Date();
    meeting.completionNotes = completionNotes;
    meeting.completedBy = req.user.id;
    
    if (rating) meeting.rating = rating;
    if (feedback) meeting.feedback = feedback;

    await meeting.save();

    res.status(200).send({
      message: 'Meeting completed successfully',
      meeting
    });
  } catch (err) {
    console.error(err);
    res.status(500).send({ message: 'Server error' });
  }
});

// Update meeting - WITH CONFLICT CHECKING
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const meeting = await ScheduledMeeting.findById(req.params.id);

    if (!meeting) {
      return res.status(404).send({ message: 'Meeting not found' });
    }

    const isCreator = meeting.createdBy.toString() === req.user.id;
    const user = await User.findById(req.user.id);
    const canEdit = isCreator || user.canApproveMeetings;

    if (!canEdit) {
      return res.status(403).send({ message: 'Access denied' });
    }

    const {
      meeting_name,
      meeting_description,
      meeting_date,
      meeting_time,
      meeting_duration,
      venue,
      attendees,
      departments,
      agenda,
      priority,
      meetingType
    } = req.body;

    if (meeting_name) meeting.meeting_name = meeting_name;
    if (meeting_description) meeting.meeting_description = meeting_description;
    if (priority) meeting.priority = priority;
    if (meetingType) meeting.meetingType = meetingType;
    if (agenda) meeting.agenda = agenda;
    if (departments) meeting.departments = departments;

    let meeting_datetime = meeting.meeting_datetime;
    let meeting_end_datetime = meeting.meeting_end_datetime;

    if (meeting_date && meeting_time) {
      meeting_datetime = new Date(`${meeting_date}T${meeting_time}:00`);
      meeting.meeting_datetime = meeting_datetime;
    }

    if (meeting_duration) {
      meeting.meeting_duration = meeting_duration;
    }

    meeting_end_datetime = new Date(
      meeting_datetime.getTime() + meeting.meeting_duration * 60000
    );
    meeting.meeting_end_datetime = meeting_end_datetime;

    // Check venue conflicts if venue or time changed
    if (venue || meeting_date || meeting_time || meeting_duration) {
      const venueToCheck = venue || meeting.venue;
      
      const venueConflicts = await ScheduledMeeting.find({
        _id: { $ne: meeting._id },
        venue: venueToCheck,
        status: { $in: ['pending_approval', 'approved'] },
        $or: [
          { meeting_datetime: { $gte: meeting_datetime, $lt: meeting_end_datetime } },
          { meeting_end_datetime: { $gt: meeting_datetime, $lte: meeting_end_datetime } },
          { 
            meeting_datetime: { $lte: meeting_datetime },
            meeting_end_datetime: { $gte: meeting_end_datetime }
          }
        ]
      });

      if (venueConflicts.length > 0) {
        return res.status(400).send({ 
          message: 'Venue is not available for the selected time slot' 
        });
      }

      if (venue) {
        meeting.venue = venue;
      }
    }

    // Check attendee conflicts if attendees or time changed
    if (attendees || meeting_date || meeting_time || meeting_duration) {
      const attendeesToCheck = attendees || meeting.attendees.map(a => a.user.toString());
      
      const attendeeConflicts = await checkUserAvailability(
        attendeesToCheck,
        meeting_datetime,
        meeting_end_datetime,
        meeting._id
      );

      if (attendeeConflicts.length > 0) {
        return res.status(400).send({
          message: 'Some attendees have conflicting meetings at this time',
          conflicts: attendeeConflicts
        });
      }

      if (attendees) {
        meeting.attendees = attendees.map(userId => ({
          user: userId,
          responseStatus: 'pending'
        }));
      }
    }

    await meeting.save();

    await meeting.populate('createdBy', 'firstName lastName email');
    await meeting.populate('venue', 'name code');
    await meeting.populate('attendees.user', 'firstName lastName email');

    res.status(200).send({
      message: 'Meeting updated successfully',
      meeting
    });
  } catch (err) {
    console.error(err);
    res.status(500).send({ message: 'Server error' });
  }
});

// Approve meeting
router.post('/:id/approve', authMiddleware, async (req, res) => {
  try {
    const meeting = await ScheduledMeeting.findById(req.params.id);

    if (!meeting) {
      return res.status(404).send({ message: 'Meeting not found' });
    }

    const user = await User.findById(req.user.id);

    if (!user.canApproveMeetings) {
      return res.status(403).send({ message: 'You do not have permission to approve meetings' });
    }

    if (meeting.approver && meeting.approver.toString() !== req.user.id) {
      return res.status(403).send({ message: 'You are not the designated approver for this meeting' });
    }

    if (meeting.status !== 'pending_approval') {
      return res.status(400).send({ message: 'Meeting is not pending approval' });
    }

    const { comments } = req.body;

    meeting.status = 'approved';
    meeting.approvalDate = new Date();
    meeting.approvalComments = comments;

    await meeting.save();

    res.status(200).send({
      message: 'Meeting approved successfully',
      meeting
    });
  } catch (err) {
    console.error(err);
    res.status(500).send({ message: 'Server error' });
  }
});

// Reject meeting
router.post('/:id/reject', authMiddleware, async (req, res) => {
  try {
    const meeting = await ScheduledMeeting.findById(req.params.id);

    if (!meeting) {
      return res.status(404).send({ message: 'Meeting not found' });
    }

    const user = await User.findById(req.user.id);

    if (!user.canApproveMeetings) {
      return res.status(403).send({ message: 'You do not have permission to reject meetings' });
    }

    if (meeting.approver && meeting.approver.toString() !== req.user.id) {
      return res.status(403).send({ message: 'You are not the designated approver for this meeting' });
    }

    if (meeting.status !== 'pending_approval') {
      return res.status(400).send({ message: 'Meeting is not pending approval' });
    }

    const { reason } = req.body;

    if (!reason) {
      return res.status(400).send({ message: 'Rejection reason is required' });
    }

    meeting.status = 'rejected';
    meeting.approvalDate = new Date();
    meeting.rejectionReason = reason;

    await meeting.save();

    res.status(200).send({
      message: 'Meeting rejected',
      meeting
    });
  } catch (err) {
    console.error(err);
    res.status(500).send({ message: 'Server error' });
  }
});

// Cancel meeting - ONLY BY CREATOR AFTER APPROVAL
router.post('/:id/cancel', authMiddleware, async (req, res) => {
  try {
    const meeting = await ScheduledMeeting.findById(req.params.id);

    if (!meeting) {
      return res.status(404).send({ message: 'Meeting not found' });
    }

    const user = await User.findById(req.user.id);
    const isCreator = meeting.createdBy.toString() === req.user.id;

    // CRITICAL FIX: Only creator can cancel approved meetings
    // HODs can only approve/reject during pending_approval stage
    if (!isCreator) {
      return res.status(403).send({ 
        message: 'Only the meeting creator can cancel the meeting. HODs can only approve or reject meetings during the approval stage.' 
      });
    }

    // Cannot cancel if already completed
    if (meeting.status === 'completed') {
      return res.status(400).send({ message: 'Cannot cancel a completed meeting' });
    }

    // Cannot cancel if already cancelled
    if (meeting.status === 'cancelled') {
      return res.status(400).send({ message: 'Meeting is already cancelled' });
    }

    const { reason } = req.body;

    meeting.status = 'cancelled';
    meeting.cancellationReason = reason || 'Cancelled by creator';
    meeting.cancelledBy = req.user.id;
    meeting.cancelledAt = new Date();
    
    await meeting.save();

    res.status(200).send({
      message: 'Meeting cancelled successfully'
    });
  } catch (err) {
    console.error(err);
    res.status(500).send({ message: 'Server error' });
  }
});

// REST OF THE ROUTES (action items, decisions, etc.) remain the same...
// [Include all other routes from previous file]

module.exports = router;