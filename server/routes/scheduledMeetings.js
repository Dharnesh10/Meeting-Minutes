const router = require('express').Router();
const authMiddleware = require('../middleware/auth');
const { ScheduledMeeting } = require('../models/scheduledMeeting');

// Get all scheduled meetings for logged-in user
router.get('/', authMiddleware, async (req, res) => {
  const meetings = await ScheduledMeeting
    .find({ createdBy: req.user.id })
    .sort({ meeting_datetime: 1 });

  res.status(200).send(meetings);
});

// Create scheduled meeting
router.post('/', authMiddleware, async (req, res) => {
  try {
    const {
      meeting_name,
      meeting_host_by,
      meeting_host_name,
      meeting_date, // yyyy-mm-dd
      meeting_time, // HH:mm
      meeting_venue
    } = req.body;

    if (!meeting_date || !meeting_time) {
      return res.status(400).send('Meeting date and time are required');
    }

    // Combine date + time from form
    const meeting_datetime = new Date(`${meeting_date}T${meeting_time}:00`);

    // Generate random 6-digit meeting ID
    const meetingid = Math.floor(100000 + Math.random() * 900000);

    const meeting = new ScheduledMeeting({
      meeting_name,
      meeting_host_by,
      meeting_host_name,
      meeting_datetime,
      meeting_venue,
      meetingid,
      createdBy: req.user.id
    });

    await meeting.save();

    res.status(201).send({
      message: 'Meeting scheduled successfully',
      meeting
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});

module.exports = router;
