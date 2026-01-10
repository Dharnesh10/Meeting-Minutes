const mongoose = require('mongoose');

const scheduledMeetingSchema = new mongoose.Schema(
  {
    meeting_name: {
      type: String,
      required: true,
      trim: true
    },
    meeting_host_by: {
      type: String,
      required: true
    },
    meeting_host_name: {
      type: String,
      required: true
    },

    // Combined date & time from form
    meeting_datetime: {
      type: Date,
      required: true
    },

    meeting_venue: {
      type: String,
      required: true
    },
    meeting_followup: {
      type: Boolean,
      default: false
    },
    meetingid: {
      type: Number,
      required: true,
      unique: true
    },

    // Optional: who created it
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  { timestamps: true }
);

const ScheduledMeeting = mongoose.model(
  'ScheduledMeeting',
  scheduledMeetingSchema
);

module.exports = { ScheduledMeeting };
