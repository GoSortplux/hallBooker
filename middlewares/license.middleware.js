import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/apiError.js';
import { License } from '../models/license.model.js';
import { Venue } from '../models/venue.model.js';

export const checkActiveLicense = asyncHandler(async (req, res, next) => {
  // Super-admin can bypass this check
  if (req.user.role === 'super-admin') {
    return next();
  }

  // Find the user's license and populate the tier details
  const license = await License.findOne({ owner: req.user._id }).populate('tier');

  // Check for a valid, active license
  if (!license || license.status !== 'active') {
    throw new ApiError(403, "Access Denied: An active license is required to perform this action.");
  }

  // Check if the license has expired
  if (license.expiryDate && license.expiryDate < new Date()) {
    license.status = 'expired';
    await license.save();
    throw new ApiError(403, "Access Denied: Your license has expired.");
  }

  // Count the number of venues the user already owns
  const venueCount = await Venue.countDocuments({ owner: req.user._id });

  // Enforce the maxHalls limit from the license tier
  if (license.tier && venueCount >= license.tier.maxHalls) {
    throw new ApiError(403, `You have reached the maximum number of halls (${license.tier.maxHalls}) for your current subscription plan.`);
  }
  
  next();
});