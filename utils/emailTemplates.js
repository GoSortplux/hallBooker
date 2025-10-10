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

const generateSubscriptionExpiryWarningEmail = (userName, tierName, expiryDate) => {
    return `
    <div style="font-family: Arial, sans-serif; line-height: 1.6;">
        <h2 style="color: #333;">Your Subscription is Expiring Soon</h2>
        <p>Hi ${userName},</p>
        <p>This is a reminder that your subscription for the <strong>${tierName}</strong> plan is expiring on <strong>${new Date(expiryDate).toDateString()}</strong>.</p>
        <p>To avoid any interruption in service and to keep your halls active, please renew your subscription at your earliest convenience.</p>
        <hr style="border: 0; border-top: 1px solid #eee;" />
        <p style="font-size: 12px; color: #888;">&copy; HallBooker Inc. All rights reserved.</p>
    </div>
  `;
}

const generateSubscriptionConfirmationEmail = (userName, tierName, price, expiryDate) => {
    const expiryString = expiryDate ? `Your subscription will renew on ${new Date(expiryDate).toDateString()}.` : 'You have a lifetime subscription.';
    return `
    <div style="font-family: Arial, sans-serif; line-height: 1.6;">
        <h2 style="color: #333;">Subscription Confirmation</h2>
        <p>Hi ${userName},</p>
        <p>Your payment has been successfully processed and your subscription is now active.</p>
        <h3>Subscription Details:</h3>
        <ul>
            <li><strong>Plan:</strong> ${tierName}</li>
            <li><strong>Amount Paid:</strong> NGN ${price.toLocaleString()}</li>
        </ul>
        <p>${expiryString}</p>
        <p>Thank you for choosing HallBooker.</p>
        <hr style="border: 0; border-top: 1px solid #eee;" />
        <p style="font-size: 12px; color: #888;">&copy; HallBooker Inc. All rights reserved.</p>
    </div>
  `;
}

const generateAdminLicenseNotificationEmail = (ownerName, tierName, price) => {
    return `
    <div style="font-family: Arial, sans-serif; line-height: 1.6;">
        <h2 style="color: #333;">New Subscription Purchase</h2>
        <p>A new subscription has been purchased on HallBooker.</p>
        <h3>Transaction Details:</h3>
        <ul>
            <li><strong>Hall Owner:</strong> ${ownerName}</li>
            <li><strong>Subscription Plan:</strong> ${tierName}</li>
            <li><strong>Amount Paid:</strong> NGN ${price.toLocaleString()}</li>
        </ul>
        <hr style="border: 0; border-top: 1px solid #eee;" />
        <p style="font-size: 12px; color: #888;">This is an automated notification from HallBooker.</p>
    </div>
  `;
}

