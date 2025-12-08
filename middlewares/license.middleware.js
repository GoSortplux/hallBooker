import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/apiError.js';
import { SubscriptionHistory } from '../models/subscriptionHistory.model.js';
import { Hall } from '../models/hall.model.js';

export const checkActiveLicense = asyncHandler(async (req, res, next) => {
  if (req.user.role.includes('super-admin')) {
    return next();
  }

  const subscription = await SubscriptionHistory.findOne({ owner: req.user._id, status: 'active' }).populate('tier');

  if (!subscription) {
    throw new ApiError(403, "Access Denied: An active subscription is required to perform this action.");
  }

  if (subscription.expiryDate && subscription.expiryDate < new Date()) {
      subscription.status = 'expired';
      await subscription.save();
      throw new ApiError(403, "Access Denied: Your subscription has expired.");
  }

  next();
});