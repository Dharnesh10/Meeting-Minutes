const mongoose = require('mongoose');

const attendeeSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  responseStatus: {
    type: String,
    enum: ['pending', 'accepted', 'declined', 'tentative'],
    default: 'pending'
  },
  responseDate: {
    type: Date
  }
}, { _id: false });

const scheduledMeetingSchema = new mongoose.Schema(
  {
    meeting_name: {
      type: String,
      required: true,
      trim: true
    },
    meeting_description: {
      type: String,
      trim: true
    },
    
    // Host information
    meeting_host_name: {
      type: String,
      required: true
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    
    // Date and time
    meeting_datetime: {
      type: Date,
      required: true
    },
    meeting_duration: {
      type: Number,
      default: 60
    },
    meeting_end_datetime: {
      type: Date
    },
    
    // Venue
    venue: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Venue',
      required: true
    },
    
    // Attendees
    attendees: [attendeeSchema],
    
    // Department-wide meetings
    departments: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Department'
    }],
    
    // Meeting ID
    meetingid: {
      type: Number,
      required: true,
      unique: true
    },
    
    // Approval workflow
    status: {
      type: String,
      enum: ['draft', 'pending_approval', 'approved', 'rejected', 'cancelled', 'completed'],
      default: 'pending_approval'
    },
    approver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    approvalDate: {
      type: Date
    },
    approvalComments: {
      type: String
    },
    rejectionReason: {
      type: String
    },
    cancellationReason: {
      type: String
    },
    cancelledBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    cancelledAt: {
      type: Date
    },
    
    // Follow-up meetings
    isFollowup: {
      type: Boolean,
      default: false
    },
    parentMeeting: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ScheduledMeeting'
    },
    followupMeetings: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ScheduledMeeting'
    }],
    
    // Meeting minutes scribe
    currentScribe: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    scribeApprovedAt: {
      type: Date
    },
    
    // Meeting state - CRITICAL: These should default to FALSE
    meetingStarted: {
      type: Boolean,
      default: false  // IMPORTANT: Default is FALSE
    },
    meetingStartedAt: {
      type: Date
    },
    meetingEnded: {
      type: Boolean,
      default: false  // IMPORTANT: Default is FALSE
    },
    meetingEndedAt: {
      type: Date
    },
    
    // Completion details
    completionNotes: {
      type: String
    },
    completedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    autoCompleted: {
      type: Boolean,
      default: false
    },
    
    // Meeting follow-up
    meeting_followup: {
      type: Boolean,
      default: false
    },
    
    // Agenda
    agenda: [{
      title: String,
      description: String,
      duration: Number,
      completed: {
        type: Boolean,
        default: false
      }
    }],
    
    // Action items
    actionItems: [{
      description: String,
      assignedTo: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      dueDate: Date,
      status: {
        type: String,
        enum: ['pending', 'in_progress', 'completed'],
        default: 'pending'
      },
      createdAt: {
        type: Date,
        default: Date.now
      }
    }],
    
    // Decisions made
    decisions: [{
      description: String,
      madeAt: {
        type: Date,
        default: Date.now
      },
      madeBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      }
    }],
    
    // Reminders
    reminderSent: {
      type: Boolean,
      default: false
    },
    
    // Meeting type
    meetingType: {
      type: String,
      enum: ['internal', 'departmental', 'inter-departmental', 'external'],
      default: 'internal'
    },
    
    // Priority
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'urgent'],
      default: 'medium'
    },
    
    // Recurring meeting
    isRecurring: {
      type: Boolean,
      default: false
    },
    recurringPattern: {
      frequency: {
        type: String,
        enum: ['daily', 'weekly', 'monthly']
      },
      endDate: Date
    },
    
    // Meeting rating
    rating: {
      type: Number,
      min: 1,
      max: 5
    },
    feedback: {
      type: String
    }
  },
  { timestamps: true }
);

// Index for efficient queries
scheduledMeetingSchema.index({ meetingid: 1 }, { unique: true });
scheduledMeetingSchema.index({ meeting_datetime: 1 });
scheduledMeetingSchema.index({ status: 1 });
scheduledMeetingSchema.index({ createdBy: 1 });
scheduledMeetingSchema.index({ venue: 1, meeting_datetime: 1 });
scheduledMeetingSchema.index({ isFollowup: 1 });
scheduledMeetingSchema.index({ parentMeeting: 1 });

const ScheduledMeeting = mongoose.model('ScheduledMeeting', scheduledMeetingSchema);

module.exports = { ScheduledMeeting };