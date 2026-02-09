const mongoose = require('mongoose');

const venueSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      unique: true
      // Examples: Room A, Conference Hall, Auditorium
    },
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true
      // Examples: RMA, CONFH, AUD
    },
    capacity: {
      type: Number,
      required: true,
      min: 1
    },
    facilities: [{
      type: String
      // Examples: Projector, Whiteboard, AC, Video Conferencing
    }],
    floor: {
      type: String,
      trim: true
    },
    building: {
      type: String,
      trim: true
    },
    isActive: {
      type: Boolean,
      default: true
    }
  },
  { timestamps: true }
);

const Venue = mongoose.model('Venue', venueSchema);

module.exports = { Venue };