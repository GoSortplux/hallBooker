import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/apiError.js';
import { User } from '../models/user.model.js';
import { ApiResponse } from '../utils/apiResponse.js';
import sendEmail from '../services/email.service.js';
import { createNotification } from '../services/notification.service.js';
import crypto from 'crypto';
import { generateVerificationEmail, generateWelcomeEmail } from '../utils/emailTemplates.js';

const verifyEmail = asyncHandler(async (req, res) => {
  const { token } = req.body;
  const user = await User.findById(req.user._id);

  if (!user) {
    throw new ApiError(404, 'User not found.');
  }

  if (user.isEmailVerified) {
    throw new ApiError(400, 'Email is already verified.'); 
  }

  if (user.emailVerificationToken !== token || user.emailVerificationExpires < Date.now()) {
    throw new ApiError(400, 'Invalid or expired verification token.');
  }

  user.isEmailVerified = true;
  user.emailVerificationToken = undefined;
  user.emailVerificationExpires = undefined;
  await user.save();

  try {
    const io = req.app.get('io');
    await sendEmail({
      io,
      email: user.email,
      subject: 'Welcome to HallBooker!',
      html: generateWelcomeEmail(user.fullName),
      notification: {
        recipient: user._id.toString(),
        message: 'Your email has been verified. Welcome to HallBooker!',
      },
    });
  } catch (emailError) {
      console.error(`Welcome email failed for ${user.email}:`, emailError.message);
  }

  res.status(200).json(new ApiResponse(200, {}, 'Email verified successfully.'));
});

const resendVerificationEmail = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);

  if (!user) {
    throw new ApiError(404, 'User not found.');
  }

  if (user.isEmailVerified) {
    throw new ApiError(400, 'Email is already verified.');
  }

  const verificationToken = user.generateEmailVerificationToken();
  await user.save();

  try {
    const io = req.app.get('io');
    await sendEmail({
      io,
      email: user.email,
      subject: 'Verify Your Email Address',
      html: generateVerificationEmail(user.fullName, verificationToken),
      notification: {
        recipient: user._id.toString(),
        message: 'A verification email has been sent to your email address.',
      },
    });
  } catch (emailError) {
    console.error(`Verification email failed for ${user.email}:`, emailError.message);
    throw new ApiError(500, "There was an error sending the email. Try again later.");
  }

  res.status(200).json(new ApiResponse(200, {}, 'Verification email resent successfully.'));
});

const registerUser = asyncHandler(async (req, res) => {
  const { fullName, email, phone, password, role } = req.body;

  if ([fullName, email, phone, password].some((field) => !field || field.trim() === '')) {
    throw new ApiError(400, 'All fields are required');
  }

  const existingUser = await User.findOne({ $or: [{ email }, { phone }] });
  if (existingUser) {
    throw new ApiError(409, 'User with this email or phone number already exists.');
  }

  const user = new User({ fullName, email, phone, password, role });
  const verificationToken = user.generateEmailVerificationToken();
  await user.save();

  try {
    const io = req.app.get('io');
    await sendEmail({
      io,
      email: user.email,
      subject: 'Verify Your Email Address',
      html: generateVerificationEmail(user.fullName, verificationToken),
      notification: {
        recipient: user._id.toString(),
        message: 'A verification email has been sent to your email address.',
      },
    });
  } catch (emailError) {
    console.error(`Verification email failed for ${user.email}:`, emailError.message);
    // Optional: Add logic to handle failed email sending, e.g., by rolling back user creation
    // For now, we'll just log the error and the user can request a new token.
  }

  const createdUser = await User.findById(user._id);

  if (createdUser.role === 'hall-owner') {
    const io = req.app.get('io');
    const admins = await User.find({ role: 'super-admin' });
    admins.forEach(admin => {
      createNotification(
        io,
        admin._id.toString(),
        `A new hall owner application has been submitted by ${createdUser.fullName}.`,
        `/admin/hall-owner-applications`
      );
    });
  }

  return res.status(201).json(new ApiResponse(201, { user: createdUser }, 'User registered successfully. Please check your email to verify your account.'));
});

const loginUser = asyncHandler(async (req, res) => {
  const { email, password, role } = req.body;
  if (!email || !password) throw new ApiError(400, 'Email and password are required');

  const user = await User.findOne({ email }).select('+password');
  if (!user || !(await user.isPasswordCorrect(password))) {
    throw new ApiError(401, 'Invalid email or password');
  }

  if (role && !user.role.includes(role)) {
    throw new ApiError(403, `You do not have the role: ${role}`);
  }
  
  const accessToken = user.generateAccessToken(role);
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
        const io = req.app.get('io');
        await sendEmail({
            io,
            email: user.email,
            subject: 'Your password reset token (valid for 10 min)',
            html: `<p>${message}</p>`,
            notification: {
                recipient: user._id.toString(),
                message: 'A password reset token has been sent to your email address.',
            },
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

const switchRole = asyncHandler(async (req, res) => {
  const { role } = req.body;
  if (!role) {
    throw new ApiError(400, 'Role is required');
  }

  const user = await User.findById(req.user._id);

  if (!user.role.includes(role)) {
    throw new ApiError(403, `You do not have the role: ${role}`);
  }

  const accessToken = user.generateAccessToken(role);
  const options = { httpOnly: true, secure: process.env.NODE_ENV === 'production' };

  return res
    .status(200)
    .cookie('accessToken', accessToken, options)
    .json(new ApiResponse(200, { accessToken }, 'Role switched successfully'));
});

export { 
  registerUser, 
  loginUser, 
  forgotPassword, 
  resetPassword,
  verifyEmail,
  resendVerificationEmail,
  switchRole
};