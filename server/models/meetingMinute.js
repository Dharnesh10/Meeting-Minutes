const mongoose = require('mongoose');

const meetingMinuteSchema = new mongoose.Schema(
  {
    meeting: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ScheduledMeeting',
      required: true
    },
    content: {
      type: String,
      required: true,
      trim: true
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    isScribe: {
      type: Boolean,
      default: false
      // true if created by approved scribe, false if by host
    },
    order: {
      type: Number,
      default: 0
      // For maintaining order of minutes
    },
    isDeleted: {
      type: Boolean,
      default: false
    },
    deletedAt: {
      type: Date
    },
    deletedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  { timestamps: true }
);

// Index for efficient queries
meetingMinuteSchema.index({ meeting: 1, createdAt: 1 });
meetingMinuteSchema.index({ meeting: 1, isDeleted: 1 });

const MeetingMinute = mongoose.model('MeetingMinute', meetingMinuteSchema);

module.exports = { MeetingMinute };