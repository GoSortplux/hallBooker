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
    const { location, ...otherDetails } = req.body;

    if (location) {
        const geocodedData = await geocoder.geocode(location);
        if (!geocodedData.length) {
            throw new ApiError(400, 'Could not geocode the provided location. Please provide a valid address.');
        }
        otherDetails.location = location;
        otherDetails.geoLocation = {
            type: 'Point',
            coordinates: [geocodedData[0].longitude, geocodedData[0].latitude],
            address: geocodedData[0].formattedAddress,
        };
    }

    const updatedVenue = await Venue.findByIdAndUpdate(req.params.id, otherDetails, { new: true, runValidators: true });
    if (!updatedVenue) {
        throw new ApiError(404, "Venue not found.");
    }
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

const replaceVenueMedia = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { oldMediaUrl, newMediaUrl } = req.body;

  if (!oldMediaUrl || !newMediaUrl) {
    throw new ApiError(400, 'Old and new media URLs are required.');
  }

  const venue = await Venue.findById(id);
  if (!venue) {
    throw new ApiError(404, 'Venue not found.');
  }

  const isImage = venue.images.includes(oldMediaUrl);
  const isVideo = venue.videos.includes(oldMediaUrl);

  if (!isImage && !isVideo) {
    throw new ApiError(404, 'The media to be replaced was not found.');
  }

  // Delete the old media from Cloudinary
  await deleteFromCloudinary(oldMediaUrl);

  // Atomically find and update the URL in the correct array
  let updateQuery;
  if (isImage) {
    updateQuery = { $set: { 'images.$[elem]': newMediaUrl } };
  } else {
    updateQuery = { $set: { 'videos.$[elem]': newMediaUrl } };
  }

  const arrayFilters = [{ elem: oldMediaUrl }];

  const updatedVenue = await Venue.findOneAndUpdate(
    { _id: id },
    updateQuery,
    { arrayFilters, new: true }
  );

  return res
    .status(200)
    .json(new ApiResponse(200, updatedVenue, 'Venue media replaced successfully.'));
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
  const { folder, public_id } = req.body;

  if (!folder) {
    throw new ApiError(400, 'Folder name is required.');
  }

  const { timestamp, signature } = generateUploadSignature(folder, public_id);

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
    replaceVenueMedia,
    getVenuesByOwner,
    generateCloudinarySignature,
};