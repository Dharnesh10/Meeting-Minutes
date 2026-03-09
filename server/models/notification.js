// backend/models/Notification.js
const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  type: {
    type: String,
    enum: [
      'meeting_scheduled',
      'meeting_cancelled',
      'meeting_reminder',
      'meeting_approved',
      'meeting_rejected',
      'meeting_updated',
      'task_assigned',   
      'task_submitted',  
      'task_approved',
      'task_rejected',    
      'task_reminder' 
    ],
    required: true
  },
  title: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  relatedMeeting: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ScheduledMeeting'
  },
  // ⭐ Added for Task System
  relatedTask: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Task'
  },
  triggeredBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  read: {
    type: Boolean,
    default: false,
    index: true
  },
  deleted: {
    type: Boolean,
    default: false
  },
  metadata: {
    meetingTime: Date,
    meetingName: String,
    taskTitle: String, // ⭐ Added for Task metadata
    action: String
  }
}, {
  timestamps: true
});

notificationSchema.index({ recipient: 1, read: 1, createdAt: -1 });
notificationSchema.index({ recipient: 1, deleted: 1, createdAt: -1 });

// ⭐ UPDATED: Extracts IDs automatically before creation
notificationSchema.statics.createNotification = async function(data) {
  try {
    // Ensure IDs are strings/ObjectIds, not full objects
    if (data.recipient) data.recipient = extractUserId(data.recipient);
    if (data.triggeredBy) data.triggeredBy = extractUserId(data.triggeredBy);
    
    const notification = await this.create(data);
    return notification;
  } catch (error) {
    console.error('Create notification error:', error);
    throw error;
  }
};

notificationSchema.statics.notifyAttendees = async function(meeting, type, triggeredBy, excludeUser = null) {
  try {
    const triggeredById = extractUserId(triggeredBy);
    const excludeUserId = excludeUser ? extractUserId(excludeUser) : null;

    const attendeeIds = meeting.attendees
      .map(a => extractUserId(a.user))
      .filter(id => !excludeUserId || id.toString() !== excludeUserId.toString());

    const notifications = attendeeIds.map(recipientId => ({
      recipient: recipientId,
      type,
      relatedMeeting: meeting._id,
      triggeredBy: triggeredById,
      ...getNotificationContent(type, { meeting }, triggeredBy)
    }));

    return await this.insertMany(notifications);
  } catch (error) {
    console.error('Notify attendees error:', error);
    throw error;
  }
};

// Helper function to extract user ID from various formats
function extractUserId(user) {
  if (!user) return null;
  if (typeof user === 'string') return user;
  if (user instanceof mongoose.Types.ObjectId) return user;
  if (user._id) return user._id;
  if (user.id) return user.id;
  return user.toString();
}

function getNotificationContent(type, data, triggeredBy) {
  let schedulerName = 'Someone';
  if (triggeredBy) {
    if (triggeredBy.firstName && triggeredBy.lastName) {
      schedulerName = `${triggeredBy.firstName} ${triggeredBy.lastName}`;
    } else if (triggeredBy.name) {
      schedulerName = triggeredBy.name;
    }
  }
  
  // Handle both Meeting and Task data contexts
  const meetingName = data.meeting?.meeting_name || data.task?.meetingName || 'Meeting';
  const taskTitle = data.task?.title || 'a task';

  switch (type) {
    case 'meeting_scheduled':
      return {
        title: 'New Meeting Scheduled',
        message: `${schedulerName} scheduled "${meetingName}"`,
        metadata: { meetingTime: data.meeting?.meeting_datetime, meetingName, action: 'scheduled' }
      };
    case 'meeting_cancelled':
      return {
        title: 'Meeting Cancelled',
        message: `${schedulerName} cancelled "${meetingName}"`,
        metadata: { meetingName, action: 'cancelled' }
      };
    
    // ⭐ NEW: Task Specific Notifications
    case 'task_assigned':
      return {
        title: 'New Task Assigned',
        message: `${schedulerName} assigned you: "${taskTitle}"`,
        metadata: { taskTitle, meetingName, action: 'assigned' }
      };
    case 'task_submitted':
      return {
        title: 'Task Submitted for Review',
        message: `${schedulerName} submitted proof for "${taskTitle}"`,
        metadata: { taskTitle, meetingName, action: 'submitted' }
      };
    case 'task_approved':
      return {
        title: 'Task Approved',
        message: `Your task "${taskTitle}" has been approved`,
        metadata: { taskTitle, meetingName, action: 'approved' }
      };
    case 'task_rejected':
      return {
        title: 'Task Rejected',
        message: `Your task "${taskTitle}" was rejected. Please check notes.`,
        metadata: { taskTitle, meetingName, action: 'rejected' }
      };
    case 'task_reminder':
      return {
        title: 'Task Reminder',
        message: `Reminder: Please complete task "${taskTitle}"`,
        metadata: { taskTitle, meetingName, action: 'reminder' }
      };

    default:
      return {
        title: 'Update',
        message: `Notification from ${schedulerName}`,
        metadata: { action: 'general' }
      };
  }
}

module.exports = mongoose.model('Notification', notificationSchema);