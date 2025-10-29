import jwt from 'jsonwebtoken';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/apiError.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { Hall } from '../models/hall.model.js';
import { User } from '../models/user.model.js';
import { Analytics } from '../models/analytics.model.js';
import { createNotification } from '../services/notification.service.js';
import geocoder from '../utils/geocoder.js';
import {
  uploadOnCloudinary,
  deleteFromCloudinary,
  generateUploadSignature,
} from '../config/cloudinary.js';

import sendEmail from '../services/email.service.js';
import { generateHallCreationEmail } from '../utils/emailTemplates.js';
import Setting from '../models/setting.model.js';


const toggleOnlineBooking = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const hall = await Hall.findById(id);

    if (!hall) {
        throw new ApiError(404, "Hall not found");
    }

    // Fetch settings with defaults
    const reactivationTimeSetting = await Setting.findOne({ key: 'onlineBookingReactivationTime' });
    const deactivationTimeSetting = await Setting.findOne({ key: 'onlineBookingDeactivationTime' });

    // Default reactivation time: 24 hours in minutes
    const reactivationTime = reactivationTimeSetting ? reactivationTimeSetting.value : 24 * 60;
    // Default deactivation time: 5 hours in minutes
    const deactivationTime = deactivationTimeSetting ? deactivationTimeSetting.value : 5 * 60;

    const now = new Date();

    // Trying to enable
    if (!hall.isOnlineBookingEnabled) {
        if (hall.onlineBookingDisableTime) {
            const canReactivateTime = new Date(hall.onlineBookingDisableTime.getTime() + reactivationTime * 60 * 1000);
            if (now < canReactivateTime) {
                throw new ApiError(400, `Online booking cannot be re-enabled until ${canReactivateTime.toLocaleString()}`);
            }
        }
        hall.isOnlineBookingEnabled = true;
        hall.onlineBookingEnableTime = now;
    }
    // Trying to disable
    else {
        if (hall.onlineBookingEnableTime) {
            const canDeactivateTime = new Date(hall.onlineBookingEnableTime.getTime() + deactivationTime * 60 * 1000);
            if (now < canDeactivateTime) {
                throw new ApiError(400, `Online booking cannot be disabled until ${canDeactivateTime.toLocaleString()}`);
            }
        }
        hall.isOnlineBookingEnabled = false;
        hall.onlineBookingDisableTime = now;
    }

    await hall.save({ validateBeforeSave: true });

    return res.status(200).json(new ApiResponse(200, hall, "Online booking status updated successfully"));
});


const createHall = asyncHandler(async (req, res) => {
    const { name, location, capacity, description, pricing, ownerId, facilities, carParkCapacity, hallSize } = req.body;
    const resolvedOwnerId = req.user.role === 'super-admin' ? ownerId : req.user._id;
    if (!resolvedOwnerId) throw new ApiError(400, "Hall owner must be specified.");

    // Validate pricing
    if (!pricing || (typeof pricing !== 'object') || (!pricing.dailyRate && !pricing.hourlyRate)) {
        throw new ApiError(400, 'Pricing information is required. Please provide at least a daily or hourly rate.');
    }
    
    const geocodedData = await geocoder.geocode(location);
    if (!geocodedData.length) {
        throw new ApiError(400, 'Could not geocode the provided location. Please provide a valid address.');
    }

    const geoLocation = {
        type: 'Point',
        coordinates: [geocodedData[0].longitude, geocodedData[0].latitude],
        address: geocodedData[0].formattedAddress,
    };

    const hall = await Hall.create({ name, location, geoLocation, capacity, description, pricing, owner: resolvedOwnerId, facilities, carParkCapacity, hallSize });

    try {
        const io = req.app.get('io');
        await sendEmail({
            io,
            email: req.user.email,
            subject: 'Your New Hall is Ready!',
            html: generateHallCreationEmail(req.user.fullName, hall.name, hall.location),
            notification: {
                recipient: req.user._id.toString(),
                message: `Your new hall, ${hall.name}, has been created successfully.`,
                link: `/halls/${hall._id}`,
            },
        });
    } catch (emailError) {
        console.error(`Hall creation email failed for ${req.user.email}:`, emailError.message);
    }

    const io = req.app.get('io');
    const admins = await User.find({ role: 'super-admin' });
    admins.forEach(admin => {
      createNotification(
        io,
        admin._id.toString(),
        `A new hall has been created: ${hall.name}.`,
        `/halls/${hall._id}`
      );
    });

    return res.status(201).json(new ApiResponse(201, hall, "Hall created successfully"));
});

