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

const { autoCancelExpiredMeetings } = require('./services/autoCancelService');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Database connection
// mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/meeting-system', {
//   useNewUrlParser: true,
//   useUnifiedTopology: true,
// })
// .then(() => console.log('✅ MongoDB connected successfully'))
// .catch(err => console.error('❌ MongoDB connection error:', err));
mongoose.connect(
  process.env.MONGODB_URI || 'mongodb://localhost:27017/meeting-system'
)
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

// Get current user info
app.get('/api/me', require('./middleware/auth'), async (req, res) => {
  try {
    const { User } = require('./models/user');
    const user = await User.findById(req.user.id)
      .select('-password')
      .populate('department', 'name code');
    
    if (!user) {
      return res.status(404).send({ message: 'User not found' });
    }
    
    res.status(200).send(user);
  } catch (err) {
    console.error(err);
    res.status(500).send({ message: 'Server error' });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.status(200).send({ status: 'OK', message: 'Server is running' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).send({ message: 'Route not found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send({ message: 'Something went wrong!' });
});

// ===== AUTO-CANCEL EXPIRED MEETINGS CRON JOB =====
// Run every 30 minutes to check for expired meetings
const AUTO_CANCEL_INTERVAL = 30 * 60 * 1000; // 30 minutes in milliseconds

setInterval(async () => {
  console.log('\n[CRON] Running auto-cancel job...');
  const result = await autoCancelExpiredMeetings();
  
  if (result.cancelled > 0) {
    console.log(`[CRON] Auto-cancelled ${result.cancelled} meeting(s)`);
    result.meetings.forEach(m => {
      console.log(`  - ${m.name} (ID: ${m.meetingId}) - Host: ${m.host}`);
    });
  } else {
    console.log('[CRON] No meetings to auto-cancel');
  }
}, AUTO_CANCEL_INTERVAL);

// Run once on startup
setTimeout(async () => {
  console.log('\n[STARTUP] Running initial auto-cancel check...');
  const result = await autoCancelExpiredMeetings();
  if (result.cancelled > 0) {
    console.log(`[STARTUP] Auto-cancelled ${result.cancelled} meeting(s) on startup`);
  }
}, 5000); // Wait 5 seconds after startup

// Background job for cleaning up stale attendance sessions
setInterval(async () => {
  try {
    const { UserActivity } = require('./models/userActivity');
    const staleThreshold = new Date(Date.now() - 30000); // 30 seconds ago

    await UserActivity.updateMany(
      {
        isCurrentlyActive: true,
        lastHeartbeat: { $lt: staleThreshold }
      },
      {
        $set: { isCurrentlyActive: false }
      }
    );
  } catch (err) {
    console.error('Cleanup error:', err);
  }
}, 30000); // Run every 30 seconds

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`\n🚀 Server running on port ${PORT}`);
  console.log(`📅 Auto-cancel job scheduled every ${AUTO_CANCEL_INTERVAL / 60000} minutes`);
  console.log(`🔄 Stale session cleanup running every 30 seconds\n`);
});

module.exports = app;