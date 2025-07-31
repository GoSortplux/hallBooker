import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/apiError.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { License } from '../models/license.model.js';

const purchaseOrRenewLicense = asyncHandler(async (req, res) => {
    const { licenseType } = req.body; // e.g., '1-year'
    const ownerId = req.user._id;

    // In a real application, this is where you would integrate with a payment gateway like Stripe or Paystack.
    // After a successful payment, you proceed.
    const paymentSuccessful = true;
    if (!paymentSuccessful) {
        throw new ApiError(402, "Payment failed.");
    }

    let expiryDate = null;
    if (licenseType === '1-year') {
        expiryDate = new Date();
        expiryDate.setFullYear(expiryDate.getFullYear() + 1);
    } else if (licenseType === '2-year') {
        expiryDate = new Date();
        expiryDate.setFullYear(expiryDate.getFullYear() + 2);
    } else if (licenseType !== 'lifetime') {
        throw new ApiError(400, "Invalid license type specified.");
    }
    
    const licenseData = {
        owner: ownerId,
        type: licenseType,
        status: 'active',
        purchaseDate: new Date(),
        expiryDate: expiryDate,
    };

    // Find existing license and update it, or create a new one
    const license = await License.findOneAndUpdate({ owner: ownerId }, licenseData, {
        new: true,
        upsert: true // This creates a new document if one doesn't exist
    });

    res.status(200).json(new ApiResponse(200, license, "License activated successfully!"));
});

const getMyLicense = asyncHandler(async (req, res) => {
    const license = await License.findOne({ owner: req.user._id });

    if (!license) {
        throw new ApiError(404, "No license found for your account.");
    }

    res.status(200).json(new ApiResponse(200, license, "License details fetched successfully."));
});

// For Super Admin to manage licenses
const getLicenseForUser = asyncHandler(async (req, res) => {
    const { userId } = req.params;
    const license = await License.findOne({ owner: userId });
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