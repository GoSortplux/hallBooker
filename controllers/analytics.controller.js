import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { Venue } from '../models/venue.model.js';
import { Booking } from '../models/booking.model.js';
import { License } from '../models/license.model.js';
import { User } from '../models/user.model.js';

const getSuperAdminAnalytics = asyncHandler(async (req, res) => {
    const totalVenues = await Venue.countDocuments();
    const totalBookings = await Booking.countDocuments();
    const activeSubscriptions = await License.countDocuments({ status: 'active' });
    const totalUsers = await User.countDocuments();

    res.status(200).json(new ApiResponse(200, {
        totalVenues,
        totalBookings,
        activeSubscriptions,
        totalUsers
    }, "Super admin analytics fetched successfully"));
});

const getVenueOwnerAnalytics = asyncHandler(async (req, res) => {
    const ownerId = req.user._id;

    const totalHalls = await Venue.countDocuments({ owner: ownerId });

    const ownerVenues = await Venue.find({ owner: ownerId }).select('_id');
    const ownerVenueIds = ownerVenues.map(venue => venue._id);

    const totalBookings = await Booking.countDocuments({ venue: { $in: ownerVenueIds } });

    const activeSubscription = await License.findOne({ user: ownerId, status: 'active' });

    res.status(200).json(new ApiResponse(200, {
        totalHalls,
        totalBookings,
        activeSubscription
    }, "Venue owner analytics fetched successfully"));
});

export { getSuperAdminAnalytics, getVenueOwnerAnalytics };