const getAllHalls = asyncHandler(async (req, res) => {
    const halls = await Hall.find({}).populate('owner', 'fullName');
    return res.status(200).json(new ApiResponse(200, halls, "Halls fetched successfully"));
});

const getHallById = asyncHandler(async (req, res) => {
    const hall = await Hall.findById(req.params.id).populate('owner', 'fullName email phone whatsappNumber');
    if (!hall) throw new ApiError(404, "Hall not found");

    if (!hall.isOnlineBookingEnabled) {
        const hallData = hall.toObject();
        hallData.bookingMessage = "Online booking is currently unavailable — walk-in only.";
        return res.status(200).json(new ApiResponse(200, hallData, "Hall details fetched successfully"));
    }

    try {
        let userId = null;
        const token = req.cookies?.accessToken || req.headers.authorization?.split(' ')[1];
        if (token) {
            try {
                const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
                userId = decodedToken?._id;
            } catch (error) {
                // Invalid token, proceed as anonymous
            }
        }

        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date();
        endOfDay.setHours(23, 59, 59, 999);

        const analyticsQuery = {
            hall: req.params.id,
            type: 'view',
            ...(userId ? { user: userId } : { ipAddress: req.ip }),
            createdAt: { $gte: startOfDay, $lte: endOfDay },
        };

        const alreadyViewedToday = await Analytics.findOne(analyticsQuery);

        if (!alreadyViewedToday) {
            await Analytics.create({
                hall: req.params.id,
                type: 'view',
                ...(userId ? { user: userId } : { ipAddress: req.ip }),
            });
            hall.views += 1;
            await hall.save({ validateBeforeSave: false });
        }
    } catch (error) {
        console.error('Analytics view tracking failed:', error);
    }

    return res.status(200).json(new ApiResponse(200, hall, "Hall details fetched successfully"));
});

const updateHall = asyncHandler(async (req, res) => {
    const { location, allowRecurringBookings, recurringBookingDiscount, ...otherDetails } = req.body;

    const hall = await Hall.findById(req.params.id);
    if (!hall) {
        throw new ApiError(404, "Hall not found.");
    }

    // Handle location update
    if (location) {
        const geocodedData = await geocoder.geocode(location);
        if (!geocodedData.length) {
            throw new ApiError(400, 'Could not geocode the provided location. Please provide a valid address.');
        }
        hall.location = location;
        hall.geoLocation = {
            type: 'Point',
            coordinates: [geocodedData[0].longitude, geocodedData[0].latitude],
            address: geocodedData[0].formattedAddress,
        };
    }

    // Handle other details
    Object.assign(hall, otherDetails);

    // Handle recurring bookings settings
    if (allowRecurringBookings !== undefined) {
        if (typeof allowRecurringBookings !== 'boolean') {
            throw new ApiError(400, 'allowRecurringBookings must be a boolean.');
        }
        hall.allowRecurringBookings = allowRecurringBookings;
    }

    if (recurringBookingDiscount) {
        if (typeof recurringBookingDiscount !== 'object' || recurringBookingDiscount === null) {
            throw new ApiError(400, 'recurringBookingDiscount must be an object.');
        }
        const { percentage, minBookings } = recurringBookingDiscount;
        if (percentage !== undefined) {
            if (typeof percentage !== 'number' || percentage < 0 || percentage > 100) {
                throw new ApiError(400, 'Discount percentage must be a number between 0 and 100.');
            }
            hall.recurringBookingDiscount.percentage = percentage;
        }
        if (minBookings !== undefined) {
            if (!Number.isInteger(minBookings) || minBookings < 1) {
                throw new ApiError(400, 'Minimum bookings for discount must be a positive integer.');
            }
            hall.recurringBookingDiscount.minBookings = minBookings;
        }
    }

    const updatedHall = await hall.save({ runValidators: true });

    return res.status(200).json(new ApiResponse(200, updatedHall, "Hall updated successfully"));
});

