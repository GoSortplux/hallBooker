import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { Analytics } from '../models/analytics.model.js';
import { Hall } from '../models/hall.model.js';
import { User } from '../models/user.model.js';
import { Booking } from '../models/booking.model.js';
import { SubscriptionHistory } from '../models/subscriptionHistory.model.js';
import mongoose from 'mongoose';

const getSuperAdminAnalytics = asyncHandler(async (req, res) => {
    const totalUsers = await User.countDocuments();
    const totalHalls = await Hall.countDocuments();
    const totalBookings = await Booking.countDocuments();
    const activeSubscriptions = await SubscriptionHistory.countDocuments({ status: 'active' });

    const stats = {
        totalUsers,
        totalHalls,
        totalBookings,
        activeSubscriptions,
    };
    return res.status(200).json(new ApiResponse(200, stats, "Super admin analytics fetched successfully"));
});

const getHallOwnerAnalytics = asyncHandler(async (req, res) => {
    const ownerId = req.user._id;
    const halls = await Hall.find({ owner: ownerId });
    const hallIds = halls.map(hall => hall._id);

    const totalBookings = await Booking.countDocuments({ hall: { $in: hallIds } });
    const totalViews = await Analytics.countDocuments({ hall: { $in: hallIds }, type: 'view' });
    const totalDemoBookings = await Analytics.countDocuments({ hall: { $in: hallIds }, type: 'demo-booking' });

    const stats = {
        totalHalls: halls.length,
        totalBookings,
        totalViews,
        totalDemoBookings,
    };

    return res.status(200).json(new ApiResponse(200, stats, "Hall owner analytics fetched successfully"));
});

const getHallAnalytics = asyncHandler(async (req, res) => {
    const { hallId } = req.params;
    const { startDate, endDate, type } = req.query;

    const query = { hall: new mongoose.Types.ObjectId(hallId) };

    if (startDate || endDate) {
        query.createdAt = {};
        if (startDate) query.createdAt.$gte = new Date(startDate);
        if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    if (type) {
        query.type = type;
    }

    const analyticsData = await Analytics.find(query);
    const totalCount = await Analytics.countDocuments(query);

    return res.status(200).json(
        new ApiResponse(
            200,
            { totalCount, analyticsData },
            "Hall analytics data fetched successfully"
        )
    );
});

export { getSuperAdminAnalytics, getHallOwnerAnalytics, getHallAnalytics };
