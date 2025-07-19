import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/apiError.js';
import { User } from '../models/user.model.js';
import { ApiResponse } from '../utils/apiResponse.js';
import sendEmail from '../services/email.service.js';
import crypto from 'crypto';

const registerUser = asyncHandler(async (req, res) => {
  const { fullName, email, phone, password, role } = req.body;

  if ([fullName, email, phone, password].some((field) => !field || field.trim() === '')) {
    throw new ApiError(400, 'All fields are required');
  }

  const user = await User.create({ fullName, email, phone, password, role });
  const createdUser = await User.findById(user._id);

  try {
    await sendEmail({
      email: user.email,
      subject: 'Welcome to HallBooker!',
      html: `<h1>Hi ${user.fullName},</h1><p>Thank you for registering. We're excited to have you on board.</p>`,
    });
  } catch (emailError) {
      console.error(`Welcome email failed for ${user.email}:`, emailError.message);
  }

  return res.status(201).json(new ApiResponse(201, createdUser, 'User registered successfully'));
});

const loginUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) throw new ApiError(400, 'Email and password are required');

  const user = await User.findOne({ email }).select('+password');
  if (!user || !(await user.isPasswordCorrect(password))) {
    throw new ApiError(401, 'Invalid email or password');
  }
  
  const accessToken = user.generateAccessToken();
  const loggedInUser = await User.findById(user._id);
  const options = { httpOnly: true, secure: process.env.NODE_ENV === 'production' };

  return res
    .status(200)
    .cookie('accessToken', accessToken, options)
    .json(new ApiResponse(200, { user: loggedInUser, accessToken }, 'User logged In successfully'));
});

const forgotPassword = asyncHandler(async (req, res) => {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) throw new ApiError(404, "There is no user with that email address.");

    const resetToken = user.createPasswordResetToken();
    await user.save({ validateBeforeSave: false });

    const resetURL = `${req.protocol}://${req.get('host')}/api/v1/auth/reset-password/${resetToken}`;
    const message = `Forgot your password? Submit a PATCH request with your new password to: ${resetURL}.\nThis link is valid for 10 minutes. If you didn't forget your password, please ignore this email.`;

    try {
        await sendEmail({
            email: user.email,
            subject: 'Your password reset token (valid for 10 min)',
            html: `<p>${message}</p>`
        });
        res.status(200).json(new ApiResponse(200, {}, 'Token sent to email!'));
    } catch (err) {
        user.passwordResetToken = undefined;
        user.passwordResetExpires = undefined;
        await user.save({ validateBeforeSave: false });
        throw new ApiError(500, "There was an error sending the email. Try again later.");
    }
});

const resetPassword = asyncHandler(async (req, res) => {
    const hashedToken = crypto
        .createHash('sha256')
        .update(req.params.token)
        .digest('hex');

    const user = await User.findOne({ 
        passwordResetToken: hashedToken,
        passwordResetExpires: { $gt: Date.now() }
    });

    if (!user) throw new ApiError(400, "Token is invalid or has expired");

    user.password = req.body.password;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();

    const accessToken = user.generateAccessToken();
    const options = { httpOnly: true, secure: process.env.NODE_ENV === 'production' };

    res.status(200)
       .cookie('accessToken', accessToken, options)
       .json(new ApiResponse(200, {}, 'Password reset successful.'));
});

export { registerUser, loginUser, forgotPassword, resetPassword };