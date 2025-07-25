const express = require('express');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
const fileUpload = require('express-fileupload');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');
const morgan = require('morgan');
const compression = require('compression');
const csurf = require('csurf');

connectDB();

const app = express();

// 1. Enable Helmet for secure HTTP headers
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

// 2. Enable CORS with strict configuration
app.use(
  cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    credentials: false,
  })
);

// 3. Trust proxies for serverless environments
app.set('trust proxy', 1);

// 4. Rate limiting to prevent brute-force and DDoS attacks
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    standardHeaders: true,
    legacyHeaders: false,
  })
);

// 5. Body parser with size limit
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// 6. File upload with restrictions
app.use(
  fileUpload({
    limits: { fileSize: 30 * 1024 * 1024 }, // Limit file size to 30MB
    abortOnLimit: true,
    safeFileNames: true,
    fileTypes: /\.(jpeg|jpg|png|webp|pdf|doc|docx|xls|xlsx|ppt|pptx|txt|csv|zip|rar|mp4|mp3|avi|mov|svg)$/i,
  })
);

// 7. Sanitize data to prevent NoSQL injection and XSS
app.use(mongoSanitize());
app.use(xss());

// 8. Prevent HTTP parameter pollution
app.use(hpp());

// 9. Enable compression for faster responses
app.use(compression());

// 10. CSRF protection for state-changing requests
app.use(csurf({ cookie: { secure: true, httpOnly: true, sameSite: 'Strict' } }));

// 11. Request logging for monitoring (in development only)
if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
}

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/workers', require('./routes/worker'));
app.use('/api/bookings', require('./routes/bookings'));
app.use('/api/services', require('./routes/services'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/reviews', require('./routes/reviews'));
app.use('/api/users', require('./routes/users'));

// 12. Handle CSRF errors
app.use((err, req, res, next) => {
  if (err.code === 'EBADCSRFTOKEN') {
    return res.status(403).json({ error: 'Invalid CSRF token' });
  }
  next(err);
});

// 13. Enhanced error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack); // Log errors securely
  const statusCode = err.statusCode || 500;
  const message = process.env.NODE_ENV === 'production' ? 'Something went wrong!' : err.message;
  res.status(statusCode).json({
    error: message,
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }),
  });
});

// 14. Handle 404 for unknown routes
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

// 15. Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  server.close(() => {
    console.log('Server closed.');
    process.exit(0);
  });
});