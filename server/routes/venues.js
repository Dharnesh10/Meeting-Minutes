const router = require('express').Router();
const authMiddleware = require('../middleware/auth');
const { Venue } = require('../models/venue');
const { ScheduledMeeting } = require('../models/scheduledMeeting');
const { User } = require('../models/user');

// Get all venues
router.get('/', authMiddleware, async (req, res) => {
  try {
    const venues = await Venue.find({ isActive: true }).sort({ name: 1 });
    res.status(200).send(venues);
  } catch (err) {
    console.error(err);
    res.status(500).send({ message: 'Server error' });
  }
});

// Check venue availability - FIXED TO EXCLUDE CURRENT MEETING WHEN EDITING
router.post('/check-availability', authMiddleware, async (req, res) => {
  try {
    const { venueId, startTime, duration, excludeMeetingId } = req.body; // ADDED: excludeMeetingId

    if (!venueId || !startTime || !duration) {
      return res.status(400).send({ message: 'Venue, start time, and duration are required' });
    }

    const startDate = new Date(startTime);
    const endDate = new Date(startDate.getTime() + duration * 60000);

    // Build query to find conflicting meetings
    const query = {
      venue: venueId,
      status: { $in: ['pending_approval', 'approved'] },
      $or: [
        {
          // Meeting starts during this time slot
          meeting_datetime: { $gte: startDate, $lt: endDate }
        },
        {
          // Meeting ends during this time slot
          meeting_end_datetime: { $gt: startDate, $lte: endDate }
        },
        {
          // Meeting spans this entire time slot
          meeting_datetime: { $lte: startDate },
          meeting_end_datetime: { $gte: endDate }
        }
      ]
    };

    // CRITICAL FIX: Exclude the current meeting when editing
    if (excludeMeetingId) {
      query._id = { $ne: excludeMeetingId };
    }

    // Find conflicting meetings
    const conflicts = await ScheduledMeeting.find(query)
      .populate('createdBy', 'firstName lastName');

    if (conflicts.length > 0) {
      return res.status(200).send({
        available: false,
        conflicts: conflicts.map(m => ({
          meeting_name: m.meeting_name,
          meeting_datetime: m.meeting_datetime,
          meeting_end_datetime: m.meeting_end_datetime,
          host: `${m.createdBy.firstName} ${m.createdBy.lastName}`
        }))
      });
    }

    res.status(200).send({ available: true });
  } catch (err) {
    console.error(err);
    res.status(500).send({ message: 'Server error' });
  }
});

// Get available venues for a time slot
router.post('/available', authMiddleware, async (req, res) => {
  try {
    const { startTime, duration } = req.body;

    if (!startTime || !duration) {
      return res.status(400).send({ message: 'Start time and duration are required' });
    }

    const startDate = new Date(startTime);
    const endDate = new Date(startDate.getTime() + duration * 60000);

    // Get all active venues
    const allVenues = await Venue.find({ isActive: true });

    // Find venues with conflicting meetings
    const bookedVenues = await ScheduledMeeting.distinct('venue', {
      status: { $in: ['pending_approval', 'approved'] },
      $or: [
        {
          meeting_datetime: { $gte: startDate, $lt: endDate }
        },
        {
          meeting_end_datetime: { $gt: startDate, $lte: endDate }
        },
        {
          meeting_datetime: { $lte: startDate },
          meeting_end_datetime: { $gte: endDate }
        }
      ]
    });

    const bookedVenueIds = bookedVenues.map(v => v.toString());

    const availableVenues = allVenues.map(venue => ({
      ...venue.toObject(),
      isAvailable: !bookedVenueIds.includes(venue._id.toString())
    }));

    res.status(200).send(availableVenues);
  } catch (err) {
    console.error(err);
    res.status(500).send({ message: 'Server error' });
  }
});

// Create venue (Admin only)
router.post('/', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (user.role !== 'Admin') {
      return res.status(403).send({ message: 'Access denied. Admin only.' });
    }

    const { name, code, capacity, facilities, floor, building } = req.body;

    const venue = new Venue({
      name,
      code,
      capacity,
      facilities,
      floor,
      building
    });

    await venue.save();

    res.status(201).send({
      message: 'Venue created successfully',
      venue
    });
  } catch (err) {
    console.error(err);
    if (err.code === 11000) {
      return res.status(400).send({ message: 'Venue already exists' });
    }
    res.status(500).send({ message: 'Server error' });
  }
});

// Update venue
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (user.role !== 'Admin') {
      return res.status(403).send({ message: 'Access denied. Admin only.' });
    }

    const { name, code, capacity, facilities, floor, building, isActive } = req.body;

    const venue = await Venue.findByIdAndUpdate(
      req.params.id,
      { name, code, capacity, facilities, floor, building, isActive },
      { new: true }
    );

    if (!venue) {
      return res.status(404).send({ message: 'Venue not found' });
    }

    res.status(200).send({
      message: 'Venue updated successfully',
      venue
    });
  } catch (err) {
    console.error(err);
    res.status(500).send({ message: 'Server error' });
  }
});

module.exports = router;