import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/apiError.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { Venue } from '../models/venue.model.js';

const createVenue = asyncHandler(async (req, res) => {
    const { name, location, capacity, description, pricing, ownerId } = req.body;
    const resolvedOwnerId = req.user.role === 'super-admin' ? ownerId : req.user._id;
    if (!resolvedOwnerId) throw new ApiError(400, "Venue owner must be specified.");
    
    const venue = await Venue.create({ name, location, capacity, description, pricing, owner: resolvedOwnerId });
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

export { createVenue, getAllVenues, getVenueById, updateVenue, deleteVenue };