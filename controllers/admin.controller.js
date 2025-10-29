import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/apiError.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { User } from '../models/user.model.js';
import { createNotification } from '../services/notification.service.js';

const getHallOwnerApplications = asyncHandler(async (req, res) => {
  const users = await User.find({ role: 'hall-owner', status: 'pending' }).select(
    'fullName email phone status'
  );

  if (!users || users.length === 0) {
    throw new ApiError(404, 'No pending hall owner applications found');
  }

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        users,
        'Pending hall owner applications retrieved successfully'
      )
    );
});

const approveHallOwnerApplication = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const io = req.app.get('io');

  const user = await User.findById(userId);
  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  user.status = 'approved';
  await user.save();

  // Notify hall owner
  createNotification(
    io,
    user._id.toString(),
    'Your hall owner application has been approved.'
  );

  // Notify admin
  const admin = await User.findOne({ role: 'super-admin' });
  if (admin) {
    createNotification(
      io,
      admin._id.toString(),
      `Hall owner application for ${user.fullName} has been approved.`
    );
  }

  return res
    .status(200)
    .json(new ApiResponse(200, {}, 'Hall owner application approved successfully'));
});

const rejectHallOwnerApplication = asyncHandler(async (req, res) => {
    const { userId } = req.params;
    const io = req.app.get('io');

    const user = await User.findById(userId);
    if (!user) {
      throw new ApiError(404, 'User not found');
    }

    user.status = 'rejected';
    await user.save();

    // Notify hall owner
    createNotification(
      io,
      user._id.toString(),
      'Your hall owner application has been rejected.'
    );

    // Notify admin
    const admin = await User.findOne({ role: 'super-admin' });
    if (admin) {
      createNotification(
        io,
        admin._id.toString(),
        `Hall owner application for ${user.fullName} has been rejected.`
      );
    }

    return res
      .status(200)
      .json(new ApiResponse(200, {}, 'Hall owner application rejected successfully'));
  });

export { getHallOwnerApplications, approveHallOwnerApplication, rejectHallOwnerApplication };