const deleteHall = asyncHandler(async (req, res) => {
    const hall = await Hall.findByIdAndDelete(req.params.id);
    if (!hall) {
        throw new ApiError(404, "Hall not found.");
    }
    return res.status(200).json(new ApiResponse(200, {}, "Hall deleted successfully"));
});

const addHallMedia = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { imageUrl, videoUrl } = req.body;

  if (!imageUrl && !videoUrl) {
    throw new ApiError(400, 'Image or video URL is required.');
  }

  const hall = await Hall.findById(id);
  if (!hall) {
    throw new ApiError(404, 'Hall not found.');
  }

  if (imageUrl) {
    if (hall.images.length >= 6) {
      throw new ApiError(400, 'Cannot add more than 6 images.');
    }
    hall.images.push(imageUrl);
  }

  if (videoUrl) {
    hall.videos.push(videoUrl);
  }

  await hall.save({ validateBeforeSave: true });

  return res
    .status(200)
    .json(new ApiResponse(200, hall, 'Hall media added successfully.'));
});

const deleteHallMedia = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { mediaUrl } = req.body;

  if (!mediaUrl) {
    throw new ApiError(400, 'Media URL is required for deletion.');
  }

  const hall = await Hall.findById(id);
  if (!hall) {
    throw new ApiError(404, 'Hall not found.');
  }

  const isVideo = hall.videos.includes(mediaUrl);
  if (isVideo && hall.videos.length === 1) {
    throw new ApiError(400, 'Cannot delete the last video.');
  }

  // This will attempt to delete from Cloudinary.
  // It will not throw an error if the deletion fails, but it will log the error.
  await deleteFromCloudinary(mediaUrl);

  const updateResult = await Hall.findByIdAndUpdate(
    id,
    { $pull: { images: mediaUrl, videos: mediaUrl } },
    { new: true }
  );

  return res
    .status(200)
    .json(new ApiResponse(200, updateResult, 'Hall media deleted successfully.'));
});

const getHallsByOwner = asyncHandler(async (req, res) => {
    let query = {};
    if (req.user.role === 'hall-owner') {
        query = { owner: req.user._id };
    } else if (req.user.role === 'staff') {
        query = { staff: req.user._id };
    }
    const halls = await Hall.find(query).populate('owner', 'fullName');
    return res.status(200).json(new ApiResponse(200, halls, "Halls fetched successfully"));
});

const getRecommendedHalls = asyncHandler(async (req, res) => {
    const { longitude, latitude, radius } = req.query;

    if (!longitude || !latitude) {
        throw new ApiError(400, 'Longitude and latitude are required for recommendations.');
    }

    const maxDistance = (radius || 10) * 1000; // Default to 10km

    const halls = await Hall.find({
        geoLocation: {
            $near: {
                $geometry: {
                    type: 'Point',
                    coordinates: [parseFloat(longitude), parseFloat(latitude)],
                },
                $maxDistance: maxDistance,
            },
        },
    });

    return res.status(200).json(new ApiResponse(200, halls, "Recommended halls fetched successfully"));
});

const generateCloudinarySignature = asyncHandler(async (req, res) => {
  const { timestamp, signature } = generateUploadSignature();

  res.status(200).json(
    new ApiResponse(
      200,
      {
        timestamp,
        signature,
        cloudname: process.env.CLOUDINARY_CLOUD_NAME,
        apikey: process.env.CLOUDINARY_API_KEY,
      },
      'Cloudinary signature generated successfully.'
    )
  );
});

