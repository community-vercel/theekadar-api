// E:\theekadar-api\middleware\validation.js
const Joi = require('joi');

const validate = (schema) => {
  return (req, res, next) => {
    const { error } = schema.validate(req.body, { abortEarly: false });
    if (error) {
      return res.status(400).json({
        error: error.details.map((err) => err.message).join(', '),
      });
    }
    next();
  };
};

// Existing Schemas (from previous response)
const userSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
  name: Joi.string().required(),
  phone: Joi.string().pattern(/^[0-9]{10,15}$/).required(),
  address: Joi.object({
    street: Joi.string().allow(''),
    city: Joi.string().allow(''),
    state: Joi.string().allow(''),
    zip: Joi.string().allow(''),
    country: Joi.string().allow(''),
  }).optional(),
  role: Joi.string().valid('client', 'worker', 'admin').default('client'),
});

const workerSchema = Joi.object({
  skills: Joi.array().items(Joi.string()).min(1).required(),
  experience: Joi.number().min(0).required(),
  hourlyRate: Joi.number().min(0).required(),
  location: Joi.string().required(),
  profileImage: Joi.object({
    data: Joi.string().required(),  // base64 string
    name: Joi.string().required(),  // filename
    type: Joi.string().valid('image/jpeg', 'image/png').required(),  // mime type
  })
});

const serviceSchema = Joi.object({
  category: Joi.string()
    .valid('plumber', 'driver', 'consultant', 'electrician', 'other')
    .required(),
  description: Joi.string().allow(''),
  hourlyRate: Joi.number().min(0).required(),
  availability: Joi.array().items(
    Joi.object({
      day: Joi.string().required(),
      startTime: Joi.string().required(),
      endTime: Joi.string().required(),
    })
  ),
  location: Joi.object({
    type: Joi.string().valid('Point').default('Point'),
    coordinates: Joi.array().items(Joi.number()).length(2).required(),
  }).required(),
});

const bookingSchema = Joi.object({
  serviceId: Joi.string().required(),
  scheduledTime: Joi.date().iso().required(),
  duration: Joi.number().min(1).required(),
});

// New Schemas
const reviewSchema = Joi.object({
  serviceId: Joi.string().required(),
  rating: Joi.number().min(1).max(5).required(),
  review: Joi.string().allow(''),
});

const notificationSchema = Joi.object({
  message: Joi.string().required(),
  type: Joi.string().valid('booking', 'status', 'general').required(),
});

const updateUserSchema = Joi.object({
  name: Joi.string().optional(),
  phone: Joi.string().pattern(/^[0-9]{10,15}$/).required(),
  address: Joi.object({
    street: Joi.string().allow(''),
    city: Joi.string().allow(''),
    state: Joi.string().allow(''),
    zip: Joi.string().allow(''),
    country: Joi.string().allow(''),
  }).optional(),
});

module.exports = {
  validate,
  userSchema,
  workerSchema,
  serviceSchema,
  bookingSchema,
  reviewSchema,
  notificationSchema,
  updateUserSchema,
};