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
  role: Joi.string().valid('client', 'worker', 'admin','contractor','thekedar').default('client'),
  location: Joi.object({
    type: Joi.string().valid('Point').default('Point'),
    coordinates: Joi.array().items(Joi.number()).length(2).optional(),
  }).optional(),
});

const updateUserSchema = Joi.object({
  name: Joi.string().optional(),
  phone: Joi.string().pattern(/^[0-9]{10,15}$/).optional(),
  address: Joi.object({
    street: Joi.string().allow(''),
    city: Joi.string().allow(''),
    state: Joi.string().allow(''),
    zip: Joi.string().allow(''),
    country: Joi.string().allow(''),
  }).optional(),
  location: Joi.object({
    type: Joi.string().valid('Point').default('Point'),
    coordinates: Joi.array().items(Joi.number()).length(2).optional(),
  }).optional(),
});
// middleware/validation.js

const updateUserSchemas = Joi.object({
  email: Joi.string().email().optional(),
  role: Joi.string().valid('client', 'worker', 'admin','contractor', 'thekedar').optional(),
  isVerified: Joi.boolean().optional(),
  name: Joi.string().optional(),
  phone: Joi.string().optional(),
  city: Joi.string().optional(),
  town: Joi.string().optional(),
  address: Joi.string().optional(),
  experience: Joi.number().min(0).optional(),
  skills: Joi.array().items(Joi.string()).optional(),
  features: Joi.array().items(Joi.string()).optional(),
  verificationStatus: Joi.string().valid('pending', 'approved', 'rejected').optional(),
});




module.exports = { validate, updateUserSchema };
const workerSchema = Joi.object({
  skills: Joi.array().items(Joi.string()).min(1).required(),
  experience: Joi.number().min(0).required(),
  hourlyRate: Joi.number().min(0).required(),
  location: Joi.object({
    type: Joi.string().valid('Point').default('Point'),
    coordinates: Joi.array().items(Joi.number()).length(2).optional(),
  }).optional(),
  profileImage: Joi.object({
    data: Joi.string().required(),
    name: Joi.string().required(),
    type: Joi.string().valid('image/jpeg', 'image/png').required(),
  }).optional(),
});

const thekedarSchema = Joi.object({
  companyName: Joi.string().required(),
  experience: Joi.number().min(0).required(),
  certifications: Joi.array().items(Joi.string()).optional(),
  location: Joi.object({
    type: Joi.string().valid('Point').default('Point'),
    coordinates: Joi.array().items(Joi.number()).length(2).optional(),
  }).optional(),
  profileImage: Joi.object({
    data: Joi.string().required(),
    name: Joi.string().required(),
    type: Joi.string().valid('image/jpeg', 'image/png').required(),
  }).optional(),
});

const serviceSchema = Joi.object({
  workerId: Joi.string().optional(), // Optional for thekedars
  category: Joi.string()
    .valid('plumber', 'driver', 'consultant', 'electrician', 'other')
    .required(),
  description: Joi.string().required(),
  hourlyRate: Joi.number().min(0).required(),
  availability: Joi.array().items(
    Joi.object({
      day: Joi.string()
        .valid('Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday')
        .required(),
      startTime: Joi.string().required(),
      endTime: Joi.string().required(),
    })
  ).required(),
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

const forgotPasswordSchema = Joi.object({
  email: Joi.string().email().required(),
});

const resetPasswordSchema = Joi.object({
  token: Joi.string().required(),
  password: Joi.string().min(6).required(),
});

// Validation Schema for Post Creation
const postSchema = Joi.object({
  title: Joi.string().required(),
  description: Joi.string().required(),
  category: Joi.string().valid('job_request', 'service_offering', 'consulting', 'contracting').required(),
  hourlyRate: Joi.number().optional(), // Validated in Mongoose schema for workers
  availability: Joi.boolean().default(true),
  serviceType: Joi.string().valid('general', 'specialized', 'emergency', 'long_term').optional(),
  projectScale: Joi.string().valid('small', 'medium', 'large').optional(),
  certifications: Joi.array().items(Joi.string()).optional(),
  images: Joi.array().items(Joi.string()).optional(),
});
const registerSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
  role: Joi.string().valid('client', 'worker', 'thekadar', 'small_consultant', 'large_consultant').required(),
});
module.exports = {
  validate,
  userSchema,
  postSchema,
  registerSchema,
  workerSchema,
  serviceSchema,
  bookingSchema,
  reviewSchema,
  notificationSchema,
  updateUserSchema,
   forgotPasswordSchema,
  resetPasswordSchema,
  updateUserSchemas,
  thekedarSchema,
};