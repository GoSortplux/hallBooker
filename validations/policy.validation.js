import Joi from 'joi';

const createPolicySchema = Joi.object({
  title: Joi.string().required().trim().max(100).messages({
    'string.empty': 'Title is required',
    'string.max': 'Title cannot exceed 100 characters',
  }),
  slug: Joi.string().required().trim().lowercase().pattern(/^[a-z0-9-]+$/).messages({
    'string.empty': 'Slug is required',
    'string.pattern.base': 'Slug can only contain lowercase letters, numbers, and hyphens',
  }),
  content: Joi.string().required().messages({
    'string.empty': 'Content is required',
  }),
  effectiveDate: Joi.date().required().messages({
    'date.base': 'A valid effective date is required',
    'any.required': 'Effective date is required',
  }),
  isPublished: Joi.boolean().default(false),
});

const updatePolicySchema = Joi.object({
  title: Joi.string().trim().max(100),
  content: Joi.string(),
  effectiveDate: Joi.date(),
  isPublished: Joi.boolean()
}).min(1);

export {
  createPolicySchema,
  updatePolicySchema
};
