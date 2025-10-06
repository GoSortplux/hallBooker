import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/apiError.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { User } from '../models/user.model.js';

const getAllUsers = asyncHandler(async (req, res) => {
    const users = await User.find({});
    res.status(200).json(new ApiResponse(200, users, "Users fetched successfully."));
});

const getUserById = asyncHandler(async (req, res) => {
    const user = await User.findById(req.params.id);
    if (!user) throw new ApiError(404, "User not found");
    res.status(200).json(new ApiResponse(200, user, "User fetched successfully."));
});

const updateUser = asyncHandler(async (req, res) => {
    const { fullName, role } = req.body;
    const updatedUser = await User.findByIdAndUpdate(
        req.params.id, 
        { fullName, role }, 
        { new: true, runValidators: true }
    );
    if (!updatedUser) throw new ApiError(404, "User not found");
    res.status(200).json(new ApiResponse(200, updatedUser, "User updated successfully."));
});

const deleteUser = asyncHandler(async (req, res) => {
    const user = await User.findById(req.params.id);
    if (!user) throw new ApiError(404, "User not found");
    await user.deleteOne();
    res.status(200).json(new ApiResponse(200, {}, "User deleted successfully."));
});

const updateUserBankAccount = asyncHandler(async (req, res) => {
    const { bankName, accountNumber, accountName } = req.body;
    const userId = req.user._id;

    // TODO: Implement bank account verification here
    // For now, we will just save the details

    const updatedUser = await User.findByIdAndUpdate(
        userId,
        { bankName, accountNumber, accountName },
        { new: true, runValidators: true }
    );

    if (!updatedUser) {
        throw new ApiError(404, "User not found");
    }

    res.status(200).json(new ApiResponse(200, updatedUser, "Bank account details updated successfully."));
});

import { Venue } from '../models/venue.model.js';
import mongoose from 'mongoose';

const addStaff = asyncHandler(async (req, res) => {
  const { fullName, email, phone, password, venueIds } = req.body;
  const ownerId = req.user._id;

  const existingUser = await User.findOne({ $or: [{ email }, { phone }] });
  if (existingUser) {
    throw new ApiError(409, 'User with this email or phone already exists');
  }

  const staff = new User({
    fullName,
    email,
    phone,
    password,
    role: 'staff',
    owner: ownerId,
  });

  const createdStaff = await staff.save();

  if (venueIds && venueIds.length > 0) {
    await Venue.updateMany(
      { _id: { $in: venueIds }, owner: ownerId },
      { $addToSet: { staff: createdStaff._id } }
    );
  }

  res.status(201).json(new ApiResponse(201, createdStaff, 'Staff created successfully'));
});

const getMyStaff = asyncHandler(async (req, res) => {
  const ownerId = req.user._id;
  const staff = await User.find({ owner: ownerId });
  res.status(200).json(new ApiResponse(200, staff, 'Staff fetched successfully'));
});

const removeStaff = asyncHandler(async (req, res) => {
  const { staffId } = req.params;
  const ownerId = req.user._id;

  if (!mongoose.Types.ObjectId.isValid(staffId)) {
    throw new ApiError(400, 'Invalid staff ID');
  }

  const staff = await User.findOne({ _id: staffId, owner: ownerId });
  if (!staff) {
    throw new ApiError(404, 'Staff not found');
  }

  await Venue.updateMany({ owner: ownerId }, { $pull: { staff: staffId } });

  await User.findByIdAndDelete(staffId);

  res.status(200).json(new ApiResponse(200, {}, 'Staff removed successfully'));
});

export { 
    getAllUsers, 
    getUserById, 
    updateUser, 
    deleteUser,
    updateUserBankAccount,
    addStaff,
    getMyStaff,
    removeStaff
};