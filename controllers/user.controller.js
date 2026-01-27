import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/apiError.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { User } from '../models/user.model.js';
import { Hall } from '../models/hall.model.js';
import Notification from '../models/notification.model.js';
import mongoose from 'mongoose';
import {
    validateBankAccount as validateBankAccountService,
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
    generateStaffAdditionEmail,
    generateStaffRemovalEmail
} from '../utils/emailTemplates.js';
import { getCompanyName } from '../utils/settings.js';

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
    const { accountNumber, bankCode } = req.body;
    const userId = req.user._id;

    if (!accountNumber || !bankCode) {
        throw new ApiError(400, "Account number and bank code are required.");
    }

    const accountDetails = await validateBankAccountService(accountNumber, bankCode);

    if (!accountDetails || !accountDetails.accountName) {
        throw new ApiError(400, "Invalid account details provided. Please check the account number and bank and try again.");
    }

    const user = await User.findByIdAndUpdate(
        userId,
        {
            $set: {
                accountNumber: accountDetails.accountNumber,
                accountName: accountDetails.accountName,
                bankCode: bankCode,
            }
        },
        { new: true, runValidators: true }
    );

    if (!user) {
        throw new ApiError(404, "User not found");
    }

    res.status(200).json(new ApiResponse(200, user, "Bank account details updated successfully."));
});

const addStaff = asyncHandler(async (req, res) => {
	const { fullName, email, phone, password, hallIds } = req.body;
	const ownerId = req.user._id;

	let staff = await User.findOne({ $or: [{ email }, { phone }] });

	if (staff) {
		// Existing user
		if (!staff.role.includes('staff')) {
			staff.role.push('staff');
		}
		if (!staff.owners.includes(ownerId)) {
			staff.owners.push(ownerId);
		}
		await staff.save({ validateBeforeSave: false });
	} else {
		// New user
		if (!password) {
			throw new ApiError(400, 'Password is required for new staff members.');
		}
		staff = new User({
			fullName,
			email,
			phone,
			password,
			role: ['staff'],
			owners: [ownerId],
		});
		await staff.save();
	}

	let halls = [];
	if (hallIds && hallIds.length > 0) {
		await Hall.updateMany({ _id: { $in: hallIds }, owner: ownerId }, { $addToSet: { staff: staff._id } });
		halls = await Hall.find({ _id: { $in: hallIds } }).select('name location');
	}

	const io = req.app.get('io');
	const companyName = await getCompanyName();
	const emailHtml = generateStaffAdditionEmail(staff.fullName, req.user.fullName, halls, companyName);
	const notificationMessage = `You have been added as a staff member by ${req.user.fullName}.`;
	await Notification.create({
		recipient: staff._id,
		message: notificationMessage,
	});
	await sendEmail({
		io,
		email: staff.email,
		subject: 'You have been added as a staff member!',
		html: emailHtml,
		notification: {
			recipient: staff._id.toString(),
			message: notificationMessage,
		},
	});

	res.status(201).json(new ApiResponse(201, staff, 'Staff added successfully'));
});

const getMyStaff = asyncHandler(async (req, res) => {
	const ownerId = req.user._id;
	const staff = await User.find({ owners: ownerId });
	res.status(200).json(new ApiResponse(200, staff, 'Staff fetched successfully'));
});

const removeStaff = asyncHandler(async (req, res) => {
	const { staffId } = req.params;
	const ownerId = req.user._id;

	if (!mongoose.Types.ObjectId.isValid(staffId)) {
		throw new ApiError(400, 'Invalid staff ID');
	}

	const staff = await User.findById(staffId);
	if (!staff) {
		throw new ApiError(404, 'Staff not found');
	}

	// Remove ownerId from owners array
	staff.owners = staff.owners.filter((owner) => !owner.equals(ownerId));

	await Hall.updateMany({ owner: ownerId }, { $pull: { staff: staffId } });

	if (staff.owners.length === 0) {
		staff.role = staff.role.filter((r) => r !== 'staff');
		if (staff.role.length === 0) {
			staff.role.push('user');
		}
	}

	await staff.save({ validateBeforeSave: false });

	const io = req.app.get('io');
	const companyName = await getCompanyName();
	const emailHtml = generateStaffRemovalEmail(staff.fullName, req.user.fullName, companyName);
	const notificationMessage = `You have been removed as a staff member by ${req.user.fullName}.`;
	await Notification.create({
		recipient: staff._id,
		message: notificationMessage,
	});
	await sendEmail({
		io,
		email: staff.email,
		subject: 'You have been removed as a staff member',
		html: emailHtml,
		notification: {
			recipient: staff._id.toString(),
			message: notificationMessage,
		},
	});

	res.status(200).json(new ApiResponse(200, {}, 'Staff removed successfully'));
});

