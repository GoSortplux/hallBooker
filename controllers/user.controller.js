import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/apiError.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { User } from '../models/user.model.js';
import { Hall } from '../models/hall.model.js';
import mongoose from 'mongoose';
import {
    createSubAccount as createMonnifySubAccount,
    updateSubAccount as updateMonnifySubAccount,
    getBanks,
} from '../services/payment.service.js';
import { SubAccount } from '../models/subaccount.model.js';

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

    const user = await User.findById(userId);
    if (!user) {
        throw new ApiError(404, "User not found");
    }

    user.bankName = bankName;
    user.accountNumber = accountNumber;
    user.accountName = accountName;
    await user.save();

    if (user.role === 'hall-owner') {
        const banks = await getBanks();
        const bank = banks.find(b => b.name.toLowerCase() === bankName.toLowerCase());

        if (!bank) {
            throw new ApiError(400, "Invalid bank name provided.");
        }

        const subAccountData = {
            accountName,
            accountNumber,
            bankCode: bank.code,
            email: user.email,
            currencyCode: 'NGN'
        };

        let subAccount = await SubAccount.findOne({ user: userId });

        if (subAccount) {
            // Update existing sub-account
            const updatedMonnifySubAccount = await updateMonnifySubAccount(subAccount.subAccountCode, subAccountData);
            subAccount.bankName = updatedMonnifySubAccount.bankName;
            subAccount.accountNumber = updatedMonnifySubAccount.accountNumber;
            subAccount.accountName = updatedMonnifySubAccount.accountName;
            await subAccount.save();
        } else {
            // Create new sub-account
            const monnifyResponse = await createMonnifySubAccount(subAccountData);
            if (!monnifyResponse || !monnifyResponse.subAccountCode) {
                throw new ApiError(500, 'Failed to create sub-account with payment provider.');
            }
            subAccount = await SubAccount.create({
                user: userId,
                subAccountCode: monnifyResponse.subAccountCode,
                bankName: monnifyResponse.bankName,
                accountNumber: monnifyResponse.accountNumber,
                accountName: monnifyResponse.accountName,
            });
        }
    }

    res.status(200).json(new ApiResponse(200, user, "Bank account details updated successfully."));
});

const addStaff = asyncHandler(async (req, res) => {
  const { fullName, email, phone, password, hallIds } = req.body;
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

  if (hallIds && hallIds.length > 0) {
    await Hall.updateMany(
      { _id: { $in: hallIds }, owner: ownerId },
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

  await Hall.updateMany({ owner: ownerId }, { $pull: { staff: staffId } });

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