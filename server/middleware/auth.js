const jwt = require('jsonwebtoken');
module.exports = (req, res, next) => {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) return res.status(401).send('Access denied.');

    jwt.verify(token, process.env.JWT_SECRET || "dev_secret_change_me", (err, decoded) => {
        if (err) return res.status(401).send('Invalid token.');

        req.user = decoded;
        next();
    });
};