const generatePaymentConfirmationEmail = (booking) => {
    const duration = formatDuration(new Date(booking.startTime), new Date(booking.endTime));

    const startDate = new Date(booking.startTime);
    const endDate = new Date(booking.endTime);
    const dateOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };

    const isSameDay = startDate.getFullYear() === endDate.getFullYear() &&
                      startDate.getMonth() === endDate.getMonth() &&
                      startDate.getDate() === endDate.getDate();

    const formattedDate = isSameDay
      ? startDate.toLocaleDateString('en-US', dateOptions)
      : `${startDate.toLocaleDateString('en-US', dateOptions)} - ${endDate.toLocaleDateString('en-US', dateOptions)}`;

    const timeWithOptions = { hour: '2-digit', minute: '2-digit', hour12: true };
    const dateTimeOptions = { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true };

    const formattedTime = isSameDay
        ? `${new Date(booking.startTime).toLocaleTimeString('en-US', timeWithOptions)} - ${new Date(booking.endTime).toLocaleTimeString('en-US', timeWithOptions)}`
        : `${new Date(booking.startTime).toLocaleString('en-US', dateTimeOptions)} - ${new Date(booking.endTime).toLocaleString('en-US', dateTimeOptions)}`;


    return `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #ddd; padding: 20px;">
        <h2 style="color: #4CAF50; text-align: center;">Payment Successful!</h2>
        <p>Hi ${booking.user.fullName},</p>
        <p>Your payment has been successfully processed. Your booking is now fully confirmed. Here are the details of your reservation:</p>

        <table style="width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 14px;">
            <thead>
                <tr style="background-color: #f2f2f2;">
                    <th colspan="2" style="padding: 12px; text-align: left; border-bottom: 2px solid #4CAF50;">Booking Summary</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td style="padding: 10px; border-bottom: 1px solid #ddd; width: 120px;"><strong>Booking ID:</strong></td>
                    <td style="padding: 10px; border-bottom: 1px solid #ddd;">${booking.bookingId}</td>
                </tr>
                <tr>
                    <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Venue:</strong></td>
                    <td style="padding: 10px; border-bottom: 1px solid #ddd;">${booking.venue.name}</td>
                </tr>
                <tr>
                    <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Location:</strong></td>
                    <td style="padding: 10px; border-bottom: 1px solid #ddd;">${booking.venue.location}</td>
                </tr>
                <tr>
                    <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Directions:</strong></td>
                    <td style="padding: 10px; border-bottom: 1px solid #ddd;"><a href="${booking.venue.directionUrl}" style="color: #0056b3; text-decoration: none;">Get Directions</a></td>
                </tr>
                <tr>
                    <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Date:</strong></td>
                    <td style="padding: 10px; border-bottom: 1px solid #ddd;">${formattedDate}</td>
                </tr>
                <tr>
                    <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Time:</strong></td>
                    <td style="padding: 10px; border-bottom: 1px solid #ddd;">${formattedTime}</td>
                </tr>
                <tr>
                    <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Duration:</strong></td>
                    <td style="padding: 10px; border-bottom: 1px solid #ddd;">${duration}</td>
                </tr>
                <tr>
                    <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Event Details:</strong></td>
                    <td style="padding: 10px; border-bottom: 1px solid #ddd;">${booking.eventDetails}</td>
                </tr>
                <tr>
                    <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Payment Status:</strong></td>
                    <td style="padding: 10px; border-bottom: 1px solid #ddd;">${booking.paymentStatus}</td>
                </tr>
                <tr style="background-color: #f2f2f2;">
                    <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Total Price:</strong></td>
                    <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>NGN ${booking.totalPrice.toLocaleString()}</strong></td>
                </tr>
            </tbody>
        </table>

        <p style="font-size: 14px; color: #555;">Please note that your access to the hall will expire at the end of your booking period.</p>
        <p style="font-size: 14px; color: #555;">We have also attached an updated PDF receipt for your records.</p>
        <hr style="border: 0; border-top: 1px solid #eee; margin-top: 20px;" />
        <p style="font-size: 12px; color: #888; text-align: center;">&copy; HallBooker Inc. All rights reserved.</p>
    </div>
  `;
}

