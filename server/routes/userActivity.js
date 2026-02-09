const router = require('express').Router();
const authMiddleware = require('../middleware/auth');
const { UserActivity } = require('../models/userActivity');
const { ScheduledMeeting } = require('../models/scheduledMeeting');
const { User } = require('../models/user');

// Get attendance for a meeting
router.get('/:meetingId', authMiddleware, async (req, res) => {
  try {
    const meeting = await ScheduledMeeting.findById(req.params.meetingId);
    
    if (!meeting) {
      return res.status(404).send({ message: 'Meeting not found' });
    }

    // Get all activity records for this meeting
    const activities = await UserActivity.find({ meeting: req.params.meetingId })
      .populate('user', 'firstName lastName email facultyId role')
      .sort({ totalDuration: -1 });

    // Update percentages
    for (const activity of activities) {
      await activity.calculateAttendancePercentage();
      await activity.save();
    }

    res.status(200).send({
      attendance: activities,
      meetingStarted: meeting.meetingStarted,
      meetingEnded: meeting.meetingEnded,
      meetingDuration: meeting.meetingStartedAt 
        ? Math.floor((new Date() - meeting.meetingStartedAt) / 1000)
        : 0
    });

  } catch (err) {
    console.error('Get attendance error:', err);
    res.status(500).send({ message: 'Server error' });
  }
});

// Send heartbeat (user is active)
router.post('/:meetingId/heartbeat', authMiddleware, async (req, res) => {
  try {
    const meeting = await ScheduledMeeting.findById(req.params.meetingId);
    
    if (!meeting) {
      return res.status(404).send({ message: 'Meeting not found' });
    }

    // Find or create activity record
    let activity = await UserActivity.findOne({
      meeting: req.params.meetingId,
      user: req.user.id
    });

    const now = new Date();

    if (!activity) {
      // First time joining
      activity = new UserActivity({
        meeting: req.params.meetingId,
        user: req.user.id,
        sessions: [{
          joinedAt: now
        }],
        isCurrentlyActive: true,
        lastActiveAt: now,
        lastHeartbeat: now
      });
    } else {
      // Check if user needs to start a new session
      const lastSession = activity.sessions[activity.sessions.length - 1];
      
      // If last heartbeat was more than 15 seconds ago, consider it a new session
      const timeSinceLastHeartbeat = activity.lastHeartbeat 
        ? (now - activity.lastHeartbeat) / 1000 
        : 999;

      if (timeSinceLastHeartbeat > 15) {
        // User was inactive, start new session
        if (lastSession && !lastSession.leftAt) {
          // Close previous session
          lastSession.leftAt = activity.lastHeartbeat || activity.lastActiveAt;
          lastSession.duration = Math.floor((lastSession.leftAt - lastSession.joinedAt) / 1000);
        }
        
        // Start new session
        activity.sessions.push({
          joinedAt: now
        });
      }

      activity.isCurrentlyActive = true;
      activity.lastActiveAt = now;
      activity.lastHeartbeat = now;
    }

    // Calculate current totals
    await activity.calculateAttendancePercentage();
    await activity.save();

    res.status(200).send({ 
      message: 'Heartbeat received',
      isActive: true
    });

  } catch (err) {
    console.error('Heartbeat error:', err);
    res.status(500).send({ message: 'Server error' });
  }
});

// User leaves meeting
router.post('/:meetingId/leave', authMiddleware, async (req, res) => {
  try {
    const activity = await UserActivity.findOne({
      meeting: req.params.meetingId,
      user: req.user.id
    });

    if (!activity) {
      return res.status(200).send({ message: 'No active session found' });
    }

    const now = new Date();
    const lastSession = activity.sessions[activity.sessions.length - 1];

    if (lastSession && !lastSession.leftAt) {
      lastSession.leftAt = now;
      lastSession.duration = Math.floor((lastSession.leftAt - lastSession.joinedAt) / 1000);
    }

    activity.isCurrentlyActive = false;
    activity.lastActiveAt = now;
    
    await activity.calculateAttendancePercentage();
    await activity.save();

    res.status(200).send({ message: 'Left meeting' });

  } catch (err) {
    console.error('Leave error:', err);
    res.status(500).send({ message: 'Server error' });
  }
});

// Get active users count
router.get('/:meetingId/active-count', authMiddleware, async (req, res) => {
  try {
    // Users are active if their last heartbeat was within the last 15 seconds
    const fifteenSecondsAgo = new Date(Date.now() - 15000);
    
    const activeCount = await UserActivity.countDocuments({
      meeting: req.params.meetingId,
      isCurrentlyActive: true,
      lastHeartbeat: { $gte: fifteenSecondsAgo }
    });

    const activeUsers = await UserActivity.find({
      meeting: req.params.meetingId,
      isCurrentlyActive: true,
      lastHeartbeat: { $gte: fifteenSecondsAgo }
    })
    .populate('user', 'firstName lastName facultyId')
    .select('user lastHeartbeat');

    res.status(200).send({
      count: activeCount,
      users: activeUsers
    });

  } catch (err) {
    console.error('Active count error:', err);
    res.status(500).send({ message: 'Server error' });
  }
});

// Cleanup stale sessions (run periodically)
router.post('/cleanup-stale', authMiddleware, async (req, res) => {
  try {
    const thirtySecondsAgo = new Date(Date.now() - 30000);
    
    const staleActivities = await UserActivity.find({
      isCurrentlyActive: true,
      lastHeartbeat: { $lt: thirtySecondsAgo }
    });

    for (const activity of staleActivities) {
      const lastSession = activity.sessions[activity.sessions.length - 1];
      
      if (lastSession && !lastSession.leftAt) {
        lastSession.leftAt = activity.lastHeartbeat;
        lastSession.duration = Math.floor((lastSession.leftAt - lastSession.joinedAt) / 1000);
      }

      activity.isCurrentlyActive = false;
      await activity.save();
    }

    res.status(200).send({ 
      message: 'Cleanup completed',
      cleaned: staleActivities.length
    });

  } catch (err) {
    console.error('Cleanup error:', err);
    res.status(500).send({ message: 'Server error' });
  }
});

module.exports = router;