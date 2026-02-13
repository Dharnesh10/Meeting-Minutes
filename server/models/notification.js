// backend/models/Notification.js - UPDATED with better ID extraction
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
      'meeting_updated'
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
    action: String
  }
}, {
  timestamps: true
});

// Index for efficient queries
notificationSchema.index({ recipient: 1, read: 1, createdAt: -1 });
notificationSchema.index({ recipient: 1, deleted: 1, createdAt: -1 });

// Helper method to create notification
notificationSchema.statics.createNotification = async function(data) {
  try {
    const notification = await this.create(data);
    return notification;
  } catch (error) {
    console.error('Create notification error:', error);
    throw error;
  }
};

// ⭐ UPDATED: Better ID extraction from user object
notificationSchema.statics.notifyAttendees = async function(meeting, type, triggeredBy, excludeUser = null) {
  try {
    // ⭐ Extract user ID properly from JWT decoded object or Mongoose document
    const triggeredById = extractUserId(triggeredBy);
    const excludeUserId = excludeUser ? extractUserId(excludeUser) : null;

    const attendeeIds = meeting.attendees
      .map(a => extractUserId(a.user))
      .filter(id => !excludeUserId || id.toString() !== excludeUserId.toString());

    const notifications = attendeeIds.map(recipientId => ({
      recipient: recipientId,
      type,
      relatedMeeting: meeting._id,
      triggeredBy: triggeredById, // ⭐ Now properly extracted
      ...getNotificationContent(type, meeting, triggeredBy)
    }));

    return await this.insertMany(notifications);
  } catch (error) {
    console.error('Notify attendees error:', error);
    throw error;
  }
};

// ⭐ NEW: Helper function to extract user ID from various formats
function extractUserId(user) {
  if (!user) return null;
  
  // If it's already a string or ObjectId, return as is
  if (typeof user === 'string') return user;
  if (user instanceof mongoose.Types.ObjectId) return user;
  
  // If it's a Mongoose document, get the _id
  if (user._id) return user._id;
  
  // If it's a JWT decoded object, get the id field
  if (user.id) return user.id;
  
  // Fallback
  return user.toString();
}

function getNotificationContent(type, meeting, triggeredBy) {
  // ⭐ Safe name extraction
  let schedulerName = 'Someone';
  if (triggeredBy) {
    if (triggeredBy.firstName && triggeredBy.lastName) {
      schedulerName = `${triggeredBy.firstName} ${triggeredBy.lastName}`;
    } else if (triggeredBy.name) {
      schedulerName = triggeredBy.name;
    }
  }
  
  const meetingName = meeting.meeting_name;
  
  switch (type) {
    case 'meeting_scheduled':
      return {
        title: 'New Meeting Scheduled',
        message: `${schedulerName} scheduled "${meetingName}"`,
        metadata: {
          meetingTime: meeting.meeting_datetime,
          meetingName: meetingName,
          action: 'scheduled'
        }
      };
    
    case 'meeting_cancelled':
      return {
        title: 'Meeting Cancelled',
        message: `${schedulerName} cancelled "${meetingName}"`,
        metadata: {
          meetingTime: meeting.meeting_datetime,
          meetingName: meetingName,
          action: 'cancelled'
        }
      };
    
    case 'meeting_reminder':
      return {
        title: 'Meeting Reminder',
        message: `"${meetingName}" starts in 3 hours`,
        metadata: {
          meetingTime: meeting.meeting_datetime,
          meetingName: meetingName,
          action: 'reminder'
        }
      };
    
    case 'meeting_approved':
      return {
        title: 'Meeting Approved',
        message: `Your meeting "${meetingName}" has been approved`,
        metadata: {
          meetingTime: meeting.meeting_datetime,
          meetingName: meetingName,
          action: 'approved'
        }
      };
    
    case 'meeting_rejected':
      return {
        title: 'Meeting Rejected',
        message: `Your meeting "${meetingName}" has been rejected`,
        metadata: {
          meetingTime: meeting.meeting_datetime,
          meetingName: meetingName,
          action: 'rejected'
        }
      };
    
    case 'meeting_updated':
      return {
        title: 'Meeting Updated',
        message: `${schedulerName} updated "${meetingName}"`,
        metadata: {
          meetingTime: meeting.meeting_datetime,
          meetingName: meetingName,
          action: 'updated'
        }
      };
    
    default:
      return {
        title: 'Meeting Notification',
        message: `Update for "${meetingName}"`,
        metadata: {
          meetingTime: meeting.meeting_datetime,
          meetingName: meetingName,
          action: 'unknown'
        }
      };
  }
}

module.exports = mongoose.model('Notification', notificationSchema);