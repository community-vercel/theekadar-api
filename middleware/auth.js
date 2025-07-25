// E:\theekadar-api\middleware\auth.js
const jwt = require('jsonwebtoken');

const auth = (roles = []) => {
  return async (req, res, next) => {
    try {
      const token = req.header('Authorization')?.replace('Bearer ', '');
      if (!token) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = decoded; // { id, role }

      if (roles.length && !roles.includes(decoded.role)) {
        return res.status(403).json({ error: 'Access denied' });
      }

      next();
    } catch (error) {
      res.status(401).json({ error: 'Invalid token' });
    }
  };
};

module.exports = auth;