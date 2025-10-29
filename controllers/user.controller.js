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
import sendEmail from '../services/email.service.js';
import {
    generateHallOwnerApplicationEmailForUser,
    generateHallOwnerApplicationEmailForAdmin,
    generateHallOwnerApprovalEmailForUser,
    generateHallOwnerRejectionEmailForUser,
    generateHallOwnerCreationEmailForUser,
    generatePromotionToHallOwnerEmailForUser,
} from '../utils/emailTemplates.js';

const reviewHallOwnerApplication = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { action, rejectionReason } = req.body;

    if (!['approve', 'reject'].includes(action)) {
        throw new ApiError(400, 'Invalid action specified. Must be "approve" or "reject".');
    }

    const user = await User.findById(id);

    if (!user) {
        throw new ApiError(404, 'User not found');
    }

    if (user.status !== 'pending') {
        throw new ApiError(400, 'This application is not pending review.');
    }

    if (action === 'approve') {
        user.status = 'approved';
        user.role = 'hall-owner';
        user.rejectionReason = undefined;
        await user.save({ validateBeforeSave: false });

        const userEmailHtml = generateHallOwnerApprovalEmailForUser(user.fullName);
        const io = req.app.get('io');
        await sendEmail({
            io,
            email: user.email,
            subject: 'Application Approved!',
            html: userEmailHtml,
            notification: {
                recipient: user._id.toString(),
                message: 'Your application to become a hall owner has been approved.',
            },
        });

        res.status(200).json(new ApiResponse(200, {}, "User's application has been approved."));
    } else if (action === 'reject') {
        if (!rejectionReason) {
            throw new ApiError(400, 'Rejection reason is required when rejecting an application.');
        }
        user.status = 'rejected';
        user.rejectionReason = rejectionReason;
        await user.save({ validateBeforeSave: false });

        const userEmailHtml = generateHallOwnerRejectionEmailForUser(user.fullName, rejectionReason);
        const io = req.app.get('io');
        await sendEmail({
            io,
            email: user.email,
            subject: 'Application Status Update',
            html: userEmailHtml,
            notification: {
                recipient: user._id.toString(),
                message: 'Your application to become a hall owner has been rejected.',
            },
        });

        res.status(200).json(new ApiResponse(200, {}, "User's application has been rejected."));
    }
});

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

const applyHallOwner = asyncHandler(async (req, res) => {
    const { hasReadTermsOfService } = req.body;

    if (!hasReadTermsOfService) {
        throw new ApiError(400, 'You must read and agree to the terms of service to become a hall owner.');
    }

    const userId = req.user._id;
    const user = await User.findById(userId);

    if (user.status === 'pending') {
        throw new ApiError(400, 'You have already applied to be a hall owner. Your application is pending review.');
    }

    if (user.status === 'approved') {
        throw new ApiError(400, 'Your application has already been approved.');
    }

    if (user.status === 'rejected') {
        user.rejectionReason = undefined;
    }

    user.status = 'pending';
    user.hasReadTermsOfService = true;
    await user.save({ validateBeforeSave: false });

    // Send email notifications
    const io = req.app.get('io');
    const userEmailHtml = generateHallOwnerApplicationEmailForUser(user.fullName);
    await sendEmail({
        io,
        email: user.email,
        subject: 'Application to Become a Hall Owner Received',
        html: userEmailHtml,
        notification: {
            recipient: user._id.toString(),
            message: 'Your application to become a hall owner has been received.',
        },
    });

    const superAdmins = await User.find({ role: 'super-admin' });
    for (const admin of superAdmins) {
        const adminEmailHtml = generateHallOwnerApplicationEmailForAdmin(user.fullName, user.email);
        await sendEmail({
            io,
            email: admin.email,
            subject: 'New Hall Owner Application',
            html: adminEmailHtml,
            notification: {
                recipient: admin._id.toString(),
                message: `A new hall owner application has been submitted by ${user.fullName}.`,
            },
        });
    }

    res.status(200).json(new ApiResponse(200, {}, "Your application to become a hall owner has been submitted successfully."));
});

export { 
    getAllUsers, 
    getUserById, 
    updateUser, 
    deleteUser,
    updateUserBankAccount,
    addStaff,
    getMyStaff,
    removeStaff,
    applyHallOwner,
    createHallOwner,
    approveHallOwner,
    promoteToHallOwner,
    reviewHallOwnerApplication
};

const createHallOwner = asyncHandler(async (req, res) => {
    const { fullName, email, phone, password } = req.body;

    const existingUser = await User.findOne({ $or: [{ email }, { phone }] });
    if (existingUser) {
        throw new ApiError(409, 'User with this email or phone already exists');
    }

    const user = new User({
        fullName,
        email,
        phone,
        password,
        role: 'hall-owner',
        status: 'approved',
    });

    await user.save();

    const io = req.app.get('io');
    const userEmailHtml = generateHallOwnerCreationEmailForUser(user.fullName, password);
    await sendEmail({
        io,
        email: user.email,
        subject: 'Welcome to HallBooker!',
        html: userEmailHtml,
        notification: {
            recipient: user._id.toString(),
            message: 'A new hall owner account has been created for you.',
        },
    });

    res.status(201).json(new ApiResponse(201, user, "Hall owner created successfully."));
});

const approveHallOwner = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const user = await User.findById(id);

    if (!user) {
        throw new ApiError(404, 'User not found');
    }

    if (user.status !== 'pending') {
        throw new ApiError(400, 'User has not applied to be a hall owner.');
    }

    user.status = 'approved';
    user.role = 'hall-owner';
    await user.save({ validateBeforeSave: false });

    const io = req.app.get('io');
    const userEmailHtml = generateHallOwnerApprovalEmailForUser(user.fullName);
    await sendEmail({
        io,
        email: user.email,
        subject: 'Application Approved!',
        html: userEmailHtml,
        notification: {
            recipient: user._id.toString(),
            message: 'Your application to become a hall owner has been approved.',
        },
    });

    res.status(200).json(new ApiResponse(200, {}, "User's application to become a hall owner has been approved."));
});

const promoteToHallOwner = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const user = await User.findById(id);

    if (!user) {
        throw new ApiError(404, 'User not found');
    }

    if (user.role === 'hall-owner') {
        throw new ApiError(400, 'User is already a hall owner.');
    }

    user.role = 'hall-owner';
    user.status = 'approved';
    await user.save({ validateBeforeSave: false });

    const io = req.app.get('io');
    const userEmailHtml = generatePromotionToHallOwnerEmailForUser(user.fullName);
    await sendEmail({
        io,
        email: user.email,
        subject: 'You have been promoted!',
        html: userEmailHtml,
        notification: {
            recipient: user._id.toString(),
            message: 'You have been promoted to a hall owner.',
        },
    });

    res.status(200).json(new ApiResponse(200, {}, "User has been promoted to a hall owner."));
});