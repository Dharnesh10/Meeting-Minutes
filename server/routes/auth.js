const router = require('express').Router();
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken');
const { User, loginSchema } = require('../models/user');

router.post('/', async (req, res) => {
    const { error, value } = loginSchema.validate(req.body);
    if (error) return res.status(400).send(error.details[0].message);

    // Check if user exists
    const user = await User.findOne({ email: value.email.toLowerCase() });
    if (!user) return res.status(400).send('Invalid email or password.');

    // Check password
    const isValidPassword = await bcrypt.compare(value.password, user.passwordHash);
    if (!isValidPassword) return res.status(400).send('Invalid email or password.');

    // Create JWT
    const token = jwt.sign(
        { id: user._id, email: user.email, name: user.firstName }, 
        process.env.JWT_SECRET || "dev_secret_change_me", 
        { expiresIn: process.env.JWT_EXPIRES_IN || '1h' }
    );

    res.status(200).send({ 
            message: 'Login successful', 
            token, id: user._id, 
            firstName: user.firstName, 
            lastName: user.lastName, 
            email: user.email 
    });
});

module.exports = router;