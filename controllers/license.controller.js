import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/apiError.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { License } from '../models/license.model.js';
import { LicenseTier } from '../models/licenseTier.model.js';
import { Venue } from '../models/venue.model.js';
import mongoose from 'mongoose';
import sendEmail from '../services/email.service.js';
import { generateLicensePurchaseEmail } from '../utils/emailTemplates.js';

const purchaseOrRenewLicense = asyncHandler(async (req, res) => {
    const ownerId = req.user._id;
    const { tierId } = req.body;

    if (!tierId) {
        throw new ApiError(400, "A license tier ID is required.");
    }

    const tier = await LicenseTier.findById(tierId);
    if (!tier) {
        throw new ApiError(404, "The selected license tier was not found.");
    }

    const existingLicense = await License.findOne({ owner: ownerId });
    if (existingLicense && existingLicense.status === 'active' && existingLicense.tier.toString() === tierId) {
        throw new ApiError(400, "You are already subscribed to this license tier. If you want to upgrade, please use the upgrade option.");
    }

    const venueCount = await Venue.countDocuments({ owner: ownerId });
    if (venueCount > tier.maxHalls) {
        throw new ApiError(400, `You have too many venues (${venueCount}) for the selected tier (max: ${tier.maxHalls}). Please choose a higher tier or upgrade your current plan.`);
    }

    const paymentSuccessful = true; // Placeholder for payment gateway integration
    if (!paymentSuccessful) {
        throw new ApiError(402, "Payment failed.");
    }

    let expiryDate = null;
    if (tier.durationInDays) {
        expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + tier.durationInDays);
    }

    const licenseData = {
        owner: ownerId,
        tier: tier._id,
        price: tier.price,
        status: 'active',
        purchaseDate: new Date(),
        expiryDate: expiryDate,
    };

    const license = await License.findOneAndUpdate({ owner: ownerId }, licenseData, {
        new: true,
        upsert: true,
    }).populate('tier');

    try {
        await sendEmail({
            email: req.user.email,
            subject: 'Your License Has Been Activated!',
            html: generateLicensePurchaseEmail(req.user.fullName, tier.name, tier.price, expiryDate),
        });
    } catch (emailError) {
        console.error(`License purchase email failed for ${req.user.email}:`, emailError.message);
    }

    res.status(200).json(new ApiResponse(200, license, "License activated successfully!"));
});

const getMyLicense = asyncHandler(async (req, res) => {
    const license = await License.findOne({ owner: req.user._id }).populate('tier');

    if (!license) {
        throw new ApiError(404, "No license found for your account.");
    }

    res.status(200).json(new ApiResponse(200, license, "License details fetched successfully."));
});

// For Super Admin to manage licenses
const getLicenseForUser = asyncHandler(async (req, res) => {
    const { userId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(userId)) {
        throw new ApiError(400, "Invalid user ID format.");
    }

    const license = await License.findOne({ owner: userId }).populate('tier');

    if (!license) {
        throw new ApiError(404, "No license found for this user.");
    }

    res.status(200).json(new ApiResponse(200, license, "User license details fetched successfully."));
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

const upgradeLicense = asyncHandler(async (req, res) => {
    const { newTierId } = req.body;
    const ownerId = req.user._id;

    if (!newTierId) {
        throw new ApiError(400, "New license tier ID is required for an upgrade.");
    }

    const [currentLicense, newTier] = await Promise.all([
        License.findOne({ owner: ownerId }).populate('tier'),
        LicenseTier.findById(newTierId)
    ]);

    if (!currentLicense || currentLicense.status !== 'active') {
        throw new ApiError(404, "No active license found to upgrade.");
    }

    if (!newTier) {
        throw new ApiError(404, "The selected new license tier was not found.");
    }

    if (newTier.maxHalls <= currentLicense.tier.maxHalls) {
        throw new ApiError(400, "The new tier must be an upgrade (i.e., have a higher hall capacity).");
    }

    // For simplicity, we'll just update the tier and price.
    // A real-world scenario would involve prorated charges, etc.
    currentLicense.tier = newTier._id;
    currentLicense.price = newTier.price;
    // Optionally, you might want to reset the expiry date based on the new tier's duration
    if (newTier.durationInDays) {
        const newExpiryDate = new Date();
        newExpiryDate.setDate(newExpiryDate.getDate() + newTier.durationInDays);
        currentLicense.expiryDate = newExpiryDate;
    } else {
        currentLicense.expiryDate = null; // For lifetime tiers
    }

    await currentLicense.save();

    const updatedLicense = await License.findById(currentLicense._id).populate('tier');

    res.status(200).json(new ApiResponse(200, updatedLicense, "License upgraded successfully!"));
});

export { 
    purchaseOrRenewLicense, 
    getMyLicense, 
    getLicenseForUser,
    getRecommendedTier,
    upgradeLicense
};