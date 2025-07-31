import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/apiError.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { License } from '../models/license.model.js';
import { LicenseTier } from '../models/licenseTier.model.js';
import { Venue } from '../models/venue.model.js';
import mongoose from 'mongoose';

const purchaseOrRenewLicense = asyncHandler(async (req, res) => {
    const ownerId = req.user._id;

    // 1. Count the number of venues (halls) the user owns
    const venueCount = await Venue.countDocuments({ owner: ownerId });

    // 2. Find the appropriate license tier
    const tier = await LicenseTier.findOne({
        minHalls: { $lte: venueCount },
        maxHalls: { $gte: venueCount },
    });

    if (!tier) {
        throw new ApiError(400, "No suitable license tier found for your number of venues. Please contact support.");
    }

    // 3. In a real application, integrate with a payment gateway using `tier.price`.
    // For this simulation, we'll assume payment is successful.
    const paymentSuccessful = true;
    if (!paymentSuccessful) {
        throw new ApiError(402, "Payment failed.");
    }

    // 4. Calculate expiry date
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
        expiryDate: expiryDate, // This will be null for lifetime licenses
    };

    // 5. Create or update the license
    const license = await License.findOneAndUpdate({ owner: ownerId }, licenseData, {
        new: true,
        upsert: true,
    }).populate('tier');

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

export { 
    purchaseOrRenewLicense, 
    getMyLicense, 
    getLicenseForUser 
};