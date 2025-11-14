import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/apiError.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { User } from '../models/user.model.js';
import { createNotification } from '../services/notification.service.js';

const getHallOwnerApplications = asyncHandler(async (req, res) => {
  const users = await User.find({ 'hallOwnerApplication.status': 'pending' }).select(
    'fullName email phone hallOwnerApplication'
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

  user.hallOwnerApplication.status = 'approved';
  if (!user.role.includes('hall-owner')) {
    user.role.push('hall-owner');
  }
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
    const { rejectionReason } = req.body;
    const io = req.app.get('io');

    const user = await User.findById(userId);
    if (!user) {
      throw new ApiError(404, 'User not found');
    }

    user.hallOwnerApplication.status = 'rejected';
    user.hallOwnerApplication.rejectionReason = rejectionReason;
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

import Setting from '../models/setting.model.js';

// Controller to add a new payment method
const addPaymentMethod = asyncHandler(async (req, res) => {
  const { paymentMethod } = req.body;
  if (!paymentMethod) {
    throw new ApiError(400, 'Payment method is required');
  }

  const updatedSettings = await Setting.findOneAndUpdate(
    { key: 'paymentMethods' },
    { $addToSet: { value: paymentMethod } },
    { new: true, upsert: true }
  );

  return res.status(200).json(
    new ApiResponse(200, updatedSettings.value, 'Payment method added successfully')
  );
});

// Controller to remove a payment method
const removePaymentMethod = asyncHandler(async (req, res) => {
  const { paymentMethod } = req.body;
  if (!paymentMethod) {
    throw new ApiError(400, 'Payment method is required');
  }

  const updatedSettings = await Setting.findOneAndUpdate(
    { key: 'paymentMethods' },
    { $pull: { value: paymentMethod } },
    { new: true }
  );

  return res.status(200).json(
    new ApiResponse(200, updatedSettings.value, 'Payment method removed successfully')
  );
});

// Controller to add a new payment status
const addPaymentStatus = asyncHandler(async (req, res) => {
  const { paymentStatus } = req.body;
  if (!paymentStatus) {
    throw new ApiError(400, 'Payment status is required');
  }

  const updatedSettings = await Setting.findOneAndUpdate(
    { key: 'paymentStatuses' },
    { $addToSet: { value: paymentStatus } },
    { new: true, upsert: true }
  );

  return res.status(200).json(
    new ApiResponse(200, updatedSettings.value, 'Payment status added successfully')
  );
});

// Controller to remove a payment status
const removePaymentStatus = asyncHandler(async (req, res) => {
  const { paymentStatus } = req.body;
  if (!paymentStatus) {
    throw new ApiError(400, 'Payment status is required');
  }

  const updatedSettings = await Setting.findOneAndUpdate(
    { key: 'paymentStatuses' },
    { $pull: { value: paymentStatus } },
    { new: true }
  );

  return res.status(200).json(
    new ApiResponse(200, updatedSettings.value, 'Payment status removed successfully')
  );
});

export {
  getHallOwnerApplications,
  approveHallOwnerApplication,
  rejectHallOwnerApplication,
  addPaymentMethod,
  removePaymentMethod,
  addPaymentStatus,
  removePaymentStatus,
};