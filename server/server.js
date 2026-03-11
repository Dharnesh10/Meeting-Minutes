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
const taskRoutes = require('./routes/tasks');

// ✅ UPDATED: Import unified auto-complete service
const { startAutoCompleteMeetingService } = require('./services/autoCompleteMeeting');

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
app.use('/api/tasks', taskRoutes);

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

// ✅ START UNIFIED AUTO-COMPLETE SERVICE
// This handles:
// - Auto-complete meetings at END time (not start time)
// - Auto-cancel unstarted meetings
// - Auto-reject overtime pending approvals
// - Send 5-minute end warnings
// - Send 3-hour meeting reminders
startAutoCompleteMeetingService();

// ===== ATTENDANCE HEARTBEAT CLEANUP =====
setInterval(async () => {
  try {
    const { UserActivity } = require('./models/userActivity');
    const staleThreshold = new Date(Date.now() - 30000);
    await UserActivity.updateMany(
      { isCurrentlyActive: true, lastHeartbeat: { $lt: staleThreshold } },
      { $set: { isCurrentlyActive: false } }
    );
  } catch (err) { 
    console.error('Stale cleanup error:', err); 
  }
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