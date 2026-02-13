// backend/routes/notifications.js - FIXED VERSION
const express = require('express');
const router = express.Router();
const Notification = require('../models/notification');

// ⭐ FIX: Import auth middleware properly
// Check your other route files to see how they import auth
// Common patterns:

// Option 1: If auth.js exports a single function
const auth = require('../middleware/auth');

// Option 2: If auth.js exports an object with auth property
// const { auth } = require('../middleware/auth');

// Option 3: If your file is named differently
// const auth = require('../middleware/authMiddleware');

// Get user's notifications
router.get('/', auth, async (req, res) => {
  try {
    const notifications = await Notification.find({ 
      recipient: req.user.id,  // Use req.user.id for JWT
      deleted: false 
    })
      .populate('relatedMeeting', 'meeting_name meeting_datetime meetingid')
      .populate('triggeredBy', 'firstName lastName facultyId')
      .sort({ createdAt: -1 })
      .limit(50);

    const unreadCount = await Notification.countDocuments({
      recipient: req.user.id,  // Use req.user.id for JWT
      read: false,
      deleted: false
    });

    res.json({
      notifications,
      unreadCount
    });
  } catch (error) {
    console.error('Fetch notifications error:', error);
    res.status(500).json({ message: 'Failed to fetch notifications' });
  }
});

// Mark notification as read
router.patch('/:id/read', auth, async (req, res) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, recipient: req.user.id },  // Use req.user.id
      { read: true },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    res.json(notification);
  } catch (error) {
    console.error('Mark read error:', error);
    res.status(500).json({ message: 'Failed to mark notification as read' });
  }
});

// Mark all notifications as read
router.patch('/read-all', auth, async (req, res) => {
  try {
    await Notification.updateMany(
      { recipient: req.user.id, read: false },  // Use req.user.id
      { read: true }
    );

    res.json({ message: 'All notifications marked as read' });
  } catch (error) {
    console.error('Mark all read error:', error);
    res.status(500).json({ message: 'Failed to mark all as read' });
  }
});

// Delete notification
router.delete('/:id', auth, async (req, res) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, recipient: req.user.id },  // Use req.user.id
      { deleted: true },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    res.json({ message: 'Notification deleted' });
  } catch (error) {
    console.error('Delete notification error:', error);
    res.status(500).json({ message: 'Failed to delete notification' });
  }
});

module.exports = router;