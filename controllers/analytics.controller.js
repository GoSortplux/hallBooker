import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { Hall } from '../models/hall.model.js';
import { Booking } from '../models/booking.model.js';
import { License } from '../models/license.model.js';
import { User } from '../models/user.model.js';

const getSuperAdminAnalytics = asyncHandler(async (req, res) => {
    const totalHalls = await Hall.countDocuments();
    const totalBookings = await Booking.countDocuments();
    const activeSubscriptions = await License.countDocuments({ status: 'active' });
    const totalUsers = await User.countDocuments();

    res.status(200).json(new ApiResponse(200, {
        totalHalls,
        totalBookings,
        activeSubscriptions,
        totalUsers
    }, "Super admin analytics fetched successfully"));
});

const getHallOwnerAnalytics = asyncHandler(async (req, res) => {
    const ownerId = req.user._id;

    const totalHalls = await Hall.countDocuments({ owner: ownerId });

    const ownerHalls = await Hall.find({ owner: ownerId }).select('_id');
    const ownerHallIds = ownerHalls.map(hall => hall._id);

    const totalBookings = await Booking.countDocuments({ hall: { $in: ownerHallIds } });

    const activeSubscription = await License.findOne({ user: ownerId, status: 'active' });

    res.status(200).json(new ApiResponse(200, {
        totalHalls,
        totalBookings,
        activeSubscription
    }, "Hall owner analytics fetched successfully"));
});

export { getSuperAdminAnalytics, getHallOwnerAnalytics };
