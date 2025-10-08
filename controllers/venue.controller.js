import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/apiError.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { Venue } from '../models/venue.model.js';
import geocoder from '../utils/geocoder.js';
import {
  uploadOnCloudinary,
  deleteFromCloudinary,
  generateUploadSignature,
} from '../config/cloudinary.js';

import sendEmail from '../services/email.service.js';
import { generateVenueCreationEmail } from '../utils/emailTemplates.js';


const createVenue = asyncHandler(async (req, res) => {
    const { name, location, capacity, description, pricing, ownerId } = req.body;
    const resolvedOwnerId = req.user.role === 'super-admin' ? ownerId : req.user._id;
    if (!resolvedOwnerId) throw new ApiError(400, "Venue owner must be specified.");

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

    const venue = await Venue.create({ name, location, geoLocation, capacity, description, pricing, owner: resolvedOwnerId });

    try {
        await sendEmail({
            email: req.user.email,
            subject: 'Your New Venue is Ready!',
            html: generateVenueCreationEmail(req.user.fullName, venue.name, venue.location),
        });
    } catch (emailError) {
        console.error(`Venue creation email failed for ${req.user.email}:`, emailError.message);
    }

    return res.status(201).json(new ApiResponse(201, venue, "Venue created successfully"));
});

const getAllVenues = asyncHandler(async (req, res) => {
    const venues = await Venue.find({}).populate('owner', 'fullName');
    return res.status(200).json(new ApiResponse(200, venues, "Venues fetched successfully"));
});

const getVenueById = asyncHandler(async (req, res) => {
    const venue = await Venue.findById(req.params.id).populate('owner', 'fullName email phone whatsappNumber');
    if (!venue) throw new ApiError(404, "Venue not found");
    return res.status(200).json(new ApiResponse(200, venue, "Venue details fetched successfully"));
});

const updateVenue = asyncHandler(async (req, res) => {
    const { location, allowRecurringBookings, recurringBookingDiscount, ...otherDetails } = req.body;

    const venue = await Venue.findById(req.params.id);
    if (!venue) {
        throw new ApiError(404, "Venue not found.");
    }

    // Handle location update
    if (location) {
        const geocodedData = await geocoder.geocode(location);
        if (!geocodedData.length) {
            throw new ApiError(400, 'Could not geocode the provided location. Please provide a valid address.');
        }
        venue.location = location;
        venue.geoLocation = {
            type: 'Point',
            coordinates: [geocodedData[0].longitude, geocodedData[0].latitude],
            address: geocodedData[0].formattedAddress,
        };
    }

    // Handle other details
    Object.assign(venue, otherDetails);

    // Handle recurring bookings settings
    if (allowRecurringBookings !== undefined) {
        if (typeof allowRecurringBookings !== 'boolean') {
            throw new ApiError(400, 'allowRecurringBookings must be a boolean.');
        }
        venue.allowRecurringBookings = allowRecurringBookings;
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
            venue.recurringBookingDiscount.percentage = percentage;
        }
        if (minBookings !== undefined) {
            if (!Number.isInteger(minBookings) || minBookings < 1) {
                throw new ApiError(400, 'Minimum bookings for discount must be a positive integer.');
            }
            venue.recurringBookingDiscount.minBookings = minBookings;
        }
    }

    const updatedVenue = await venue.save({ runValidators: true });

    return res.status(200).json(new ApiResponse(200, updatedVenue, "Venue updated successfully"));
});

const deleteVenue = asyncHandler(async (req, res) => {
    const venue = await Venue.findByIdAndDelete(req.params.id);
    if (!venue) {
        throw new ApiError(404, "Venue not found.");
    }
    return res.status(200).json(new ApiResponse(200, {}, "Venue deleted successfully"));
});

const addVenueMedia = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { imageUrl, videoUrl } = req.body;

  if (!imageUrl && !videoUrl) {
    throw new ApiError(400, 'Image or video URL is required.');
  }

  const venue = await Venue.findById(id);
  if (!venue) {
    throw new ApiError(404, 'Venue not found.');
  }

  if (imageUrl) {
    if (venue.images.length >= 6) {
      throw new ApiError(400, 'Cannot add more than 6 images.');
    }
    venue.images.push(imageUrl);
  }

  if (videoUrl) {
    venue.videos.push(videoUrl);
  }

  await venue.save({ validateBeforeSave: true });

  return res
    .status(200)
    .json(new ApiResponse(200, venue, 'Venue media added successfully.'));
});

const deleteVenueMedia = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { mediaUrl } = req.body;

  if (!mediaUrl) {
    throw new ApiError(400, 'Media URL is required for deletion.');
  }

  const venue = await Venue.findById(id);
  if (!venue) {
    throw new ApiError(404, 'Venue not found.');
  }

  const isVideo = venue.videos.includes(mediaUrl);
  if (isVideo && venue.videos.length === 1) {
    throw new ApiError(400, 'Cannot delete the last video.');
  }

  // This will attempt to delete from Cloudinary.
  // It will not throw an error if the deletion fails, but it will log the error.
  await deleteFromCloudinary(mediaUrl);

  const updateResult = await Venue.findByIdAndUpdate(
    id,
    { $pull: { images: mediaUrl, videos: mediaUrl } },
    { new: true }
  );

  return res
    .status(200)
    .json(new ApiResponse(200, updateResult, 'Venue media deleted successfully.'));
});

const getVenuesByOwner = asyncHandler(async (req, res) => {
    let query = {};
    if (req.user.role === 'venue-owner') {
        query = { owner: req.user._id };
    } else if (req.user.role === 'staff') {
        query = { staff: req.user._id };
    }
    const venues = await Venue.find(query).populate('owner', 'fullName');
    return res.status(200).json(new ApiResponse(200, venues, "Venues fetched successfully"));
});

const getRecommendedVenues = asyncHandler(async (req, res) => {
    const { longitude, latitude, radius } = req.query;

    if (!longitude || !latitude) {
        throw new ApiError(400, 'Longitude and latitude are required for recommendations.');
    }

    const maxDistance = (radius || 10) * 1000; // Default to 10km

    const venues = await Venue.find({
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

    return res.status(200).json(new ApiResponse(200, venues, "Recommended venues fetched successfully"));
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

  const venue = await Venue.findById(id);
  if (!venue) {
    throw new ApiError(404, 'Venue not found.');
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

  const existingBlockedDates = new Set(venue.blockedDates.map(d => d.getTime()));
  const newDatesToBlock = datesToBlock.filter(d => !existingBlockedDates.has(d.getTime()));

  if (newDatesToBlock.length > 0) {
    venue.blockedDates.push(...newDatesToBlock);
    await venue.save({ validateBeforeSave: true });
  }

  return res.status(200).json(new ApiResponse(200, venue, 'Reservation created successfully.'));
});

export {
    createVenue,
    getAllVenues,
    getVenueById,
    updateVenue,
    deleteVenue,
    addVenueMedia,
    deleteVenueMedia,
    getVenuesByOwner,
    getRecommendedVenues,
    generateCloudinarySignature,
    createReservation,
};
