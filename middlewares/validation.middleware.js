import { ApiError } from '../utils/apiError.js';

const validate = (schema) => (req, res, next) => {
  const { error, value } = schema.validate(req.body, {
    abortEarly: false,
    stripUnknown: true,
  });

  if (error) {
    const errorMessage = error.details
      .map((detail) => detail.message)
      .join(', ');
    throw new ApiError(400, errorMessage);
  }

  req.body = value;
  next();
};

export default validate;
