const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const departmentRoutes = require('./routes/departments');
const venueRoutes = require('./routes/venues');
const scheduledMeetingRoutes = require('./routes/scheduledMeetings');
const meetingMinutesRoutes = require('./routes/meetingMinutes');
const userActivityRoutes = require('./routes/userActivity');
const notificationRoutes = require('./routes/notifications');

const { autoCancelExpiredMeetings } = require('./services/autoCancelService');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Database connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/meeting-system')
  .then(() => console.log('✅ MongoDB connected successfully'))
  .catch(err => console.error('❌ MongoDB connection error:', err));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/departments', departmentRoutes);
app.use('/api/venues', venueRoutes);
app.use('/api/meetings', scheduledMeetingRoutes);
app.use('/api/minutes', meetingMinutesRoutes);
app.use('/api/attendance', userActivityRoutes);
app.use('/api/notifications', notificationRoutes);

// Get current user info
app.get('/api/me', require('./middleware/auth'), async (req, res) => {
  try {
    const { User } = require('./models/user');
    const user = await User.findById(req.user.id).select('-password').populate('department', 'name code');
    if (!user) return res.status(404).send({ message: 'User not found' });
    res.status(200).send(user);
  } catch (err) {
    res.status(500).send({ message: 'Server error' });
  }
});

// ===== THE FIX: AUTOMATIC LIFECYCLE CLEANUP WITH SPECIFIC MESSAGE =====

const cleanOverdueMeetings = async () => {
  try {
    const { ScheduledMeeting } = require('./models/scheduledMeeting');
    const now = new Date();

    // 1. CANCEL Pending meetings that have already started/passed
    // We set the specific message you requested here
    const cancelResult = await ScheduledMeeting.updateMany(
      {
        status: 'pending_approval',
        meeting_datetime: { $lt: now }
      },
      { 
        $set: { 
          status: 'cancelled',
          cancellationReason: 'Meeting not started by the user! Meeting cancelled due to overtime.' 
        } 
      }
    );

    // 2. COMPLETE Approved meetings that have finished their duration
    const completeResult = await ScheduledMeeting.updateMany(
      {
        status: 'approved',
        $expr: {
          $lt: [
            { $add: ["$meeting_datetime", { $multiply: ["$meeting_duration", 60000] }] }, 
            now
          ]
        }
      },
      { $set: { status: 'completed' } }
    );

    if (cancelResult.modifiedCount > 0 || completeResult.modifiedCount > 0) {
      console.log(`[CLEANUP] ${cancelResult.modifiedCount} Pending meetings cancelled. ${completeResult.modifiedCount} Approved meetings completed.`);
    }
  } catch (err) {
    console.error('[CLEANUP ERROR]:', err);
  }
};

// Check every 60 seconds to keep the HOD Badge accurate
setInterval(cleanOverdueMeetings, 60000);

// Run on startup
setTimeout(cleanOverdueMeetings, 3000);

// ===== ATTENDANCE HEARTBEAT CLEANUP =====
setInterval(async () => {
  try {
    const { UserActivity } = require('./models/userActivity');
    const staleThreshold = new Date(Date.now() - 30000);
    await UserActivity.updateMany(
      { isCurrentlyActive: true, lastHeartbeat: { $lt: staleThreshold } },
      { $set: { isCurrentlyActive: false } }
    );
  } catch (err) { console.error('Stale cleanup error:', err); }
}, 30000);

// Health check
app.get('/health', (req, res) => res.status(200).send({ status: 'OK' }));

// 404 & Error Handlers
app.use((req, res) => res.status(404).send({ message: 'Route not found' }));
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send({ message: 'Something went wrong!' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`⏱️  Auto-cleanup running every 60 seconds`);
});

module.exports = app;