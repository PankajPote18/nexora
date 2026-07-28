const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { User } = require('../models');

// Helper to generate JWT
const generateToken = (user) => {
    return jwt.sign(
        { id: user.id, role: user.role, email: user.email },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '30d' }
    );
};

exports.register = async (req, res) => {
    try {
        const { name, email, password } = req.body;

        // Check if user exists
        const existingUser = await User.findOne({ where: { email } });
        if (existingUser) {
            return res.status(400).json({ message: 'User already exists with this email' });
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Create user
        const newUser = await User.create({
            name,
            email,
            password: hashedPassword,
            role: 'user'
        });

        // Generate token
        const token = generateToken(newUser);

        res.status(201).json({
            message: 'User registered successfully',
            token,
            user: { id: newUser.id, name: newUser.name, email: newUser.email, role: newUser.role }
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error during registration' });
    }
};

exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Find user
        const user = await User.findOne({ where: { email } });
        if (!user) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        // Check password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        // Generate token
        const token = generateToken(user);

        res.json({
            message: 'Logged in successfully',
            token,
            user: { id: user.id, name: user.name, email: user.email, role: user.role }
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error during login' });
    }
};

exports.logout = async (req, res) => {
    // JWT is stateless, so "logout" is usually handled on the client by deleting the token.
    // To properly invalidate it server-side, you'd need a token blacklist (e.g. in Redis).
    res.json({ message: 'Logged out successfully. Please remove token on client.' });
};

// Implement OTP/Forgot Password according to your service needs (e.g., nodemailer)
exports.forgotPassword = async (req, res) => {
    res.status(501).json({ message: 'Forgot password not implemented yet' });
};
