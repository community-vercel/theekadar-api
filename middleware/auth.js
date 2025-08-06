// middleware/auth.js
const jwt = require('jsonwebtoken');
const User = require('../models/User');

function authMiddleware(req, res, next) {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ message: 'No token provided' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ message: 'Invalid token' });
  }
}
function verifyToken(req, res, next) {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  if (!token) {
    return res.status(401).json({ message: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('Decoded token:', decoded);
    User.findById(decoded._id)
      .select('name email role phone')
      .then(user => {
        if (!user) {
          return res.status(401).json({ message: 'User not found' });
        }
        req.user = user; // Set req.user to the full user object
        next();
      })
      .catch(err => {
        res.status(401).json({ message: 'Invalid token', error: err.message });
      });
  } catch (err) {
    res.status(401).json({ message: 'Invalid token', error: err.message });
  }
}


function roleMiddleware(roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Access denied' });
    }
    next();
  };
}

module.exports = { authMiddleware, roleMiddleware,verifyToken };