const generateBookingConfirmationEmail = (booking) => {
    const duration = formatDuration(new Date(booking.startTime), new Date(booking.endTime));

    const startDate = new Date(booking.startTime);
    const endDate = new Date(booking.endTime);
    const dateOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };

    const isSameDay = startDate.getFullYear() === endDate.getFullYear() &&
                      startDate.getMonth() === endDate.getMonth() &&
                      startDate.getDate() === endDate.getDate();

    const formattedDate = isSameDay
      ? startDate.toLocaleDateString('en-US', dateOptions)
      : `${startDate.toLocaleDateString('en-US', dateOptions)} - ${endDate.toLocaleDateString('en-US', dateOptions)}`;

    const timeWithOptions = { hour: '2-digit', minute: '2-digit', hour12: true };
    const dateTimeOptions = { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true };

    const formattedTime = isSameDay
        ? `${new Date(booking.startTime).toLocaleTimeString('en-US', timeWithOptions)} - ${new Date(booking.endTime).toLocaleTimeString('en-US', timeWithOptions)}`
        : `${new Date(booking.startTime).toLocaleString('en-US', dateTimeOptions)} - ${new Date(booking.endTime).toLocaleString('en-US', dateTimeOptions)}`;

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
                    <td style="padding: 10px; border-bottom: 1px solid #ddd;">${booking.bookingId}</td>
                </tr>
                <tr>
                    <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Venue:</strong></td>
                    <td style="padding: 10px; border-bottom: 1px solid #ddd;">${booking.venue.name}</td>
                </tr>
                <tr>
                    <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Location:</strong></td>
                    <td style="padding: 10px; border-bottom: 1px solid #ddd;">${booking.venue.location}</td>
                </tr>
                <tr>
                    <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Directions:</strong></td>
                    <td style="padding: 10px; border-bottom: 1px solid #ddd;"><a href="${booking.venue.directionUrl}" style="color: #0056b3; text-decoration: none;">Get Directions</a></td>
                </tr>
                <tr>
                    <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Date:</strong></td>
                    <td style="padding: 10px; border-bottom: 1px solid #ddd;">${formattedDate}</td>
                </tr>
                <tr>
                    <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Time:</strong></td>
                    <td style="padding: 10px; border-bottom: 1px solid #ddd;">${formattedTime}</td>
                </tr>
                <tr>
                    <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Duration:</strong></td>
                    <td style="padding: 10px; border-bottom: 1px solid #ddd;">${duration}</td>
                </tr>
                <tr>
                    <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Event Details:</strong></td>
                    <td style="padding: 10px; border-bottom: 1px solid #ddd;">${booking.eventDetails}</td>
                </tr>
                <tr>
                    <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Payment Status:</strong></td>
                    <td style="padding: 10px; border-bottom: 1px solid #ddd;">${booking.paymentStatus}</td>
                </tr>
                <tr style="background-color: #f2f2f2;">
                    <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Total Price:</strong></td>
                    <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>NGN ${booking.totalPrice.toLocaleString()}</strong></td>
                </tr>
            </tbody>
        </table>

        <div style="text-align: center; margin: 20px 0;">
            <!-- TODO: Replace the href with your actual frontend payment URL -->
            <a href="http://localhost:8000/api/v1/payments/initialize/${booking.bookingId}" style="background-color: #0056b3; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-size: 16px;">Pay Now</a>
        </div>

        <p style="font-size: 14px; color: #555;">Alternatively, you can log in to your dashboard to complete the payment.</p>
        <p style="font-size: 14px; color: #555;">Please note that your access to the hall will expire at the end of your booking period.</p>
        <p style="font-size: 14px; color: #555;">We have also attached a PDF receipt for your payment and booking details for your records.</p>
        <hr style="border: 0; border-top: 1px solid #eee; margin-top: 20px;" />
        <p style="font-size: 12px; color: #888; text-align: center;">&copy; HallBooker Inc. All rights reserved.</p>
    </div>
  `;
}

const generateNewBookingNotificationEmailForOwner = (booking) => {
    const duration = formatDuration(new Date(booking.startTime), new Date(booking.endTime));

    const startDate = new Date(booking.startTime);
    const endDate = new Date(booking.endTime);
    const dateOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };

    const isSameDay = startDate.getFullYear() === endDate.getFullYear() &&
                        startDate.getMonth() === endDate.getMonth() &&
                        startDate.getDate() === endDate.getDate();

    const formattedDate = isSameDay
        ? startDate.toLocaleDateString('en-US', dateOptions)
        : `${startDate.toLocaleDateString('en-US', dateOptions)} - ${endDate.toLocaleDateString('en-US', dateOptions)}`;

    const timeWithOptions = { hour: '2-digit', minute: '2-digit', hour12: true };
    const dateTimeOptions = { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true };

    const formattedTime = isSameDay
        ? `${new Date(booking.startTime).toLocaleTimeString('en-US', timeWithOptions)} - ${new Date(booking.endTime).toLocaleTimeString('en-US', timeWithOptions)}`
        : `${new Date(booking.startTime).toLocaleString('en-US', dateTimeOptions)} - ${new Date(booking.endTime).toLocaleString('en-US', dateTimeOptions)}`;

    return `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #ddd; padding: 20px;">
        <h2 style="color: #0056b3; text-align: center;">New Booking Notification</h2>
        <p>Hi ${booking.venue.owner.fullName},</p>
        <p>You have a new booking for your venue, ${booking.venue.name}. Here are the details:</p>

        <table style="width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 14px;">
            <thead>
                <tr style="background-color: #f2f2f2;">
                    <th colspan="2" style="padding: 12px; text-align: left; border-bottom: 2px solid #0056b3;">Booking Details</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td style="padding: 10px; border-bottom: 1px solid #ddd; width: 120px;"><strong>Booking ID:</strong></td>
                    <td style="padding: 10px; border-bottom: 1px solid #ddd;">${booking.bookingId}</td>
                </tr>
                <tr>
                    <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Venue:</strong></td>
                    <td style="padding: 10px; border-bottom: 1px solid #ddd;">${booking.venue.name}</td>
                </tr>
                <tr>
                    <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Date:</strong></td>
                    <td style="padding: 10px; border-bottom: 1px solid #ddd;">${formattedDate}</td>
                </tr>
                <tr>
                    <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Time:</strong></td>
                    <td style="padding: 10px; border-bottom: 1px solid #ddd;">${formattedTime}</td>
                </tr>
                <tr>
                    <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Duration:</strong></td>
                    <td style="padding: 10px; border-bottom: 1px solid #ddd;">${duration}</td>
                </tr>
                <tr>
                    <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Event Details:</strong></td>
                    <td style="padding: 10px; border-bottom: 1px solid #ddd;">${booking.eventDetails}</td>
                </tr>
                 <tr style="background-color: #f2f2f2;">
                    <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Total Price:</strong></td>
                    <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>NGN ${booking.totalPrice.toLocaleString()}</strong></td>
                </tr>
            </tbody>
        </table>

        <h3 style="color: #0056b3;">Booked By:</h3>
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 14px;">
             <thead>
                <tr style="background-color: #f2f2f2;">
                    <th colspan="2" style="padding: 12px; text-align: left; border-bottom: 2px solid #0056b3;">User Details</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td style="padding: 10px; border-bottom: 1px solid #ddd; width: 120px;"><strong>Full Name:</strong></td>
                    <td style="padding: 10px; border-bottom: 1px solid #ddd;">${booking.user.fullName}</td>
                </tr>
                <tr>
                    <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Email:</strong></td>
                    <td style="padding: 10px; border-bottom: 1px solid #ddd;">${booking.user.email}</td>
                </tr>
            </tbody>
        </table>

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

