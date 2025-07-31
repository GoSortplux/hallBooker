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

export { 
    getAllUsers, 
    getUserById, 
    updateUser, 
    deleteUser,
    updateUserBankAccount
};