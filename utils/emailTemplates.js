import { formatDuration } from './time.js';

const generateVerificationEmail = (name, token) => {
  return `
    <div style="font-family: Arial, sans-serif; line-height: 1.6;">
      <h2 style="color: #333;">Welcome to HallBooker, ${name}!</h2>
      <p>Thank you for registering. To complete your registration, please use the following verification code:</p>
      <p style="font-size: 24px; font-weight: bold; color: #444; letter-spacing: 2px; border: 1px solid #ddd; padding: 10px; display: inline-block;">
        ${token}
      </p>
      <p>This code will expire in 10 minutes.</p>
      <p>If you did not sign up for a HallBooker account, you can safely ignore this email.</p>
      <hr style="border: 0; border-top: 1px solid #eee;" />
      <p style="font-size: 12px; color: #888;">&copy; HallBooker Inc. All rights reserved.</p>
    </div>
  `;
};

const generateWelcomeEmail = (name) => {
    return `
    <div style="font-family: Arial, sans-serif; line-height: 1.6;">
        <h2 style="color: #333;">Welcome to HallBooker, ${name}!</h2>
        <p>Your email has been successfully verified. We're excited to have you on board.</p>
        <p>You can now log in and start exploring our services.</p>
        <hr style="border: 0; border-top: 1px solid #eee;" />
        <p style="font-size: 12px; color: #888;">&copy; HallBooker Inc. All rights reserved.</p>
    </div>
  `;
}

export { generateVerificationEmail, generateWelcomeEmail, generateLicensePurchaseEmail, generateVenueCreationEmail, generateBookingConfirmationEmail };

const generateBookingConfirmationEmail = (booking) => {
    const timeOptions = { hour: '2-digit', minute: '2-digit', hour12: true };
    const formattedStartTime = new Date(booking.startTime).toLocaleTimeString('en-US', timeOptions);
    const formattedEndTime = new Date(booking.endTime).toLocaleTimeString('en-US', timeOptions);
    const duration = formatDuration(new Date(booking.startTime), new Date(booking.endTime));

    return `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #ddd; padding: 20px;">
        <h2 style="color: #0056b3; text-align: center;">Booking Confirmation</h2>
        <p>Hi ${booking.user.fullName},</p>
        <p>Your booking has been confirmed successfully! We are pleased to provide you with the details of your reservation below.</p>

        <table style="width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 14px;">
            <thead>
                <tr style="background-color: #f2f2f2;">
                    <th colspan="2" style="padding: 12px; text-align: left; border-bottom: 2px solid #0056b3;">Booking Summary</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td style="padding: 10px; border-bottom: 1px solid #ddd; width: 120px;"><strong>Booking ID:</strong></td>
                    <td style="padding: 10px; border-bottom: 1px solid #ddd;">${booking._id}</td>
                </tr>
                <tr>
                    <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Venue:</strong></td>
                    <td style="padding: 10px; border-bottom: 1px solid #ddd;">${booking.venue.name}</td>
                </tr>
                <tr>
                    <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Date:</strong></td>
                    <td style="padding: 10px; border-bottom: 1px solid #ddd;">${new Date(booking.startTime).toLocaleDateString('en-GB')}</td>
                </tr>
                <tr>
                    <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Time:</strong></td>
                    <td style="padding: 10px; border-bottom: 1px solid #ddd;">${formattedStartTime} - ${formattedEndTime}</td>
                </tr>
                <tr>
                    <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Duration:</strong></td>
                    <td style="padding: 10px; border-bottom: 1px solid #ddd;">${duration}</td>
                </tr>
                <tr style="background-color: #f2f2f2;">
                    <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Total Price:</strong></td>
                    <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>NGN ${booking.totalPrice.toLocaleString()}</strong></td>
                </tr>
            </tbody>
        </table>

        <p style="font-size: 14px; color: #555;">Please note that your access to the hall will expire at the end of your booking period.</p>
        <p style="font-size: 14px; color: #555;">We have also attached a PDF receipt for your payment and booking details for your records.</p>
        <hr style="border: 0; border-top: 1px solid #eee; margin-top: 20px;" />
        <p style="font-size: 12px; color: #888; text-align: center;">&copy; HallBooker Inc. All rights reserved.</p>
    </div>
  `;
}

const generateVenueCreationEmail = (name, venueName, venueLocation) => {
    return `
    <div style="font-family: Arial, sans-serif; line-height: 1.6;">
        <h2 style="color: #333;">New Venue Created!</h2>
        <p>Hi ${name},</p>
        <p>Congratulations! Your new venue has been successfully created on HallBooker.</p>
        <h3>Venue Details:</h3>
        <ul>
            <li><strong>Name:</strong> ${venueName}</li>
            <li><strong>Location:</strong> ${venueLocation}</li>
        </ul>
        <p>You can now manage your venue from your dashboard.</p>
        <hr style="border: 0; border-top: 1px solid #eee;" />
        <p style="font-size: 12px; color: #888;">&copy; HallBooker Inc. All rights reserved.</p>
    </div>
  `;
}

const generateLicensePurchaseEmail = (name, tierName, price, expiryDate) => {
    const expiryString = expiryDate ? `Your license will expire on ${expiryDate.toDateString()}.` : 'Your license is for a lifetime.';
    return `
    <div style="font-family: Arial, sans-serif; line-height: 1.6;">
        <h2 style="color: #333;">License Purchase Confirmation</h2>
        <p>Hi ${name},</p>
        <p>Thank you for your purchase. Your license has been successfully activated.</p>
        <h3>License Details:</h3>
        <ul>
            <li><strong>Tier:</strong> ${tierName}</li>
            <li><strong>Price:</strong> $${price}</li>
        </ul>
        <p>${expiryString}</p>
        <p>You can now enjoy the benefits of your new license.</p>
        <hr style="border: 0; border-top: 1px solid #eee;" />
        <p style="font-size: 12px; color: #888;">&copy; HallBooker Inc. All rights reserved.</p>
    </div>
  `;
}
