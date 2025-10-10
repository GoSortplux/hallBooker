import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/apiError.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { SubscriptionHistory } from '../models/subscriptionHistory.model.js';
import { LicenseTier } from '../models/licenseTier.model.js';
import { Hall } from '../models/hall.model.js';
import { User } from '../models/user.model.js';
import mongoose from 'mongoose';
import sendEmail from '../services/email.service.js';
import { generateAdminLicenseNotificationEmail, generateSubscriptionConfirmationEmail } from '../utils/emailTemplates.js';
import { initializeTransaction, verifyTransaction } from '../services/payment.service.js';


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

    const hallCount = await Hall.countDocuments({ owner: ownerId });
    if (hallCount > tier.maxHalls) {
        throw new ApiError(400, `You have too many halls (${hallCount}) for the selected tier (max: ${tier.maxHalls}).`);
    }

    // Handle free tiers - activate directly without payment
    if (tier.price === 0) {
        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + tier.durationInDays);

        const newSubscription = await SubscriptionHistory.create({
            owner: ownerId,
            tier: tier._id,
            price: 0,
            status: 'active',
            purchaseDate: new Date(),
            expiryDate: expiryDate,
        });

        await Hall.updateMany({ owner: ownerId }, { $set: { isActive: true } });

        // Send confirmation emails
        sendEmail({
            email: req.user.email,
            subject: 'Your Free Subscription is Active!',
            html: generateSubscriptionConfirmationEmail(req.user.fullName, tier.name, 0, expiryDate),
        }).catch(err => console.error(`Free subscription user notification email failed:`, err));

        const admin = await User.findOne({ role: 'super-admin' });
        if (admin) {
            sendEmail({
                email: admin.email,
                subject: 'New Free Subscription Activated',
                html: generateAdminLicenseNotificationEmail(req.user.fullName, tier.name, 0),
            }).catch(err => console.error(`Free subscription admin notification email failed:`, err));
        }

        return res.status(201).json(new ApiResponse(201, newSubscription, "Free subscription activated successfully."));
    }

    // Proceed with payment for paid tiers
    const newSubscription = await SubscriptionHistory.create({
        owner: ownerId,
        tier: tier._id,
        price: tier.price,
        status: 'pending',
        purchaseDate: new Date(),
    });

    const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
    const redirectUrl = `${baseUrl}/payments/verify?paymentReference=${newSubscription._id.toString()}`;

    const paymentData = {
        amount: tier.price,
        customerName: req.user.fullName,
        customerEmail: req.user.email,
        paymentReference: newSubscription._id.toString(),
        paymentDescription: `Subscription for ${tier.name}`,
        currencyCode: 'NGN',
        contractCode: process.env.MONNIFY_CONTRACT_CODE,
        redirectUrl: redirectUrl,
        paymentMethods: ["CARD", "ACCOUNT_TRANSFER"],
    };

    const paymentResponse = await initializeTransaction(paymentData);

    res.status(200).json(new ApiResponse(200, paymentResponse.responseBody, "Payment initialized successfully."));
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

    if (newTier.price <= currentSubscription.tier.price) {
        throw new ApiError(400, "The new tier must be an upgrade. Choose a tier with a higher price.");
    }

    const hallCount = await Hall.countDocuments({ owner: ownerId });
    if (hallCount > newTier.maxHalls) {
        throw new ApiError(400, `You have too many halls (${hallCount}) for the selected tier (max: ${newTier.maxHalls}).`);
    }

    // Mark the old subscription as 'upgraded'
    currentSubscription.status = 'upgraded';
    await currentSubscription.save();

    const newSubscription = await SubscriptionHistory.create({
        owner: ownerId,
        tier: newTier._id,
        price: newTier.price,
        status: 'pending',
        purchaseDate: new Date(),
    });

    const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
    const redirectUrl = `${baseUrl}/payments/verify?paymentReference=${newSubscription._id.toString()}`;

    const paymentData = {
        amount: newTier.price,
        customerName: req.user.fullName,
        customerEmail: req.user.email,
        paymentReference: newSubscription._id.toString(),
        paymentDescription: `Upgrade to ${newTier.name}`,
        currencyCode: 'NGN',
        contractCode: process.env.MONNIFY_CONTRACT_CODE,
        redirectUrl: redirectUrl,
        paymentMethods: ["CARD", "ACCOUNT_TRANSFER"],
    };

    const paymentResponse = await initializeTransaction(paymentData);

    res.status(200).json(new ApiResponse(200, paymentResponse.responseBody, "Upgrade payment initialized successfully."));
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
    const hallCount = await Hall.countDocuments({ owner: ownerId });

    let recommendedTier = await LicenseTier.findOne({
        minHalls: { $lte: hallCount },
        maxHalls: { $gte: hallCount },
    }).sort({ price: 1 });

    if (!recommendedTier) {
        recommendedTier = await LicenseTier.findOne().sort({ maxHalls: -1 });
        if (recommendedTier) {
            return res.status(200).json(new ApiResponse(200, { recommendedTier, hallCount, message: "You exceed the limits of our standard tiers. Here is our highest available tier." }, "Recommendation generated."));
        }
        throw new ApiError(404, "No license tiers are available in the system.");
    }

    res.status(200).json(new ApiResponse(200, { recommendedTier, hallCount }, "Recommended tier fetched successfully."));
});


export {
    purchaseSubscription,
    upgradeSubscription,
    getMyCurrentSubscription,
    getMySubscriptionHistory,
    getSubscriptionHistoryForUser,
    getRecommendedTier
};