const generateSubscriptionPaymentEmail = (subscription) => {
    const purchaseDate = new Date(subscription.purchaseDate);
    const expiryDate = new Date(subscription.expiryDate);
    const dateOptions = { year: 'numeric', month: 'long', day: 'numeric' };

    return `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #ddd; padding: 20px;">
        <h2 style="color: #4CAF50; text-align: center;">Subscription Payment Successful!</h2>
        <p>Hi ${subscription.owner.fullName},</p>
        <p>Your payment for the subscription has been successfully processed. Your license is now active. Here are the details of your subscription:</p>

        <table style="width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 14px;">
            <thead>
                <tr style="background-color: #f2f2f2;">
                    <th colspan="2" style="padding: 12px; text-align: left; border-bottom: 2px solid #4CAF50;">Subscription Summary</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td style="padding: 10px; border-bottom: 1px solid #ddd; width: 120px;"><strong>Transaction ID:</strong></td>
                    <td style="padding: 10px; border-bottom: 1px solid #ddd;">${subscription.transactionId}</td>
                </tr>
                <tr>
                    <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Tier:</strong></td>
                    <td style="padding: 10px; border-bottom: 1px solid #ddd;">${subscription.tier.name}</td>
                </tr>
                <tr>
                    <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Purchase Date:</strong></td>
                    <td style="padding: 10px; border-bottom: 1px solid #ddd;">${purchaseDate.toLocaleDateString('en-US', dateOptions)}</td>
                </tr>
                <tr>
                    <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Expiry Date:</strong></td>
                    <td style="padding: 10px; border-bottom: 1px solid #ddd;">${expiryDate.toLocaleDateString('en-US', dateOptions)}</td>
                </tr>
                 <tr style="background-color: #f2f2f2;">
                    <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Amount Paid:</strong></td>
                    <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>NGN ${subscription.price.toLocaleString()}</strong></td>
                </tr>
            </tbody>
        </table>

        <p style="font-size: 14px; color: #555;">We have attached a PDF receipt for your records.</p>
        <hr style="border: 0; border-top: 1px solid #eee; margin-top: 20px;" />
        <p style="font-size: 12px; color: #888; text-align: center;">&copy; HallBooker Inc. All rights reserved.</p>
    </div>
  `;
}

