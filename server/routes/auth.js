const router = require('express').Router();
const bcrypt = require('bcrypt');
const Joi = require('joi');
const { User } = require('../models/user');

// Login endpoint
router.post('/', async (req, res) => {
  try {
    // Validate input
    const { error } = validate(req.body);
    if (error) {
      return res.status(400).send({ message: error.details[0].message });
    }

    // Find user by email
    const user = await User.findOne({ email: req.body.email });
    if (!user) {
      return res.status(401).send({ message: 'Invalid Email or Password' });
    }

    // Verify password
    const validPassword = await bcrypt.compare(
      req.body.password,
      user.passwordHash
    );
    
    if (!validPassword) {
      return res.status(401).send({ message: 'Invalid Email or Password' });
    }

    // Generate token
    const token = user.generateAuthToken();

    // Send response
    res.status(200).send({
      data: token,
      message: 'Logged in successfully',
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).send({ message: 'Internal Server Error' });
  }
});

// Validation
const validate = (data) => {
  const schema = Joi.object({
    email: Joi.string().email().required().label('Email'),
    password: Joi.string().required().label('Password'),
  });
  return schema.validate(data);
};

module.exports = router;