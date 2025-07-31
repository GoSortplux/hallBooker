import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/apiError.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { SubscriptionHistory } from '../models/subscriptionHistory.model.js';
import { LicenseTier } from '../models/licenseTier.model.js';
import { Venue } from '../models/venue.model.js';
import mongoose from 'mongoose';
import sendEmail from '../services/email.service.js';
import { generateLicensePurchaseEmail } from '../utils/emailTemplates.js';

const purchaseSubscription = asyncHandler(async (req, res) => {
    const ownerId = req.user._id;
    const { tierId } = req.body;

    if (!tierId) {
        throw new ApiError(400, "A license tier ID is required.");
    }

    const tier = await LicenseTier.findById(tierId);
    if (!tier) {
        throw new ApiError(404, "The selected license tier was not found.");
    }

    const currentSubscription = await SubscriptionHistory.findOne({ owner: ownerId, status: 'active' });
    if (currentSubscription && currentSubscription.tier.toString() === tierId) {
        throw new ApiError(400, "You are already subscribed to this license tier.");
    }

    const venueCount = await Venue.countDocuments({ owner: ownerId });
    if (venueCount > tier.maxHalls) {
        throw new ApiError(400, `You have too many venues (${venueCount}) for the selected tier (max: ${tier.maxHalls}).`);
    }

    // Mark old subscriptions as expired or cancelled
    if (currentSubscription) {
        currentSubscription.status = 'expired';
        await currentSubscription.save();
    }

    let expiryDate = null;
    if (tier.durationInDays) {
        expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + tier.durationInDays);
    }

    const newSubscription = await SubscriptionHistory.create({
        owner: ownerId,
        tier: tier._id,
        price: tier.price,
        status: 'active',
        purchaseDate: new Date(),
        expiryDate: expiryDate,
    });

    try {
        await sendEmail({
            email: req.user.email,
            subject: 'Your New Subscription is Active!',
            html: generateLicensePurchaseEmail(req.user.fullName, tier.name, tier.price, expiryDate),
        });
    } catch (emailError) {
        console.error(`Subscription purchase email failed for ${req.user.email}:`, emailError.message);
    }

    res.status(201).json(new ApiResponse(201, newSubscription, "Subscription purchased successfully!"));
});

const upgradeSubscription = asyncHandler(async (req, res) => {
    const { newTierId } = req.body;
    const ownerId = req.user._id;

    if (!newTierId) {
        throw new ApiError(400, "New license tier ID is required for an upgrade.");
    }

    const [currentSubscription, newTier] = await Promise.all([
        SubscriptionHistory.findOne({ owner: ownerId, status: 'active' }).populate('tier'),
        LicenseTier.findById(newTierId)
    ]);

    if (!currentSubscription) {
        throw new ApiError(404, "No active subscription found to upgrade.");
    }

    if (!newTier) {
        throw new ApiError(404, "The selected new license tier was not found.");
    }

    if (newTier.maxHalls <= currentSubscription.tier.maxHalls) {
        throw new ApiError(400, "The new tier must be an upgrade.");
    }

    // Mark the old subscription as 'upgraded'
    currentSubscription.status = 'upgraded';
    await currentSubscription.save();

    let expiryDate = null;
    if (newTier.durationInDays) {
        expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + newTier.durationInDays);
    }

    const newSubscription = await SubscriptionHistory.create({
        owner: ownerId,
        tier: newTier._id,
        price: newTier.price,
        status: 'active',
        purchaseDate: new Date(),
        expiryDate: expiryDate,
    });

    res.status(200).json(new ApiResponse(200, newSubscription, "Subscription upgraded successfully!"));
});

const getMyCurrentSubscription = asyncHandler(async (req, res) => {
    const subscription = await SubscriptionHistory.findOne({ owner: req.user._id, status: 'active' }).populate('tier');

    if (!subscription) {
        throw new ApiError(404, "No active subscription found.");
    }

    res.status(200).json(new ApiResponse(200, subscription, "Current subscription fetched successfully."));
});

const getMySubscriptionHistory = asyncHandler(async (req, res) => {
    const history = await SubscriptionHistory.find({ owner: req.user._id }).populate('tier').sort({ purchaseDate: -1 });
    res.status(200).json(new ApiResponse(200, history, "Subscription history fetched successfully."));
});

const getSubscriptionHistoryForUser = asyncHandler(async (req, res) => {
    const { userId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(userId)) {
        throw new ApiError(400, "Invalid user ID format.");
    }

    const history = await SubscriptionHistory.find({ owner: userId }).populate('tier').sort({ purchaseDate: -1 });
    res.status(200).json(new ApiResponse(200, history, "User subscription history fetched successfully."));
});

const getRecommendedTier = asyncHandler(async (req, res) => {
    const ownerId = req.user._id;
    const venueCount = await Venue.countDocuments({ owner: ownerId });

    let recommendedTier = await LicenseTier.findOne({
        minHalls: { $lte: venueCount },
        maxHalls: { $gte: venueCount },
    }).sort({ price: 1 });

    if (!recommendedTier) {
        recommendedTier = await LicenseTier.findOne().sort({ maxHalls: -1 });
        if (recommendedTier) {
            return res.status(200).json(new ApiResponse(200, { recommendedTier, venueCount, message: "You exceed the limits of our standard tiers. Here is our highest available tier." }, "Recommendation generated."));
        }
        throw new ApiError(404, "No license tiers are available in the system.");
    }

    res.status(200).json(new ApiResponse(200, { recommendedTier, venueCount }, "Recommended tier fetched successfully."));
});


export {
    purchaseSubscription,
    upgradeSubscription,
    getMyCurrentSubscription,
    getMySubscriptionHistory,
    getSubscriptionHistoryForUser,
    getRecommendedTier
};