const generateSubscriptionExpiredEmail = (userName, tierName) => {
    return `
    <div style="font-family: Arial, sans-serif; line-height: 1.6;">
        <h2 style="color: #d9534f;">Your Subscription Has Expired</h2>
        <p>Hi ${userName},</p>
        <p>This is to notify you that your subscription for the <strong>${tierName}</strong> plan has expired.</p>
        <p>As a result, your venues have been deactivated and are no longer visible for booking. To continue using our services and reactivate your venues, please log in to your dashboard and purchase a new subscription.</p>
        <hr style="border: 0; border-top: 1px solid #eee;" />
        <p style="font-size: 12px; color: #888;">&copy; HallBooker Inc. All rights reserved.</p>
    </div>
  `;
}

const generatePendingBookingCancelledEmail = (recipientName, booking) => {
    return `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #ddd; padding: 20px;">
        <h2 style="color: #d9534f; text-align: center;">Booking Automatically Cancelled</h2>
        <p>Hi ${recipientName},</p>
        <p>This is to inform you that a pending booking has been automatically cancelled because the payment was not completed within the allowed time frame.</p>

        <table style="width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 14px;">
            <thead>
                <tr style="background-color: #f2f2f2;">
                    <th colspan="2" style="padding: 12px; text-align: left; border-bottom: 2px solid #d9534f;">Cancelled Booking Details</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td style="padding: 10px; border-bottom: 1px solid #ddd; width: 120px;"><strong>Booking ID:</strong></td>
                    <td style="padding: 10px; border-bottom: 1px solid #ddd;">${booking.bookingId}</td>
                </tr>
                <tr>
                    <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Venue:</strong></td>
                    <td style="padding: 10px; border-bottom: 1px solid #ddd;">${booking.venue.name}</td>
                </tr>
                <tr>
                    <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Booked On:</strong></td>
                    <td style="padding: 10px; border-bottom: 1px solid #ddd;">${new Date(booking.createdAt).toLocaleString('en-US', { dateStyle: 'full', timeStyle: 'short' })}</td>
                </tr>
            </tbody>
        </table>

        <p style="font-size: 14px; color: #555;">No further action is required. The timeslot may now be available for others to book.</p>
        <hr style="border: 0; border-top: 1px solid #eee; margin-top: 20px;" />
        <p style="font-size: 12px; color: #888; text-align: center;">This is an automated notification from HallBooker.</p>
    </div>
  `;
}

export {
  generateVerificationEmail,
  generateWelcomeEmail,
  generateSubscriptionPaymentEmail,
  generateSubscriptionExpiryWarningEmail,
  generateSubscriptionExpiredEmail,
  generateSubscriptionConfirmationEmail,
  generateAdminLicenseNotificationEmail,
  generatePaymentConfirmationEmail,
  generateBookingConfirmationEmail,
  generateNewBookingNotificationEmailForOwner,
  generateVenueCreationEmail,
  generateLicensePurchaseEmail,
  generatePendingBookingCancelledEmail,
};