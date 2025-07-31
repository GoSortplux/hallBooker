import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/apiError.js';
import { License } from '../models/license.model.js';
import { Venue } from '../models/venue.model.js';

export const checkActiveLicense = asyncHandler(async (req, res, next) => {
  if (req.user.role === 'super-admin') {
    return next();
  }

  const venueCount = await Venue.countDocuments({ owner: req.user._id });
  req.venueCount = venueCount; // Attach to request for later use

  if (venueCount === 0) {
    return next(); // Allow creating the first venue without a license
  }

  // For subsequent venues, a valid license is required
  const license = await License.findOne({ owner: req.user._id });

  if (!license || license.status !== 'active') {
    throw new ApiError(403, "Access Denied: An active license is required to create more than one venue.");
  }
  
  if (license.expiryDate && license.expiryDate < new Date()) {
      license.status = 'expired';
      await license.save();
      throw new ApiError(403, "Access Denied: Your license has expired."); 
  }
  
  next();
});