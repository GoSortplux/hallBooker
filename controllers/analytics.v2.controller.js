import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { getDateRange } from '../utils/analytics.utils.js';
import { Booking } from '../models/booking.model.js';
import { Hall } from '../models/hall.model.js';
import { Analytics } from '../models/analytics.model.js';
import { SubscriptionHistory } from '../models/subscriptionHistory.model.js';
import Setting from '../models/setting.model.js';
import { User } from '../models/user.model.js';
import { Reservation } from '../models/reservation.model.js';
import mongoose from 'mongoose';

// @desc    Get analytics for the current hall owner
// @route   GET /api/v2/analytics/hall-owner
// @access  Private (Hall Owner)
const getHallOwnerAnalytics = asyncHandler(async (req, res) => {
  const ownerId = req.user._id;
  const { startDate, endDate } = getDateRange(req.query);
  const { hallId: specificHallId } = req.query;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;

  // 1. Get all halls for the owner
  const halls = await Hall.find({ owner: ownerId }).select('_id name openingHour closingHour');
  const hallIds = halls.map((hall) => hall._id);

  if (hallIds.length === 0) {
    return res
      .status(200)
      .json(new ApiResponse(200, {}, 'No halls found for this owner.'));
  }

  const targetHallIds = specificHallId ? [new mongoose.Types.ObjectId(specificHallId)] : hallIds;


  // 2. Calculate Overall Stats
  const totalRevenuePromise = Booking.aggregate([
    {
      $match: {
        hall: { $in: targetHallIds },
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
    hall: { $in: targetHallIds },
    type: 'view',
    createdAt: { $gte: startDate, $lte: endDate },
  });

  const totalDemoBookingsPromise = Analytics.countDocuments({
    hall: { $in: targetHallIds },
    type: 'demo-booking',
    createdAt: { $gte: startDate, $lte: endDate },
  });

  const bookingCountsPromise = Booking.aggregate([
    {
      $match: {
        hall: { $in: targetHallIds },
        createdAt: { $gte: startDate, $lte: endDate },
      },
    },
    {
        $group: {
            _id: null,
            confirmed: { $sum: { $cond: [{ $eq: ['$status', 'confirmed'] }, 1, 0] } },
            cancelled: { $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] } },
            pending: { $sum: { $cond: [{ $eq: ['$paymentStatus', 'pending'] }, 1, 0] } }
        }
    }
  ]);

    // 3. Revenue Details
  const revenueByHallPromise = Booking.aggregate([
    {
      $match: {
        hall: { $in: hallIds }, // Always show for all halls
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
    hall: { $in: targetHallIds },
    createdAt: { $gte: startDate, $lte: endDate },
  })
    .populate('user', 'fullName email')
    .populate('hall', 'name')
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit);

  const totalBookingsCountPromise = Booking.countDocuments({
    hall: { $in: targetHallIds },
    createdAt: { $gte: startDate, $lte: endDate },
  });

  // 5. KPIs
  const busiestDaysPromise = Booking.aggregate([
        {
            $match: {
                hall: { $in: targetHallIds },
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

    // Repeat Booking Rate
    const customerBookingCountsPromise = Booking.aggregate([
        { $match: { hall: { $in: targetHallIds }, status: 'confirmed' } },
        { $group: { _id: '$user', count: { $sum: 1 } } }
    ]);

    // Occupancy Rate & Lead Time
    const confirmedBookingsForKpisPromise = Booking.find({
        hall: { $in: targetHallIds },
        status: 'confirmed',
        $or: [ // Find bookings that overlap with the date range
            { 'bookingDates.startTime': { $gte: startDate, $lte: endDate } },
            { 'bookingDates.endTime': { $gte: startDate, $lte: endDate } },
            { $and: [
                { 'bookingDates.startTime': { $lte: startDate } },
                { 'bookingDates.endTime': { $gte: endDate } }
            ]}
        ]
    }).select('bookingDates createdAt');

    // 6. Reservation Analytics
    const reservationAnalyticsPromise = Reservation.aggregate([
        {
            $match: {
                hall: { $in: targetHallIds },
                createdAt: { $gte: startDate, $lte: endDate }
            }
        },
        {
            $group: {
                _id: null,
                newReservations: { $sum: 1 },
                converted: { $sum: { $cond: [{ $eq: ['$status', 'CONVERTED'] }, 1, 0] } },
                expired: { $sum: { $cond: [{ $eq: ['$status', 'EXPIRED'] }, 1, 0] } }
            }
        }
    ]);


  const [
    revenueResult,
    totalViews,
    totalDemoBookings,
    bookingCountsResult,
    revenueByHall,
    recentBookings,
    totalBookingsCount,
    busiestDays,
    customerBookingCounts,
    confirmedBookingsForKpis,
    reservationAnalyticsResult
  ] = await Promise.all([
    totalRevenuePromise,
    totalViewsPromise,
    totalDemoBookingsPromise,
    bookingCountsPromise,
    revenueByHallPromise,
    recentBookingsPromise,
    totalBookingsCountPromise,
    busiestDaysPromise,
    customerBookingCountsPromise,
    confirmedBookingsForKpisPromise,
    reservationAnalyticsPromise
  ]);

  const totalRevenue = revenueResult[0]?.total || 0;
  const bookingCounts = bookingCountsResult[0] || { confirmed: 0, cancelled: 0, pending: 0 };


  const overallStats = {
    totalRevenue,
    totalViews,
    totalDemoBookings,
    totalBookings: {
      confirmed: bookingCounts.confirmed,
      cancelled: bookingCounts.cancelled,
      pending: bookingCounts.pending
    },
  };

    const totalConfirmedBookings = overallStats.totalBookings.confirmed;
    const conversionRate = totalViews > 0 ? (totalConfirmedBookings / totalViews) * 100 : 0;
    const averageBookingValue = totalConfirmedBookings > 0 ? totalRevenue / totalConfirmedBookings : 0;

    // map day number to day name
    const dayMapping = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const busiestDaysFormatted = busiestDays.map(day => ({
        day: dayMapping[day.day - 1],
        count: day.count
    }));

    // Calculate Repeat Booking Rate
    const repeatCustomers = customerBookingCounts.filter(c => c.count > 1).length;
    const totalCustomers = customerBookingCounts.length;
    const repeatBookingRate = totalCustomers > 0 ? (repeatCustomers / totalCustomers) * 100 : 0;

    // Calculate Occupancy Rate & Lead Time
    let totalBookedHours = 0;
    let totalLeadTimeDays = 0;
    let leadTimeBookingCount = 0;

    confirmedBookingsForKpis.forEach(booking => {
        let bookingContributesToLeadTime = false;
        booking.bookingDates.forEach(date => {
            const effectiveStartTime = Math.max(date.startTime, startDate);
            const effectiveEndTime = Math.min(date.endTime, endDate);

            if (effectiveEndTime > effectiveStartTime) {
                totalBookedHours += (effectiveEndTime - effectiveStartTime) / (1000 * 60 * 60);
                bookingContributesToLeadTime = true;
            }
        });

        if (bookingContributesToLeadTime) {
            const leadTime = (booking.bookingDates[0].startTime - booking.createdAt) / (1000 * 60 * 60 * 24);
            totalLeadTimeDays += leadTime;
            leadTimeBookingCount++;
        }
    });

    const numberOfDays = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
    let totalAvailableHours = 0;

    const targetHalls = specificHallId ? halls.filter(h => h._id.equals(specificHallId)) : halls;
    targetHalls.forEach(hall => {
        const dailyHours = (hall.closingHour || 24) - (hall.openingHour || 0);
        totalAvailableHours += dailyHours * numberOfDays;
    });

    const occupancyRate = totalAvailableHours > 0 ? (totalBookedHours / totalAvailableHours) * 100 : 0;
    const averageLeadTime = leadTimeBookingCount > 0 ? totalLeadTimeDays / leadTimeBookingCount : 0;
    const reservationAnalytics = reservationAnalyticsResult[0] || { newReservations: 0, converted: 0, expired: 0 };


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
                busiestDays: busiestDaysFormatted,
                repeatBookingRate: `${repeatBookingRate.toFixed(2)}%`,
                occupancyRate: `${occupancyRate.toFixed(2)}%`,
                averageBookingLeadTime: `${averageLeadTime.toFixed(1)} days`
            },
            reservationAnalytics: {
                new: reservationAnalytics.newReservations,
                converted: reservationAnalytics.converted,
                expired: reservationAnalytics.expired
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
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

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
    const hallsWithRecentBookingsPromise = Booking.find({
        status: 'confirmed',
        createdAt: { $gte: thirtyDaysAgo }
    }).distinct('hall');


    // Most Active Halls (complex logic, handle separately)
    const hallActivityPromise = Hall.aggregate([
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
        {
            $project: {
                name: 1,
                owner: 1,
                revenue: { $sum: '$bookings.totalPrice' },
                bookingCount: { $size: '$bookings' },
                viewCount: { $size: '$views' },
            }
        },
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
        { $sort: { score: -1 } },
        { $limit: 10 }
    ]);

    // 4. User Insights
    const topCustomersPromise = Booking.aggregate([
        { $match: { paymentStatus: 'paid', createdAt: { $gte: startDate, $lte: endDate } } },
        { $group: { _id: '$user', totalSpent: { $sum: '$totalPrice' } } },
        { $sort: { totalSpent: -1 } },
        { $skip: (page - 1) * limit },
        { $limit: limit },
        { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'userDetails' } },
        { $unwind: '$userDetails' },
        { $project: { _id: 0, userId: '$_id', fullName: '$userDetails.fullName', email: '$userDetails.email', totalSpent: 1 } }
    ]);

    const newSubscriptionsPromise = SubscriptionHistory.countDocuments({
        status: 'active',
        purchaseDate: { $gte: startDate, $lte: endDate }
    });

    const expiredSubscriptionsPromise = SubscriptionHistory.countDocuments({
        status: 'expired',
        expiryDate: { $gte: startDate, $lte: endDate }
    });

    const totalActiveSubscriptionsPromise = SubscriptionHistory.countDocuments({ status: 'active' });

    // 5. Reservation Analytics
    const reservationAnalyticsPromise = Reservation.aggregate([
        {
            $match: {
                createdAt: { $gte: startDate, $lte: endDate }
            }
        },
        {
            $group: {
                _id: null,
                newReservations: { $sum: 1 },
                converted: { $sum: { $cond: [{ $eq: ['$status', 'CONVERTED'] }, 1, 0] } },
                expired: { $sum: { $cond: [{ $eq: ['$status', 'EXPIRED'] }, 1, 0] } }
            }
        }
    ]);



    const [
        commissionResult,
        ownersWithActiveSubscription,
        hallsWithRecentBookings,
        mostActiveHalls,
        topCustomers,
        newSubscriptions,
        expiredSubscriptions,
        totalActiveSubscriptions,
        reservationAnalyticsResult
    ] = await Promise.all([
        commissionAnalyticsPromise,
        ownersWithActiveSubscriptionPromise,
        hallsWithRecentBookingsPromise,
        hallActivityPromise,
        topCustomersPromise,
        newSubscriptionsPromise,
        expiredSubscriptionsPromise,
        totalActiveSubscriptionsPromise,
        reservationAnalyticsPromise
    ]);

    const inactiveHallsData = await Hall.find({
        $or: [
            { owner: { $nin: ownersWithActiveSubscription } },
            { _id: { $nin: hallsWithRecentBookings } }
        ]
    }).populate('owner', 'fullName');

    const inactiveHalls = inactiveHallsData.map(hall => ({
        hallId: hall._id,
        hallName: hall.name,
        ownerName: hall.owner.fullName,
        reason: !ownersWithActiveSubscription.some(ownerId => ownerId.equals(hall.owner._id))
            ? 'No active subscription'
            : 'No recent bookings'
    }));


    await User.populate(mostActiveHalls, { path: 'owner', select: 'fullName email' });


    const totalBookingRevenue = currentPeriodRevenue.booking;
    const totalSubscriptionRevenue = currentPeriodRevenue.subscription;
    const commissionableRevenue = commissionResult[0]?.totalRevenue || 0;
    const totalCommission = commissionableRevenue * commissionRate;
    const reservationAnalytics = reservationAnalyticsResult[0] || { newReservations: 0, converted: 0, expired: 0 };

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
        userInsights: {
            topCustomers,
            subscriptionCounts: {
                new: newSubscriptions,
                expired: expiredSubscriptions,
                totalActive: totalActiveSubscriptions
            }
        },
        reservationAnalytics: {
            new: reservationAnalytics.newReservations,
            converted: reservationAnalytics.converted,
            expired: reservationAnalytics.expired
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
