const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const Joi = require('joi');
const passwordComplexity = require('joi-password-complexity');

const userSchema = new mongoose.Schema(
  {
    firstName: {
      type: String,
      required: true,
      trim: true
    },
    lastName: {
      type: String,
      required: true,
      trim: true
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true
    },
    passwordHash: {
      type: String,
      required: true
    },
    
    // Faculty-specific fields
    facultyId: {
      type: String,
      required: true,
      unique: true,
      uppercase: true
      // Example: IT001, CS045, MA012
    },
    department: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Department',
      required: true
    },
    role: {
      type: String,
      enum: [
        'HOD',
        'Professor',
        'Associate Professor',
        'Assistant Professor Level 1',
        'Assistant Professor Level 2',
        'Assistant Professor Level 3',
        'Lecturer',
        'Admin'
      ],
      required: true
    },
    
    // Contact details
    phone: {
      type: String,
      trim: true
    },
    
    // Status
    isActive: {
      type: Boolean,
      default: true
    },
    
    // Permissions
    canApproveMeetings: {
      type: Boolean,
      default: false
      // Auto-set to true if role is HOD or Admin
    }
  },
  { timestamps: true }
);

// Generate auth token
userSchema.methods.generateAuthToken = function () {
  const token = jwt.sign(
    { 
      id: this._id,
      email: this.email,
      role: this.role,
      department: this.department,
      facultyId: this.facultyId,
      canApproveMeetings: this.canApproveMeetings
    },
    process.env.JWTPRIVATEKEY,
    { expiresIn: '7d' }
  );
  return token;
};

// Middleware to set canApproveMeetings based on role
userSchema.pre('save', function(next) {
  if (this.role === 'HOD' || this.role === 'Admin') {
    this.canApproveMeetings = true;
  }
  next();
});

const User = mongoose.model('User', userSchema);

// Validation function
const validate = (data) => {
  const schema = Joi.object({
    firstName: Joi.string().required().label('First Name'),
    lastName: Joi.string().required().label('Last Name'),
    email: Joi.string().email().required().label('Email'),
    password: passwordComplexity().required().label('Password'),
    facultyId: Joi.string().required().label('Faculty ID'),
    department: Joi.string().required().label('Department'),
    role: Joi.string().required().label('Role'),
    phone: Joi.string().allow('').label('Phone')
  });
  return schema.validate(data);
};

module.exports = { User, validate };