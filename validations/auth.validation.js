import Joi from 'joi';

const registerSchema = Joi.object({
  fullName: Joi.string().required().trim().messages({
    'string.empty': 'Full name is required',
  }),
  email: Joi.string().email().required().lowercase().trim().messages({
    'string.email': 'Please provide a valid email address',
    'string.empty': 'Email is required',
  }),
  phone: Joi.string().required().trim().messages({
    'string.empty': 'Phone number is required',
  }),
  password: Joi.string().min(6).required().messages({
    'string.min': 'Password must be at least 6 characters long',
    'string.empty': 'Password is required',
  }),
  role: Joi.array().items(Joi.string().valid('user', 'hall-owner')).default(['user']),
  whatsappNumber: Joi.string().allow('', null),
});

const loginSchema = Joi.object({
  email: Joi.string().email().required().trim().messages({
    'string.email': 'Please provide a valid email address',
    'string.empty': 'Email is required',
  }),
  password: Joi.string().required().messages({
    'string.empty': 'Password is required',
  }),
  role: Joi.string().valid('user', 'hall-owner', 'staff', 'super-admin').optional(),
});

const forgotPasswordSchema = Joi.object({
    email: Joi.string().email().required().trim().messages({
        'string.email': 'Please provide a valid email address',
        'string.empty': 'Email is required',
    }),
});

const resetPasswordSchema = Joi.object({
    password: Joi.string().min(6).required().messages({
        'string.min': 'Password must be at least 6 characters long',
        'string.empty': 'Password is required',
    }),
});

export {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema
};
