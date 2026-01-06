import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/apiError.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { createSubAccount as createMonnifySubAccount } from '../services/payment.service.js';
import { SubAccount } from '../models/subaccount.model.js';
import { User } from '../models/user.model.js';

const getSubAccounts = asyncHandler(async (req, res) => {
  const subAccounts = await SubAccount.find().populate('user', 'firstName lastName email');

  return res
    .status(200)
    .json(new ApiResponse(200, subAccounts, 'Sub-accounts retrieved successfully.'));
});

const createSubAccount = asyncHandler(async (req, res) => {
  const { userId, defaultSplitPercentage = 100 } = req.body;

  const user = await User.findById(userId);
  if (!user || !user.role.includes('hall-owner')) {
    throw new ApiError(404, 'Hall owner not found.');
  }

  if (!user.accountNumber || !user.bankCode || !user.accountName) {
    throw new ApiError(400, 'User has no bank details saved. Please ask the hall owner to add their bank details first.');
  }

  const existingSubAccount = await SubAccount.findOne({ user: userId });
  if (existingSubAccount) {
    throw new ApiError(400, 'Sub-account already exists for this user.');
  }

  const monnifyResponse = await createMonnifySubAccount({
    accountName: user.accountName,
    accountNumber: user.accountNumber,
    bankCode: user.bankCode,
    currencyCode: 'NGN',
    email: user.email,
    defaultSplitPercentage: String(defaultSplitPercentage),
  });

  if (!monnifyResponse || !monnifyResponse.subAccountCode) {
    throw new ApiError(500, 'Failed to create sub-account with payment provider.');
  }

  const newSubAccount = await SubAccount.create({
    user: userId,
    subAccountCode: monnifyResponse.subAccountCode,
    bankName: monnifyResponse.bankName,
    accountNumber: monnifyResponse.accountNumber,
    accountName: monnifyResponse.accountName,
  });

  return res
    .status(201)
    .json(new ApiResponse(201, newSubAccount, 'Sub-account created successfully.'));
});

export { createSubAccount, getSubAccounts };