const createReservation = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { reservationPattern, startDate, endDate, year, month, week, days } = req.body;

  const hall = await Hall.findById(id);
  if (!hall) {
    throw new ApiError(404, 'Hall not found.');
  }

  let datesToBlock = [];

  switch (reservationPattern) {
    case 'date-range':
      if (!startDate || !endDate) {
        throw new ApiError(400, 'Start date and end date are required for a date range reservation.');
      }
      const start = new Date(startDate);
      const end = new Date(endDate);
      let currentDate = new Date(start);
      while (currentDate <= end) {
        datesToBlock.push(new Date(currentDate.setUTCHours(0, 0, 0, 0)));
        currentDate.setDate(currentDate.getDate() + 1);
      }
      break;

    case 'full-week':
      if (!year || !month || !week) {
        throw new ApiError(400, 'Year, month, and week are required for a full week reservation.');
      }
      const firstDayOfMonth = new Date(Date.UTC(year, month - 1, 1));
      const firstDayOfWeek = new Date(firstDayOfMonth);
      firstDayOfWeek.setUTCDate(firstDayOfWeek.getUTCDate() + (week - 1) * 7);

      for (let i = 0; i < 7; i++) {
        const day = new Date(firstDayOfWeek);
        day.setUTCDate(day.getUTCDate() + i);
        datesToBlock.push(day);
      }
      break;

    case 'full-month':
      if (!year || !month) {
        throw new ApiError(400, 'Year and month are required for a full month reservation.');
      }
      const firstDay = new Date(Date.UTC(year, month - 1, 1));
      const lastDay = new Date(Date.UTC(year, month, 0));
      let currentMonthDay = new Date(firstDay);
      while (currentMonthDay <= lastDay) {
        datesToBlock.push(new Date(currentMonthDay));
        currentMonthDay.setUTCDate(currentMonthDay.getUTCDate() + 1);
      }
      break;

    case 'specific-days':
      if (!year || !month || !days || !Array.isArray(days) || days.length === 0) {
        throw new ApiError(400, 'Year, month, and an array of days are required for this reservation type.');
      }
      const firstDayInMonth = new Date(Date.UTC(year, month - 1, 1));
      const lastDayInMonth = new Date(Date.UTC(year, month, 0));
      let currentDay = new Date(firstDayInMonth);
      while (currentDay <= lastDayInMonth) {
        if (days.includes(currentDay.getUTCDay())) {
          datesToBlock.push(new Date(currentDay));
        }
        currentDay.setUTCDate(currentDay.getUTCDate() + 1);
      }
      break;

    default:
      throw new ApiError(400, 'Invalid reservation pattern provided.');
  }

  const existingBlockedDates = new Set(hall.blockedDates.map(d => d.getTime()));
  const newDatesToBlock = datesToBlock.filter(d => !existingBlockedDates.has(d.getTime()));

  if (newDatesToBlock.length > 0) {
    hall.blockedDates.push(...newDatesToBlock);
    await hall.save({ validateBeforeSave: true });
  }

  return res.status(200).json(new ApiResponse(200, hall, 'Reservation created successfully.'));
});

const bookDemo = asyncHandler(async (req, res) => {
    const hallId = req.params.id;

    const hallExists = await Hall.findById(hallId);
    if (!hallExists) {
        throw new ApiError(404, "Hall not found");
    }

    let userId = null;
    const token = req.cookies?.accessToken || req.headers.authorization?.split(' ')[1];
    if (token) {
        try {
            const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
            userId = decodedToken?._id;
        } catch (error) {
            // Invalid token, proceed as anonymous
        }
    }

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const analyticsQuery = {
        hall: hallId,
        type: 'demo-booking',
        ...(userId ? { user: userId } : { ipAddress: req.ip }),
        createdAt: { $gte: startOfDay, $lte: endOfDay },
    };

    const alreadyClickedToday = await Analytics.findOne(analyticsQuery);

    if (!alreadyClickedToday) {
        try {
            await Analytics.create({
                hall: hallId,
                type: 'demo-booking',
                ...(userId ? { user: userId } : { ipAddress: req.ip }),
            });
            await Hall.findByIdAndUpdate(hallId, { $inc: { demoBookings: 1 } });
        } catch (error) {
            console.error('Analytics demo booking tracking failed:', error);
        }
    }

    const hallWithContact = await Hall.findById(hallId).populate('owner', 'phone whatsappNumber');

    const ownerContact = {
        phone: hallWithContact.owner?.phone,
        whatsappNumber: hallWithContact.owner?.whatsappNumber,
    };

    return res.status(200).json(new ApiResponse(200, ownerContact, "Owner contact details fetched successfully."));
});

export {
    toggleOnlineBooking,
    createHall,
    getAllHalls,
    getHallById,
    updateHall,
    deleteHall,
    addHallMedia,
    deleteHallMedia,
    getHallsByOwner,
    getRecommendedHalls,
    generateCloudinarySignature,
    createReservation,
    bookDemo,
};