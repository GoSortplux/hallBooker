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

const generateBookingConfirmationEmail = (name, bookingId) => {
    return `
    <div style="font-family: Arial, sans-serif; line-height: 1.6;">
        <h2 style="color: #333;">Booking Confirmation</h2>
        <p>Hi ${name},</p>
        <p>Your booking has been confirmed successfully!</p>
        <p>Your Booking ID is: <strong>${bookingId}</strong></p>
        <p>Please note that your access to the hall will expire at the end of your booking period.</p>
        <p>We have attached a PDF receipt for your payment and booking details.</p>
        <hr style="border: 0; border-top: 1px solid #eee;" />
        <p style="font-size: 12px; color: #888;">&copy; HallBooker Inc. All rights reserved.</p>
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
