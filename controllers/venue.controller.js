import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/apiError.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { Venue } from '../models/venue.model.js';

import sendEmail from '../services/email.service.js';
import { generateVenueCreationEmail } from '../utils/emailTemplates.js';

const createVenue = asyncHandler(async (req, res) => {
    const { name, location, capacity, description, pricing, ownerId } = req.body;
    const resolvedOwnerId = req.user.role === 'super-admin' ? ownerId : req.user._id;
    if (!resolvedOwnerId) throw new ApiError(400, "Venue owner must be specified.");

    
    const venue = await Venue.create({ name, location, capacity, description, pricing, owner: resolvedOwnerId });

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
    const venue = await Venue.findById(req.params.id).populate('owner', 'fullName email');
    if (!venue) throw new ApiError(404, "Venue not found");
    return res.status(200).json(new ApiResponse(200, venue, "Venue details fetched successfully"));
});

const updateVenue = asyncHandler(async (req, res) => {
    const venue = await Venue.findById(req.params.id);
    if (!venue) throw new ApiError(404, "Venue not found");

    if (venue.owner.toString() !== req.user._id.toString() && req.user.role !== 'super-admin') {
        throw new ApiError(403, "You are not authorized to update this venue.");
    }

    const updatedVenue = await Venue.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    return res.status(200).json(new ApiResponse(200, updatedVenue, "Venue updated successfully"));
});

const deleteVenue = asyncHandler(async (req, res) => {
    const venue = await Venue.findById(req.params.id);
    if (!venue) throw new ApiError(404, "Venue not found");

    if (venue.owner.toString() !== req.user._id.toString() && req.user.role !== 'super-admin') {
        throw new ApiError(403, "You are not authorized to delete this venue.");
    }

    await venue.deleteOne();
    return res.status(200).json(new ApiResponse(200, {}, "Venue deleted successfully"));
});

const updateVenueMedia = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const venue = await Venue.findById(id);

    if (!venue) {
        throw new ApiError(404, "Venue not found");
    }

    // Authorization check
    if (venue.owner.toString() !== req.user._id.toString() && req.user.role !== 'super-admin') {
        throw new ApiError(403, "You are not authorized to update this venue's media.");
    }

    const imageUploadPromises = [];
    if (req.files?.images?.length) {
        req.files.images.forEach(file => {
            imageUploadPromises.push(uploadOnCloudinary(file.path));
        });
    }

    const videoUploadPromises = [];
    if (req.files?.videos?.length) {
        req.files.videos.forEach(file => {
            videoUploadPromises.push(uploadOnCloudinary(file.path));
        });
    }

    const imageUploadResponses = await Promise.all(imageUploadPromises);
    const videoUploadResponses = await Promise.all(videoUploadPromises);

    const imageUrls = imageUploadResponses.map(res => res?.secure_url).filter(Boolean);
    const videoUrls = videoUploadResponses.map(res => res?.secure_url).filter(Boolean);

    if (imageUrls.length) {
        venue.images.push(...imageUrls);
    }
    if (videoUrls.length) {
        venue.videos.push(...videoUrls);
    }

    await venue.save();

    return res.status(200).json(new ApiResponse(200, venue, "Venue media updated successfully"));
});

const deleteVenueMedia = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { imageUrls, videoUrls } = req.body;

    if (!imageUrls?.length && !videoUrls?.length) {
        throw new ApiError(400, "No media URLs provided for deletion.");
    }

    const venue = await Venue.findById(id);
    if (!venue) {
        throw new ApiError(404, "Venue not found");
    }

    // Authorization check
    if (venue.owner.toString() !== req.user._id.toString() && req.user.role !== 'super-admin') {
        throw new ApiError(403, "You are not authorized to delete this venue's media.");
    }

    const deletionPromises = [];
    if (imageUrls?.length) {
        imageUrls.forEach(url => deletionPromises.push(deleteFromCloudinary(url)));
    }
    if (videoUrls?.length) {
        videoUrls.forEach(url => deletionPromises.push(deleteFromCloudinary(url)));
    }

    await Promise.all(deletionPromises);

    // Now, remove the URLs from the database
    const updateResult = await Venue.findByIdAndUpdate(id, {
        $pull: {
            images: { $in: imageUrls || [] },
            videos: { $in: videoUrls || [] }
        }
    }, { new: true });

    return res.status(200).json(new ApiResponse(200, updateResult, "Venue media deleted successfully"));
});


export { 
    createVenue, 
    getAllVenues, 
    getVenueById, 
    updateVenue, 
    deleteVenue,
    updateVenueMedia,
    deleteVenueMedia
};