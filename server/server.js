const express = require('express');
const cors = require('cors');
const path = require("path");
const db = require('./db');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// Routes
const userRoutes = require('./routes/users');
const authRoutes = require('./routes/auth.js');
const scheduledMeetingRoutes = require('./routes/scheduledMeetings');

// Models
const { User } = require('./models/user');

// Connect to database
db();

// Route middlewares
app.use('/api/users', userRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/meetings', scheduledMeetingRoutes);

// Root
app.get('/', (_req, res) => res.status(200).send('API is running...'));

// Get current logged-in user info
const authMiddleware = require('./middleware/auth');
app.get('/api/me', authMiddleware, async (req, res) => {
  const me = await User.findById(req.user.id).select('-passwordHash');
  if (!me) return res.status(404).send('User not found.');
  res.status(200).send(me);
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server is running on port ${PORT}`));
