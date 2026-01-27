import Joi from 'joi';

const updateBankAccountSchema = Joi.object({
  bankCode: Joi.string().required().trim().messages({
    'string.empty': 'Bank code is required',
  }),
  accountNumber: Joi.string().required().trim().min(10).max(10).messages({
    'string.empty': 'Account number is required',
    'string.min': 'Account number must be 10 digits',
    'string.max': 'Account number must be 10 digits',
  }),
});

const addStaffSchema = Joi.object({
  fullName: Joi.string().required().trim(),
  email: Joi.string().email().required().lowercase().trim(),
  phone: Joi.string().required().trim(),
  password: Joi.string().min(6).required(),
  hallIds: Joi.array().items(Joi.string()).optional(),
});

export {
  updateBankAccountSchema,
  addStaffSchema,
};
