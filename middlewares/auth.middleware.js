import { User } from '../models/user.model.js';
import { ApiError } from '../utils/apiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import jwt from 'jsonwebtoken';

export const verifyJWT = asyncHandler(async (req, _, next) => {
  try {
    const token = req.cookies?.accessToken || req.header('Authorization')?.replace('Bearer ', '');
    if (!token) {
      throw new ApiError(401, 'Unauthorized request');
    }

    const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    const user = await User.findById(decodedToken?._id);

    if (!user) {
      throw new ApiError(401, 'Invalid Access Token');
    }

    req.user = user;
    next();
  } catch (error) {
    throw new ApiError(401, error?.message || 'Invalid access token');
  }
});

export const authorizeRoles = (...roles) => {
  return (req, _, next) => {
    if (!roles.includes(req.user.role)) {
      throw new ApiError(403, `Role: ${req.user.role} is not authorized to access this resource`);
    }
    next();
  };
};

import { Venue } from '../models/venue.model.js';
import mongoose from 'mongoose';

export const isEmailVerified = (req, _, next) => {
  if (!req.user.isEmailVerified) {
    throw new ApiError(403, 'Your email address is not verified. Please verify your email to access this resource.');
  }
  next();
};

export const authorizeVenueAccess = asyncHandler(async (req, _, next) => {
  const { id: venueId } = req.params;
  const user = req.user;

  if (user.role === 'super-admin') {
    return next();
  }

  if (!mongoose.Types.ObjectId.isValid(venueId)) {
    throw new ApiError(400, 'Invalid venue ID');
  }

  const venue = await Venue.findById(venueId);
  if (!venue) {
    throw new ApiError(404, 'Venue not found');
  }

  const isOwner = venue.owner.toString() === user._id.toString();
  const isStaff = venue.staff.some(staffId => staffId.toString() === user._id.toString());

  if (isOwner || isStaff) {
    return next();
  }

  throw new ApiError(403, 'You are not authorized to perform this action');
});