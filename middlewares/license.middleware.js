import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/apiError.js';
import { License } from '../models/license.model.js';

export const checkActiveLicense = asyncHandler(async (req, res, next) => {
  if (req.user.role === 'super-admin') {
    return next();
  }

  const license = await License.findOne({ owner: req.user._id });

  if (!license || license.status !== 'active') {
    throw new ApiError(403, "Access Denied: A valid, active license is required.");
  }
  
  if (license.expiryDate && license.expiryDate < new Date()) {
      throw new ApiError(403, "Access Denied: Your license has expired.");
  }
  
  next();
});