const mongoose = require('mongoose');
const Joi = require('joi');

const userSchema = new mongoose.Schema(
    {
        firstName: { type: String, required: true, trim: true, minlength: 2 },
        lastName: { type: String, required: true, trim: true, minlength: 1 },
        email: { type: String, required: true, lowercase: true, unique: true, trim: true },
        passwordHash: { type: String, required: true}
    },
    {timestamps: true}
);

const User = mongoose.model('User', userSchema);

const registerSchema = Joi.object({
    firstName: Joi.string().min(2).max(100).required(),
    lastName: Joi.string().min(1).max(100).required(),
    email: Joi.string().email().required(),
    password: Joi.string().min(8).required()
});

const loginSchema = Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().min(8).required()
});

module.exports = {User, registerSchema, loginSchema}