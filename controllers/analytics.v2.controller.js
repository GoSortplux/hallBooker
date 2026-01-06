import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { getDateRange } from '../utils/analytics.utils.js';
import { Booking } from '../models/booking.model.js';
import { Hall } from '../models/hall.model.js';
import { Analytics } from '../models/analytics.model.js';
import { SubscriptionHistory } from '../models/subscriptionHistory.model.js';
import Setting from '../models/setting.model.js';
import { User } from '../models/user.model.js';
import mongoose from 'mongoose';

// @desc    Get analytics for the current hall owner
// @route   GET /api/v2/analytics/hall-owner
// @access  Private (Hall Owner)
const getHallOwnerAnalytics = asyncHandler(async (req, res) => {
  const ownerId = req.user._id;
  const { startDate, endDate } = getDateRange(req.query);
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;

  // 1. Get all halls for the owner
  const halls = await Hall.find({ owner: ownerId }).select('_id name');
  const hallIds = halls.map((hall) => hall._id);

  if (hallIds.length === 0) {
    return res
      .status(200)
      .json(new ApiResponse(200, {}, 'No halls found for this owner.'));
  }

  // 2. Calculate Overall Stats
  const totalRevenuePromise = Booking.aggregate([
    {
      $match: {
        hall: { $in: hallIds },
        paymentStatus: 'paid',
        createdAt: { $gte: startDate, $lte: endDate },
      },
    },
    {
      $group: {
        _id: null,
        total: { $sum: '$totalPrice' },
      },
    },
  ]);

  const totalViewsPromise = Analytics.countDocuments({
    hall: { $in: hallIds },
    type: 'view',
    createdAt: { $gte: startDate, $lte: endDate },
  });

  const totalDemoBookingsPromise = Analytics.countDocuments({
    hall: { $in: hallIds },
    type: 'demo-booking',
    createdAt: { $gte: startDate, $lte: endDate },
  });

  const bookingCountsPromise = Booking.aggregate([
    {
      $match: {
        hall: { $in: hallIds },
        createdAt: { $gte: startDate, $lte: endDate },
      },
    },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
      },
    },
  ]);

    // 3. Revenue Details
  const revenueByHallPromise = Booking.aggregate([
    {
      $match: {
        hall: { $in: hallIds },
        paymentStatus: 'paid',
        createdAt: { $gte: startDate, $lte: endDate },
      },
    },
    {
      $group: {
        _id: '$hall',
        totalRevenue: { $sum: '$totalPrice' },
        hallRevenue: { $sum: '$hallPrice' },
        facilityRevenue: { $sum: '$facilitiesPrice' },
      },
    },
    {
        $lookup: {
            from: 'halls',
            localField: '_id',
            foreignField: '_id',
            as: 'hallDetails'
        }
    },
    {
        $unwind: '$hallDetails'
    },
    {
        $project: {
            _id: 0,
            hallId: '$_id',
            hallName: '$hallDetails.name',
            totalRevenue: 1,
            hallRevenue: 1,
            facilityRevenue: 1
        }
    }
  ]);

    // 4. Recent Bookings (Paginated)
  const recentBookingsPromise = Booking.find({
    hall: { $in: hallIds },
    createdAt: { $gte: startDate, $lte: endDate },
  })
    .populate('user', 'fullName email')
    .populate('hall', 'name')
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit);

  const totalBookingsCountPromise = Booking.countDocuments({
    hall: { $in: hallIds },
    createdAt: { $gte: startDate, $lte: endDate },
  });

  // 5. KPIs
  const busiestDaysPromise = Booking.aggregate([
        {
            $match: {
                hall: { $in: hallIds },
                status: 'confirmed',
                createdAt: { $gte: startDate, $lte: endDate }
            }
        },
        {
            $group: {
                _id: { $dayOfWeek: '$createdAt' },
                count: { $sum: 1 }
            }
        },
        { $sort: { count: -1 } },
        {
            $project: {
                _id: 0,
                day: '$_id',
                count: 1
            }
        }
    ]);

    // Occupancy Rate & Lead Time requires more complex logic, will add in a future iteration if requested.
    // For now, focusing on the core KPIs.


  const [
    revenueResult,
    totalViews,
    totalDemoBookings,
    bookingCountsResult,
    revenueByHall,
    recentBookings,
    totalBookingsCount,
    busiestDays
  ] = await Promise.all([
    totalRevenuePromise,
    totalViewsPromise,
    totalDemoBookingsPromise,
    bookingCountsPromise,
    revenueByHallPromise,
    recentBookingsPromise,
    totalBookingsCountPromise,
    busiestDaysPromise
  ]);

  const totalRevenue = revenueResult[0]?.total || 0;
  const bookingCounts = bookingCountsResult.reduce((acc, item) => {
    acc[item._id] = item.count;
    return acc;
  }, {});

  const overallStats = {
    totalRevenue,
    totalViews,
    totalDemoBookings,
    totalBookings: {
      confirmed: bookingCounts.confirmed || 0,
      cancelled: bookingCounts.cancelled || 0,
    },
  };

    const pendingBookings = await Booking.countDocuments({
        hall: { $in: hallIds },
        paymentStatus: 'pending',
        createdAt: { $gte: startDate, $lte: endDate },
    });

    overallStats.totalBookings.pending = pendingBookings;

    const totalConfirmedBookings = overallStats.totalBookings.confirmed;
    const conversionRate = totalViews > 0 ? (totalConfirmedBookings / totalViews) * 100 : 0;
    const averageBookingValue = totalConfirmedBookings > 0 ? totalRevenue / totalConfirmedBookings : 0;

    // map day number to day name
    const dayMapping = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const busiestDaysFormatted = busiestDays.map(day => ({
        day: dayMapping[day.day - 1],
        count: day.count
    }));


  res
    .status(200)
    .json(
      new ApiResponse(
        200,
        {
            overallStats,
            revenueDetails: {
                breakdownByHall: revenueByHall
            },
            recentBookings: {
                bookings: recentBookings,
                pagination: {
                    currentPage: page,
                    totalPages: Math.ceil(totalBookingsCount / limit),
                    totalBookings: totalBookingsCount
                }
            },
            kpis: {
                bookingConversionRate: `${conversionRate.toFixed(2)}%`,
                averageBookingValue: averageBookingValue.toFixed(2),
                busiestDays: busiestDaysFormatted
            }
        },
        'Hall owner analytics fetched successfully.'
      )
    );
});

