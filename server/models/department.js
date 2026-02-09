const mongoose = require('mongoose');

const departmentSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true
      // Examples: IT, CS, CB, MA, PH
    },
    fullName: {
      type: String,
      required: true
      // Examples: Information Technology, Computer Science, etc.
    },
    hod: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    isActive: {
      type: Boolean,
      default: true
    }
  },
  { timestamps: true }
);

const Department = mongoose.model('Department', departmentSchema);

module.exports = { Department };