const jwt = require('jsonwebtoken');
const User = require('../models/User');

const refreshToken = async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) return res.status(400).json({ message: 'Refresh token required' });

  try {
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    const user = await User.findById(decoded.id);
    if (!user) return res.status(401).json({ message: 'User not found' });

    const newToken = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '1h' });
    res.json({ token: newToken });
  } catch (error) {
    res.status(401).json({ message: 'Invalid refresh token' });
  }
};

module.exports = { refreshToken };