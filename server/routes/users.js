const router = require('express').Router();
const bcrypt = require('bcryptjs');
const {User, registerSchema} = require('../models/user');

router.post('/', async (req, res) => {
    const {error, value} = registerSchema.validate(req.body);
    if (error) return res.status(400).send(error.details[0].message);

    // Check if user already exists
    let user = await User.findOne({ email: value.email.toLowerCase() });
    if (user) return res.status(400).send('User already registered.');

    //hash the password
    const saltRounds = Number(process.env.SALT_ROUNDS) || 10;
    const passwordHash = await bcrypt.hash(value.password, saltRounds);

    // Create new user
    user = await User.create({
        firstName: value.firstName,
        lastName: value.lastName,
        email: value.email.toLowerCase(),
        passwordHash: passwordHash
    });

    //return basic info
    res.status(201).send({
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email
    })
});

module.exports = router;