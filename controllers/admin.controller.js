import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { User } from '../models/user.model.js';
import { ApiResponse } from '../utils/ApiResponse.js';

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

export { getHallOwnerApplications };