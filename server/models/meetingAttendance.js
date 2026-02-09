const mongoose = require('mongoose');

const attendanceSessionSchema = new mongoose.Schema({
  joinedAt: {
    type: Date,
    required: true
  },
  leftAt: {
    type: Date
  },
  duration: {
    type: Number, // in seconds
    default: 0
  }
}, { _id: false });

const meetingAttendanceSchema = new mongoose.Schema(
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
    isOnline: {
      type: Boolean,
      default: false
    },
    lastSeen: {
      type: Date,
      default: Date.now
    },
    sessions: [attendanceSessionSchema],
    totalDuration: {
      type: Number, // in seconds
      default: 0
    },
    attendancePercentage: {
      type: Number, // 0-100
      default: 0
    }
  },
  { timestamps: true }
);

// Index for efficient queries
meetingAttendanceSchema.index({ meeting: 1, user: 1 }, { unique: true });
meetingAttendanceSchema.index({ meeting: 1, isOnline: 1 });

const MeetingAttendance = mongoose.model('MeetingAttendance', meetingAttendanceSchema);

module.exports = { MeetingAttendance };