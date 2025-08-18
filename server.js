require('dotenv').config(); // 👈 must be first
const express = require('express');
const connectDB = require('./config/db');

const fileUpload = require('express-fileupload');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const hpp = require('hpp');
const morgan = require('morgan');
const compression = require('compression');
const csurf = require('csurf');
const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/adminusers');

const verificationRoutes = require('./routes/verificationRoutes');
const profileRoutes = require('./routes/profileRoutes');
const cityRoutes = require('./routes/city'); // Assuming you have a cityRoutes file
const postRoutes = require('./routes/postRoutes');
const reviewRoutes = require('./routes/reviews');
const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccount.json');

connectDB();

const app = express();

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});


app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
      },
    },
    xssFilter: true,
    noSniff: true,
    hidePoweredBy: true,
  })
);

app.use(
  cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    credentials: false,
  })
);

app.set('trust proxy', 1);

app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
  })
);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

app.use(
  fileUpload({
    limits: { fileSize: 30 * 1024 * 1024 },
    abortOnLimit: true,
    safeFileNames: true,
  })
);

app.use(hpp());
app.use(compression());


if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
}
app.use('/api/auth', authRoutes);
app.use('/api/verification', verificationRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/jobs', require('./routes/jobRoutes'));

app.use('/api/admin', adminRoutes);


app.use('/api/posts', postRoutes);
app.use('/api/cities', cityRoutes); // Assuming you have a cityRoutes file

// Handle 404 for unknown routes
app.use((req, res, next) => {
  res.status(404).json({
    error: `Route ${req.method} ${req.url} not found`,
  });
});

// Handle CSRF errors
app.use((err, req, res, next) => {
  if (err.code === 'EBADCSRFTOKEN') {
    return res.status(403).json({ error: 'Invalid CSRF token' });
  }
  next(err);
});

// Enhanced error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  const statusCode = err.statusCode || 500;
  const message = process.env.NODE_ENV === 'production' ? 'Something went wrong!' : err.message;
  res.status(statusCode).json({
    error: message,
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }),
  });
});

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  server.close(() => {
    console.log('Server closed.');
    process.exit(0);
  });
});