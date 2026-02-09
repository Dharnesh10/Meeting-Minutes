const mongoose = require('mongoose');

const userActivitySchema = new mongoose.Schema(
  {
    meeting: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ScheduledMeeting',
      required: true
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    // Session tracking
    sessions: [{
      joinedAt: {
        type: Date,
        required: true
      },
      leftAt: {
        type: Date
      },
      duration: {
        type: Number // in seconds
      }
    }],
    // Aggregated data
    totalDuration: {
      type: Number,
      default: 0 // Total time in seconds
    },
    attendancePercentage: {
      type: Number,
      default: 0 // Percentage of meeting attended
    },
    isCurrentlyActive: {
      type: Boolean,
      default: false
    },
    lastActiveAt: {
      type: Date
    },
    // Heartbeat for live tracking
    lastHeartbeat: {
      type: Date
    }
  },
  { timestamps: true }
);

// Indexes
userActivitySchema.index({ meeting: 1, user: 1 }, { unique: true });
userActivitySchema.index({ meeting: 1, isCurrentlyActive: 1 });
userActivitySchema.index({ lastHeartbeat: 1 });

// Method to calculate total duration
userActivitySchema.methods.calculateTotalDuration = function() {
  let total = 0;
  this.sessions.forEach(session => {
    if (session.duration) {
      total += session.duration;
    } else if (session.joinedAt && !session.leftAt) {
      // Currently active session
      const now = new Date();
      total += Math.floor((now - session.joinedAt) / 1000);
    }
  });
  this.totalDuration = total;
  return total;
};

// Method to calculate attendance percentage
userActivitySchema.methods.calculateAttendancePercentage = async function() {
  const ScheduledMeeting = mongoose.model('ScheduledMeeting');
  const meeting = await ScheduledMeeting.findById(this.meeting);
  
  if (!meeting || !meeting.meetingStartedAt) {
    this.attendancePercentage = 0;
    return 0;
  }

  let meetingDuration;
  if (meeting.meetingEnded && meeting.meetingEndedAt) {
    // Meeting ended - calculate actual duration
    meetingDuration = Math.floor((meeting.meetingEndedAt - meeting.meetingStartedAt) / 1000);
  } else {
    // Meeting ongoing - calculate current duration
    meetingDuration = Math.floor((new Date() - meeting.meetingStartedAt) / 1000);
  }

  if (meetingDuration <= 0) {
    this.attendancePercentage = 0;
    return 0;
  }

  this.calculateTotalDuration();
  const percentage = Math.min(100, Math.round((this.totalDuration / meetingDuration) * 100));
  this.attendancePercentage = percentage;
  return percentage;
};

const UserActivity = mongoose.model('UserActivity', userActivitySchema);

module.exports = { UserActivity };