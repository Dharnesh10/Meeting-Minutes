// server/models/task.js
const mongoose = require('mongoose');

const taskProofSchema = new mongoose.Schema({
  submittedAt: { type: Date, default: Date.now },
  description: { type: String, required: true },
  attachments: [{ 
    filename: String,
    url: String,
    type: String // 'image', 'document', 'link'
  }],
  status: { 
    type: String, 
    enum: ['pending_review', 'approved', 'rejected'], 
    default: 'pending_review' 
  },
  reviewedAt: Date,
  reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  reviewNotes: String, // Approval notes or rejection reason
});

const taskSchema = new mongoose.Schema({
  // Meeting Context
  meeting: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'ScheduledMeeting', // UPDATED ref
    required: true,
    index: true 
  },
  meetingName: { type: String, required: true },
  meetingId: String, // The display meeting ID
  
  // Task Details
  title: { type: String, required: true },
  description: { type: String, required: true },
  
  // Assignment
  assignedTo: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true,
    index: true 
  },
  assignedBy: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  assignedAt: { type: Date, default: Date.now },
  
  // Dates
  dueDate: { type: Date, required: true },
  completedAt: Date,
  
  // Status
  status: { 
    type: String, 
    enum: ['not_started', 'in_progress', 'submitted', 'completed', 'rejected'], 
    default: 'not_started',
    index: true
  },
  
  // Priority
  priority: { 
    type: String, 
    enum: ['low', 'medium', 'high', 'urgent'], 
    default: 'medium' 
  },
  
  // Submission & Review
  submissions: [taskProofSchema],
  currentSubmission: { type: Number, default: 0 }, // Index of latest submission
  
  // Related
  relatedMinute: { type: mongoose.Schema.Types.ObjectId, ref: 'Minute' },
  followupMeeting: { type: mongoose.Schema.Types.ObjectId, ref: 'ScheduledMeeting' }, // UPDATED ref
  
  // Metadata
  isLocked: { type: Boolean, default: false }, // True after first assignment
  notes: String,
  tags: [String],
  
}, { timestamps: true });

// Indexes
taskSchema.index({ meeting: 1, status: 1 });
taskSchema.index({ assignedTo: 1, status: 1 });
taskSchema.index({ assignedBy: 1 });
taskSchema.index({ dueDate: 1 });
taskSchema.index({ createdAt: -1 });

// Virtual for latest submission
taskSchema.virtual('latestSubmission').get(function() {
  if (this.submissions && this.submissions.length > 0) {
    return this.submissions[this.currentSubmission] || this.submissions[this.submissions.length - 1];
  }
  return null;
});

// Method to get status badge info
taskSchema.methods.getStatusBadge = function() {
  const latestSubmission = this.latestSubmission;
  
  if (this.status === 'completed' || (latestSubmission && latestSubmission.status === 'approved')) {
    return { label: 'C', color: '#4caf50', text: 'Completed' };
  }
  
  if (this.status === 'rejected' || (latestSubmission && latestSubmission.status === 'rejected')) {
    return { label: 'NC', color: '#f44336', text: 'Not Completed' };
  }
  
  if (this.status === 'submitted' || (latestSubmission && latestSubmission.status === 'pending_review')) {
    return { label: 'P', color: '#ff9800', text: 'Pending Review' };
  }
  
  if (this.status === 'in_progress') {
    return { label: 'IP', color: '#2196f3', text: 'In Progress' };
  }
  
  return { label: 'NS', color: '#9e9e9e', text: 'Not Started' };
};

// Method to check if overdue
taskSchema.methods.isOverdue = function() {
  if (this.status === 'completed') return false;
  return new Date() > this.dueDate;
};

// Static method to validate due date against follow-up meeting
taskSchema.statics.validateDueDate = async function(dueDate, meetingId) {
  // FIXED: Access the model via Mongoose registry using the correct name
  const ScheduledMeeting = mongoose.model('ScheduledMeeting');
  
  // Find follow-up meeting for this meeting
  // FIXED: Changed "Meeting.findOne" to "ScheduledMeeting.findOne"
  const followupMeeting = await ScheduledMeeting.findOne({
    parentMeeting: meetingId,
    status: { $in: ['pending_approval', 'approved'] }
  }).sort({ meeting_datetime: 1 });
  
  if (followupMeeting) {
    const followupDate = new Date(followupMeeting.meeting_datetime);
    const taskDueDate = new Date(dueDate);
    
    if (taskDueDate > followupDate) {
      return {
        valid: false,
        message: `Due date cannot exceed follow-up meeting date (${followupDate.toLocaleDateString()})`,
        maxDate: followupDate
      };
    }
  }
  
  return { valid: true };
};

// Ensure virtuals are included in JSON
taskSchema.set('toJSON', { virtuals: true });
taskSchema.set('toObject', { virtuals: true });

const Task = mongoose.model('Task', taskSchema);

module.exports = { Task };