// @desc    Get platform-wide analytics for super admins
// @route   GET /api/v2/analytics/super-admin
// @access  Private (Super Admin)
const getSuperAdminAnalytics = asyncHandler(async (req, res) => {
    const { startDate, endDate } = getDateRange(req.query);
    const { hallId } = req.query;

    // Data comparison logic
    const periodDuration = endDate.getTime() - startDate.getTime();
    const previousStartDate = new Date(startDate.getTime() - periodDuration);
    const previousEndDate = new Date(startDate.getTime() - 1);

    const getRevenueForPeriod = async (start, end) => {
         const bookingRevenue = await Booking.aggregate([
            { $match: { paymentStatus: 'paid', createdAt: { $gte: start, $lte: end } } },
            { $group: { _id: null, total: { $sum: '$totalPrice' } } }
        ]);
        const subscriptionRevenue = await SubscriptionHistory.aggregate([
            { $match: { status: 'active', purchaseDate: { $gte: start, $lte: end } } },
            { $group: { _id: null, total: { $sum: '$price' } } }
        ]);
        return {
            booking: bookingRevenue[0]?.total || 0,
            subscription: subscriptionRevenue[0]?.total || 0,
        }
    }


    // 1. Platform Revenue
    const currentPeriodRevenue = await getRevenueForPeriod(startDate, endDate);
    const previousPeriodRevenue = await getRevenueForPeriod(previousStartDate, previousEndDate);


    // 2. Commission Analytics
    const commissionRateSetting = await Setting.findOne({ key: 'commissionRate' });
    const commissionRate = commissionRateSetting ? commissionRateSetting.value / 100 : 0;

    const commissionMatch = {
        paymentStatus: 'paid',
        bookingType: 'online',
        createdAt: { $gte: startDate, $lte: endDate },
    };

    if (hallId) {
        commissionMatch.hall = new mongoose.Types.ObjectId(hallId);
    }

    const commissionAnalyticsPromise = Booking.aggregate([
        {
            $match: commissionMatch,
        },
        {
            $group: {
                _id: null,
                totalRevenue: { $sum: '$totalPrice' },
            },
        },
    ]);

    // 3. Hall Performance Lists
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Inactive Halls
    const ownersWithActiveSubscriptionPromise = SubscriptionHistory.find({ status: 'active' }).distinct('owner');
    const hallsWithRecentBookingsPromise = Booking.find({ createdAt: { $gte: thirtyDaysAgo } }).distinct('hall');


    // Most Active Halls (complex logic, handle separately)
    const hallActivityPromise = Hall.aggregate([
        // Stage 1: Get bookings revenue and count per hall
        {
            $lookup: {
                from: 'bookings',
                localField: '_id',
                foreignField: 'hall',
                as: 'bookings',
                pipeline: [
                    { $match: { status: 'confirmed', createdAt: { $gte: startDate, $lte: endDate } } }
                ]
            }
        },
        // Stage 2: Get views count per hall
        {
            $lookup: {
                from: 'analytics',
                localField: '_id',
                foreignField: 'hall',
                as: 'views',
                pipeline: [
                    { $match: { type: 'view', createdAt: { $gte: startDate, $lte: endDate } } }
                ]
            }
        },
        // Stage 3: Project the fields and calculate initial scores
        {
            $project: {
                name: 1,
                owner: 1,
                revenue: { $sum: '$bookings.totalPrice' },
                bookingCount: { $size: '$bookings' },
                viewCount: { $size: '$views' },
            }
        },
        // Stage 4: Calculate weighted score
        {
            $project: {
                name: 1,
                owner: 1,
                revenue: 1,
                bookingCount: 1,
                viewCount: 1,
                score: {
                    $add: [
                        { $multiply: ['$revenue', 0.6] },
                        { $multiply: ['$bookingCount', 0.3] },
                        { $multiply: ['$viewCount', 0.1] }
                    ]
                }
            }
        },
        // Stage 5: Sort and limit
        { $sort: { score: -1 } },
        { $limit: 10 }
    ]);



    const [
        commissionResult,
        ownersWithActiveSubscription,
        hallsWithRecentBookings,
        mostActiveHalls
    ] = await Promise.all([
        commissionAnalyticsPromise,
        ownersWithActiveSubscriptionPromise,
        hallsWithRecentBookingsPromise,
        hallActivityPromise
    ]);

    const inactiveHalls = await Hall.find({
        $or: [
            { owner: { $nin: ownersWithActiveSubscription } },
            { _id: { $nin: hallsWithRecentBookings } }
        ]
    }).populate('owner', 'fullName email');

    await User.populate(mostActiveHalls, { path: 'owner', select: 'fullName email' });


    const totalBookingRevenue = currentPeriodRevenue.booking;
    const totalSubscriptionRevenue = currentPeriodRevenue.subscription;
    const commissionableRevenue = commissionResult[0]?.totalRevenue || 0;
    const totalCommission = commissionableRevenue * commissionRate;

    const calculatePercentageChange = (current, previous) => {
        if(previous === 0) return current > 0 ? 100 : 0;
        return ((current - previous) / previous) * 100;
    }


  res
    .status(200)
    .json(new ApiResponse(200, {
        platformRevenue: {
            totalBookingRevenue,
            totalSubscriptionRevenue,
            grandTotal: totalBookingRevenue + totalSubscriptionRevenue
        },
        commissionAnalytics: {
            commissionRate: `${commissionRate * 100}%`,
            totalCommission,
            commissionableRevenue,
        },
        hallPerformance: {
            mostActiveHalls,
            inactiveHalls
        },
        dataComparison: {
            currentPeriod: {
                from: startDate.toISOString().split('T')[0],
                to: endDate.toISOString().split('T')[0],
                bookingRevenue: totalBookingRevenue,
                subscriptionRevenue: totalSubscriptionRevenue,
            },
            previousPeriod: {
                from: previousStartDate.toISOString().split('T')[0],
                to: previousEndDate.toISOString().split('T')[0],
                bookingRevenue: previousPeriodRevenue.booking,
                subscriptionRevenue: previousPeriodRevenue.subscription
            },
            change: {
                bookingRevenuePercentage: `${calculatePercentageChange(totalBookingRevenue, previousPeriodRevenue.booking).toFixed(2)}%`,
                subscriptionRevenuePercentage: `${calculatePercentageChange(totalSubscriptionRevenue, previousPeriodRevenue.subscription).toFixed(2)}%`,
            }
        }
    }, 'Super admin analytics fetched successfully.'));
});

export { getHallOwnerAnalytics, getSuperAdminAnalytics };