const applyHallOwner = asyncHandler(async (req, res) => {
    const { hasReadTermsOfService } = req.body;

    if (!hasReadTermsOfService) {
        throw new ApiError(400, 'You must read and agree to the terms of service to become a hall owner.');
    }

    const userId = req.user._id;
    const user = await User.findById(userId);

    if (user.hallOwnerApplication.status === 'pending') {
        throw new ApiError(400, 'You have already applied to be a hall owner. Your application is pending review.');
    }

    if (user.hallOwnerApplication.status === 'approved') {
        throw new ApiError(400, 'Your application has already been approved.');
    }

    if (user.hallOwnerApplication.status === 'rejected') {
        user.hallOwnerApplication.rejectionReason = undefined;
    }

    user.hallOwnerApplication.status = 'pending';
    user.hasReadTermsOfService = true;
    await user.save({ validateBeforeSave: false });

    // Send email notifications
    const io = req.app.get('io');
    const companyName = await getCompanyName();
    const userEmailHtml = generateHallOwnerApplicationEmailForUser(user.fullName, companyName);
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
        const adminEmailHtml = generateHallOwnerApplicationEmailForAdmin(user.fullName, user.email, companyName);
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

const getMe = asyncHandler(async (req, res) => {
    const user = await User.findById(req.user._id);
    if (!user) {
        throw new ApiError(404, 'User not found');
    }
    res.status(200).json(new ApiResponse(200, user, "User fetched successfully."));
});

const getUserBankAccount = asyncHandler(async (req, res) => {
    const user = await User.findById(req.user._id).select('+accountNumber +accountName +bankCode');

    if (!user) {
        throw new ApiError(404, 'User not found');
    }

    if (!user.accountNumber || !user.accountName || !user.bankCode) {
        throw new ApiError(404, 'Bank account details not found for this user.');
    }

    const bankAccountDetails = {
        accountNumber: user.accountNumber,
        accountName: user.accountName,
        bankCode: user.bankCode,
    };

    res.status(200).json(new ApiResponse(200, bankAccountDetails, "Bank account details retrieved successfully."));
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
    getMe,
    requestAccountDeletion,
    getUserBankAccount
};

const requestAccountDeletion = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const user = await User.findById(userId);

  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  user.accountStatus = 'deletion-requested';
  user.deletionRequestDate = new Date();
  await user.save({ validateBeforeSave: false });

  const io = req.app.get('io');
  const companyName = await getCompanyName();

  // Notify user
  const userEmailHtml = generateAccountDeletionRequestEmailForUser(user.fullName, companyName);
  await sendEmail({
    io,
    email: user.email,
    subject: 'Account Deletion Request Received',
    html: userEmailHtml,
    notification: {
      recipient: user._id.toString(),
      message: 'Your account deletion request has been received and is under review.',
    },
  });

  // Notify all super-admins
  const superAdmins = await User.find({ role: 'super-admin' });
  for (const admin of superAdmins) {
    const adminEmailHtml = generateAccountDeletionRequestEmailForAdmin(user.fullName, user.email, companyName);
    await sendEmail({
      io,
      email: admin.email,
      subject: 'New Account Deletion Request',
      html: adminEmailHtml,
      notification: {
        recipient: admin._id.toString(),
        message: `User ${user.fullName} has requested to delete their account.`,
      },
    });
  }

  res.status(200).json(new ApiResponse(200, {}, "Your account deletion request has been submitted."));
});

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
    const companyName = await getCompanyName();
    const userEmailHtml = generateHallOwnerCreationEmailForUser(user.fullName, password, companyName);
    await sendEmail({
        io,
        email: user.email,
        subject: `Welcome to ${companyName}!`,
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
    const companyName = await getCompanyName();
    const userEmailHtml = generateHallOwnerApprovalEmailForUser(user.fullName, companyName);
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
    const companyName = await getCompanyName();
    const userEmailHtml = generatePromotionToHallOwnerEmailForUser(user.fullName, companyName);
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