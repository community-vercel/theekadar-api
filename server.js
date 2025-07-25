// E:\theekadar-api\server.js
const express = require('express');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
const fileUpload = require('express-fileupload');
const cors = require('cors');

dotenv.config();
connectDB();

const app = express();

app.use(cors());
app.use(express.json());
app.use(fileUpload());

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/workers', require('./routes/worker'));
app.use('/api/bookings', require('./routes/bookings'));
app.use('/api/services', require('./routes/services'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/reviews', require('./routes/reviews'));
app.use('/api/users', require('./routes/users'));

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));