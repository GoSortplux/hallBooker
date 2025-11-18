import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/apiError.js';
import { SubscriptionHistory } from '../models/subscriptionHistory.model.js';
import { Hall } from '../models/hall.model.js';

export const checkHallCreationLimit = asyncHandler(async (req, res, next) => {
  if (req.user.role.includes('super-admin')) {
    return next();
  }

  const subscription = await SubscriptionHistory.findOne({ owner: req.user._id, status: 'active' }).populate('tier');

  if (!subscription) {
    throw new ApiError(403, "Access Denied: An active subscription is required to create a hall.");
  }

  const hallCount = await Hall.countDocuments({ owner: req.user._id });

  if (subscription.tier && hallCount >= subscription.tier.maxHalls) {
    throw new ApiError(403, `You have reached the maximum number of halls (${subscription.tier.maxHalls}) for your current subscription plan.`);
  }

  next();
});
