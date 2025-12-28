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

const generateAdminDisbursementFailureEmail = (disbursementData) => {
    return `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <h2 style="color: #d9534f;">Disbursement Failure Alert</h2>
        <p>A disbursement (payout) to a hall owner has failed. Please investigate immediately.</p>
        <h3>Failure Details:</h3>
        <ul>
            <li><strong>Transaction Reference:</strong> ${disbursementData.transactionReference}</li>
            <li><strong>Amount:</strong> NGN ${disbursementData.amount.toLocaleString()}</li>
            <li><strong>Destination Account:</strong> ${disbursementData.destinationAccountName} (${disbursementData.destinationAccountNumber})</li>
            <li><strong>Bank:</strong> ${disbursementData.destinationBankName}</li>
            <li><strong>Reason:</strong> ${disbursementData.transactionDescription}</li>
            <li><strong>Timestamp:</strong> ${new Date(disbursementData.completedOn).toLocaleString()}</li>
        </ul>
        <p>Please log in to the Monnify dashboard to view more details and resolve the issue.</p>
    </div>
  `;
};

const generateMandateCancellationEmail = (userName, expiryDate) => {
    return `
    <div style="font-family: Arial, sans-serif; line-height: 1.6;">
        <h2 style="color: #333;">Subscription Auto-Renewal Cancelled</h2>
        <p>Hi ${userName},</p>
        <p>This email confirms that the automatic renewal for your subscription has been successfully cancelled.</p>
        <p>Your subscription will remain active and you can continue to enjoy all its benefits until the current billing period ends on <strong>${new Date(expiryDate).toDateString()}</strong>.</p>
        <p>If you change your mind, you can set up a new subscription from your dashboard at any time. Thank you for using HallBooker.</p>
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
    const bookingDatesHtml = booking.bookingDates.map(bookingDate => {
        const duration = formatDuration(new Date(bookingDate.startTime), new Date(bookingDate.endTime));
        const startDate = new Date(bookingDate.startTime);
        const endDate = new Date(bookingDate.endTime);
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
            ? `${new Date(bookingDate.startTime).toLocaleTimeString('en-US', timeWithOptions)} - ${new Date(bookingDate.endTime).toLocaleTimeString('en-US', timeWithOptions)}`
            : `${new Date(bookingDate.startTime).toLocaleString('en-US', dateTimeOptions)} - ${new Date(bookingDate.endTime).toLocaleString('en-US', dateTimeOptions)}`;

        return `
            <tr>
                <td style="padding: 10px; border-bottom: 1px solid #ddd;">${formattedDate}</td>
                <td style="padding: 10px; border-bottom: 1px solid #ddd;">${formattedTime}</td>
                <td style="padding: 10px; border-bottom: 1px solid #ddd;">${duration}</td>
            </tr>
        `;
    }).join('');

    let facilitiesHtml = '';
    if (booking.selectedFacilities && booking.selectedFacilities.length > 0) {
        const facilityRows = booking.selectedFacilities.map(f => `
            <tr>
                <td style="padding: 10px; border-bottom: 1px solid #ddd;">${f.name}</td>
                <td style="padding: 10px; border-bottom: 1px solid #ddd; text-align: right;">NGN ${f.cost.toLocaleString()}</td>
            </tr>
        `).join('');

        facilitiesHtml = `
            <tr style="background-color: #f2f2f2;">
                <th colspan="2" style="padding: 12px; text-align: left; border-bottom: 1px solid #ddd;">Facilities</th>
            </tr>
            ${facilityRows}
        `;
    }

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
                    <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Booked On:</strong></td>
                    <td style="padding: 10px; border-bottom: 1px solid #ddd;">${new Date(booking.createdAt).toLocaleString('en-US', { dateStyle: 'full', timeStyle: 'short', timeZone: 'UTC' })} UTC</td>
                </tr>
                <tr>
                    <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Hall:</strong></td>
                    <td style="padding: 10px; border-bottom: 1px solid #ddd;">${booking.hall.name}</td>
                </tr>
                <tr>
                    <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Location:</strong></td>
                    <td style="padding: 10px; border-bottom: 1px solid #ddd;">${booking.hall.location}</td>
                </tr>
                <tr>
                    <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Directions:</strong></td>
                    <td style="padding: 10px; border-bottom: 1px solid #ddd;"><a href="${booking.hall.directionUrl}" style="color: #0056b3; text-decoration: none;">Get Directions</a></td>
                </tr>
                <tr>
                    <td colspan="2" style="padding: 10px; border-bottom: 1px solid #ddd;">
                        <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                            <thead>
                                <tr style="background-color: #f9f9f9;">
                                    <th style="padding: 10px; border-bottom: 1px solid #ddd;">Date</th>
                                    <th style="padding: 10px; border-bottom: 1px solid #ddd;">Time</th>
                                    <th style="padding: 10px; border-bottom: 1px solid #ddd;">Duration</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${bookingDatesHtml}
                            </tbody>
                        </table>
                    </td>
                </tr>
                <tr>
                    <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Event Details:</strong></td>
                    <td style="padding: 10px; border-bottom: 1px solid #ddd;">${booking.eventDetails}</td>
                </tr>
                <tr>
                    <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Payment Status:</strong></td>
                    <td style="padding: 10px; border-bottom: 1px solid #ddd;">${booking.paymentStatus}</td>
                </tr>
                ${facilitiesHtml}
                <tr style="background-color: #f2f2f2;">
                    <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Hall Price:</strong></td>
                    <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>NGN ${(booking.hallPrice || 0).toLocaleString()}</strong></td>
                </tr>
                <tr style="background-color: #f2f2f2;">
                    <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Facilities Price:</strong></td>
                    <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>NGN ${(booking.facilitiesPrice || 0).toLocaleString()}</strong></td>
                </tr>
                <tr style="background-color: #f2f2f2;">
                    <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Total Price:</strong></td>
                    <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>NGN ${booking.totalPrice.toLocaleString()}</strong></td>
                </tr>
            </tbody>
        </table>

        ${booking.hall.bookingBufferInHours && booking.hall.bookingBufferInHours > 0 ? `
        <p style="font-size: 14px; color: #555; border-left: 4px solid #4CAF50; padding-left: 10px; background-color: #f0fff0;">
            All bookings include a <strong>${booking.hall.bookingBufferInHours}-hour</strong> grace period after the paid time expires for cleanup and exit. Please ensure all activities are completed and the hall is fully vacated before the end of this grace period to avoid additional charges.
        </p>
        ` : '<p style="font-size: 14px; color: #555;">Please note that your access to the hall will expire at the end of your booking period.</p>'}
        <p style="font-size: 14px; color: #555;">We have attached a PDF receipt for your records.</p>
        <hr style="border: 0; border-top: 1px solid #eee; margin-top: 20px;" />
        <p style="font-size: 12px; color: #888; text-align: center;">&copy; HallBooker Inc. All rights reserved.</p>
    </div>
  `;
}

const generateBookingConfirmationEmail = (booking) => {
    const bookingDatesHtml = booking.bookingDates.map(bookingDate => {
        const duration = formatDuration(new Date(bookingDate.startTime), new Date(bookingDate.endTime));
        const startDate = new Date(bookingDate.startTime);
        const endDate = new Date(bookingDate.endTime);
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
            ? `${new Date(bookingDate.startTime).toLocaleTimeString('en-US', timeWithOptions)} - ${new Date(bookingDate.endTime).toLocaleTimeString('en-US', timeWithOptions)}`
            : `${new Date(bookingDate.startTime).toLocaleString('en-US', dateTimeOptions)} - ${new Date(bookingDate.endTime).toLocaleString('en-US', dateTimeOptions)}`;

        return `
            <tr>
                <td style="padding: 10px; border-bottom: 1px solid #ddd;">${formattedDate}</td>
                <td style="padding: 10px; border-bottom: 1px solid #ddd;">${formattedTime}</td>
                <td style="padding: 10px; border-bottom: 1px solid #ddd;">${duration}</td>
            </tr>
        `;
    }).join('');

    let facilitiesHtml = '';
    if (booking.selectedFacilities && booking.selectedFacilities.length > 0) {
        const facilityRows = booking.selectedFacilities.map(f => `
            <tr>
                <td style="padding: 10px; border-bottom: 1px solid #ddd;">${f.name}</td>
                <td style="padding: 10px; border-bottom: 1px solid #ddd; text-align: right;">NGN ${f.cost.toLocaleString()}</td>
            </tr>
        `).join('');

        facilitiesHtml = `
            <tr style="background-color: #f2f2f2;">
                <th colspan="2" style="padding: 12px; text-align: left; border-bottom: 1px solid #ddd;">Facilities</th>
            </tr>
            ${facilityRows}
        `;
    }

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
                    <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Booked On:</strong></td>
                    <td style="padding: 10px; border-bottom: 1px solid #ddd;">${new Date(booking.createdAt).toLocaleString('en-US', { dateStyle: 'full', timeStyle: 'short', timeZone: 'UTC' })} UTC</td>
                </tr>
                <tr>
                    <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Hall:</strong></td>
                    <td style="padding: 10px; border-bottom: 1px solid #ddd;">${booking.hall.name}</td>
                </tr>
                <tr>
                    <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Location:</strong></td>
                    <td style="padding: 10px; border-bottom: 1px solid #ddd;">${booking.hall.location}</td>
                </tr>
                <tr>
                    <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Directions:</strong></td>
                    <td style="padding: 10px; border-bottom: 1px solid #ddd;"><a href="${booking.hall.directionUrl}" style="color: #0056b3; text-decoration: none;">Get Directions</a></td>
                </tr>
                <tr>
                    <td colspan="2" style="padding: 10px; border-bottom: 1px solid #ddd;">
                        <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                            <thead>
                                <tr style="background-color: #f9f9f9;">
                                    <th style="padding: 10px; border-bottom: 1px solid #ddd;">Date</th>
                                    <th style="padding: 10px; border-bottom: 1px solid #ddd;">Time</th>
                                    <th style="padding: 10px; border-bottom: 1px solid #ddd;">Duration</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${bookingDatesHtml}
                            </tbody>
                        </table>
                    </td>
                </tr>
                <tr>
                    <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Event Details:</strong></td>
                    <td style="padding: 10px; border-bottom: 1px solid #ddd;">${booking.eventDetails}</td>
                </tr>
                <tr>
                    <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Payment Status:</strong></td>
                    <td style="padding: 10px; border-bottom: 1px solid #ddd;">${booking.paymentStatus}</td>
                </tr>
                ${facilitiesHtml}
                <tr style="background-color: #f2f2f2;">
                    <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Hall Price:</strong></td>
                    <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>NGN ${(booking.hallPrice || 0).toLocaleString()}</strong></td>
                </tr>
                <tr style="background-color: #f2f2f2;">
                    <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Facilities Price:</strong></td>
                    <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>NGN ${(booking.facilitiesPrice || 0).toLocaleString()}</strong></td>
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
        ${booking.hall.bookingBufferInHours && booking.hall.bookingBufferInHours > 0 ? `
        <p style="font-size: 14px; color: #555; border-left: 4px solid #0056b3; padding-left: 10px; background-color: #f0f8ff;">
            All bookings include a <strong>${booking.hall.bookingBufferInHours}-hour</strong> grace period after the paid time expires for cleanup and exit. Please ensure all activities are completed and the hall is fully vacated before the end of this grace period to avoid additional charges.
        </p>
        ` : '<p style="font-size: 14px; color: #555;">Please note that your access to the hall will expire at the end of your booking period.</p>'}
        <p style="font-size: 14px; color: #555;">We have also attached a PDF receipt for your payment and booking details for your records.</p>
        <hr style="border: 0; border-top: 1px solid #eee; margin-top: 20px;" />
        <p style="font-size: 12px; color: #888; text-align: center;">&copy; HallBooker Inc. All rights reserved.</p>
    </div>
  `;
}

const generateNewBookingNotificationEmailForOwner = (booking) => {
    const bookingDatesHtml = booking.bookingDates.map(bookingDate => {
        const duration = formatDuration(new Date(bookingDate.startTime), new Date(bookingDate.endTime));
        const startDate = new Date(bookingDate.startTime);
        const endDate = new Date(bookingDate.endTime);
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
            ? `${new Date(bookingDate.startTime).toLocaleTimeString('en-US', timeWithOptions)} - ${new Date(bookingDate.endTime).toLocaleTimeString('en-US', timeWithOptions)}`
            : `${new Date(bookingDate.startTime).toLocaleString('en-US', dateTimeOptions)} - ${new Date(bookingDate.endTime).toLocaleString('en-US', dateTimeOptions)}`;

        return `
            <tr>
                <td style="padding: 10px; border-bottom: 1px solid #ddd;">${formattedDate}</td>
                <td style="padding: 10px; border-bottom: 1px solid #ddd;">${formattedTime}</td>
                <td style="padding: 10px; border-bottom: 1px solid #ddd;">${duration}</td>
            </tr>
        `;
    }).join('');

    let facilitiesHtml = '';
    if (booking.selectedFacilities && booking.selectedFacilities.length > 0) {
        const facilityRows = booking.selectedFacilities.map(f => `
            <tr>
                <td style="padding: 10px; border-bottom: 1px solid #ddd;">${f.name}</td>
                <td style="padding: 10px; border-bottom: 1px solid #ddd; text-align: right;">NGN ${f.cost.toLocaleString()}</td>
            </tr>
        `).join('');

        facilitiesHtml = `
            <tr style="background-color: #f2f2f2;">
                <th colspan="2" style="padding: 12px; text-align: left; border-bottom: 1px solid #ddd;">Facilities</th>
            </tr>
            ${facilityRows}
        `;
    }

    const userDetails = booking.bookingType === 'walk-in' ? booking.walkInUserDetails : booking.user;
    const phoneHtml = userDetails.phone ? `
        <tr>
            <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Phone:</strong></td>
            <td style="padding: 10px; border-bottom: 1px solid #ddd;">${userDetails.phone}</td>
        </tr>
    ` : '';
    const whatsappHtml = userDetails.whatsappNumber ? `
        <tr>
            <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>WhatsApp:</strong></td>
            <td style="padding: 10px; border-bottom: 1px solid #ddd;">${userDetails.whatsappNumber}</td>
        </tr>
    ` : '';

    return `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #ddd; padding: 20px;">
        <h2 style="color: #0056b3; text-align: center;">New Booking Notification</h2>
        <p>Hi ${booking.hall.owner.fullName},</p>
        <p>You have a new booking for your hall, ${booking.hall.name}. Here are the details:</p>

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
                    <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Booked On:</strong></td>
                    <td style="padding: 10px; border-bottom: 1px solid #ddd;">${new Date(booking.createdAt).toLocaleString('en-US', { dateStyle: 'full', timeStyle: 'short', timeZone: 'UTC' })} UTC</td>
                </tr>
                <tr>
                    <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Hall:</strong></td>
                    <td style="padding: 10px; border-bottom: 1px solid #ddd;">${booking.hall.name}</td>
                </tr>
                <tr>
                    <td colspan="2" style="padding: 10px; border-bottom: 1px solid #ddd;">
                        <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                            <thead>
                                <tr style="background-color: #f9f9f9;">
                                    <th style="padding: 10px; border-bottom: 1px solid #ddd;">Date</th>
                                    <th style="padding: 10px; border-bottom: 1px solid #ddd;">Time</th>
                                    <th style="padding: 10px; border-bottom: 1px solid #ddd;">Duration</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${bookingDatesHtml}
                            </tbody>
                        </table>
                    </td>
                </tr>
                <tr>
                    <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Event Details:</strong></td>
                    <td style="padding: 10px; border-bottom: 1px solid #ddd;">${booking.eventDetails}</td>
                </tr>
                ${facilitiesHtml}
                <tr style="background-color: #f2f2f2;">
                    <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Hall Price:</strong></td>
                    <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>NGN ${(booking.hallPrice || 0).toLocaleString()}</strong></td>
                </tr>
                <tr style="background-color: #f2f2f2;">
                    <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Facilities Price:</strong></td>
                    <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>NGN ${(booking.facilitiesPrice || 0).toLocaleString()}</strong></td>
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
                    <td style="padding: 10px; border-bottom: 1px solid #ddd;">${userDetails.fullName}</td>
                </tr>
                <tr>
                    <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Email:</strong></td>
                    <td style="padding: 10px; border-bottom: 1px solid #ddd;">${userDetails.email}</td>
                </tr>
                ${phoneHtml}
                ${whatsappHtml}
            </tbody>
        </table>

        <hr style="border: 0; border-top: 1px solid #eee; margin-top: 20px;" />
        <p style="font-size: 12px; color: #888; text-align: center;">&copy; HallBooker Inc. All rights reserved.</p>
    </div>
  `;
}

const generateHallCreationEmail = (name, hallName, hallLocation) => {
    return `
    <div style="font-family: Arial, sans-serif; line-height: 1.6;">
        <h2 style="color: #333;">New Hall Created!</h2>
        <p>Hi ${name},</p>
        <p>Congratulations! Your new hall has been successfully created on HallBooker.</p>
        <h3>Hall Details:</h3>
        <ul>
            <li><strong>Name:</strong> ${hallName}</li>
            <li><strong>Location:</strong> ${hallLocation}</li>
        </ul>
        <p>You can now manage your hall from your dashboard.</p>
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

        <p style="font-size: 14px; color: #555;">We have also attached a PDF receipt for your records.</p>
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
        <p>As a result, your halls have been deactivated and are no longer visible for booking. To continue using our services and reactivate your halls, please log in to your dashboard and purchase a new subscription.</p>
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
                    <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Hall:</strong></td>
                    <td style="padding: 10px; border-bottom: 1px solid #ddd;">${booking.hall.name}</td>
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
  generateHallCreationEmail,
  generateLicensePurchaseEmail,
  generateAdminDisbursementFailureEmail,
  generateMandateCancellationEmail,
  generatePendingBookingCancelledEmail,
  generateReviewNotificationEmail,
  generateHallOwnerApplicationEmailForUser,
  generateHallOwnerApplicationEmailForAdmin,
  generateHallOwnerApprovalEmailForUser,
  generateHallOwnerCreationEmailForUser,
  generatePromotionToHallOwnerEmailForUser,
  generateHallOwnerRejectionEmailForUser,
  generateStaffAdditionEmail,
  generateStaffRemovalEmail,
  generateRecurringBookingConfirmationEmail,
};

function generateRecurringBookingConfirmationEmail(customerName, bookings, hall) {
    const totalAmount = bookings.reduce((acc, booking) => acc + booking.totalPrice, 0);
    const totalHallPrice = bookings.reduce((acc, booking) => acc + booking.hallPrice, 0);
    const totalFacilitiesPrice = bookings.reduce((acc, booking) => acc + booking.facilitiesPrice, 0);
    const firstBooking = bookings[0];

    const bookingDatesHtml = bookings.map(b => {
        const startTime = new Date(b.bookingDates[0].startTime);
        const endTime = new Date(b.bookingDates[0].endTime);
        const dateOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        const timeOptions = { hour: '2-digit', minute: '2-digit', hour12: true };
        const formattedStartTime = startTime.toLocaleTimeString('en-US', timeOptions);
        const formattedEndTime = endTime.toLocaleTimeString('en-US', timeOptions);
        return `<li>${startTime.toLocaleDateString('en-US', dateOptions)} (${formattedStartTime} - ${formattedEndTime})</li>`;
    }).join('');

    return `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #ddd; padding: 20px;">
        <h2 style="color: #0056b3; text-align: center;">Recurring Booking Confirmation</h2>
        <p style="text-align: center; font-size: 14px; color: #555;">Recurring Booking ID: ${firstBooking.recurringBookingId}</p>
        <p style="text-align: center; font-size: 14px; color: #555;">Booked On: ${new Date(firstBooking.createdAt).toLocaleString('en-US', { dateStyle: 'full', timeStyle: 'short', timeZone: 'UTC' })} UTC</p>
        <p>Hi ${customerName},</p>
        <p>Your recurring booking for <strong>${hall.name}</strong> has been successfully confirmed. Here is a summary of your booked dates:</p>

        <h3>Booked Dates:</h3>
        <ul>
            ${bookingDatesHtml}
        </ul>

        <table style="width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 14px;">
            <thead>
                <tr style="background-color: #f2f2f2;">
                    <th colspan="2" style="padding: 12px; text-align: left; border-bottom: 2px solid #0056b3;">Reservation Summary</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Hall:</strong></td>
                    <td style="padding: 10px; border-bottom: 1px solid #ddd;">${hall.name}</td>
                </tr>
                <tr>
                    <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Total Bookings:</strong></td>
                    <td style="padding: 10px; border-bottom: 1px solid #ddd;">${bookings.length}</td>
                </tr>
                <tr>
                    <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Payment Status:</strong></td>
                    <td style="padding: 10px; border-bottom: 1px solid #ddd;">${firstBooking.paymentStatus}</td>
                </tr>
                <tr style="background-color: #f2f2f2;">
                    <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Total Hall Price:</strong></td>
                    <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>NGN ${totalHallPrice.toLocaleString()}</strong></td>
                </tr>
                <tr style="background-color: #f2f2f2;">
                    <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Total Facilities Price:</strong></td>
                    <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>NGN ${totalFacilitiesPrice.toLocaleString()}</strong></td>
                </tr>
                <tr style="background-color: #f2f2f2;">
                    <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Total Price:</strong></td>
                    <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>NGN ${totalAmount.toLocaleString()}</strong></td>
                </tr>
            </tbody>
        </table>

        <p>Thank you for choosing us for your recurring events!</p>
        <hr style="border: 0; border-top: 1px solid #eee; margin-top: 20px;" />
        <p style="font-size: 12px; color: #888; text-align: center;">&copy; HallBooker Inc. All rights reserved.</p>
    </div>
    `;
}

const generateReviewNotificationEmail = (userName, hallName, reviewLink) => {
    return `
    <div style="font-family: Arial, sans-serif; line-height: 1.6;">
        <h2 style="color: #333;">Share Your Experience!</h2>
        <p>Hi ${userName},</p>
        <p>We hope you enjoyed your event at <strong>${hallName}</strong>. Your feedback is important to us and to the community.</p>
        <p>Please take a moment to share your experience by leaving a review. Your review will help other users make informed decisions.</p>
        <div style="text-align: center; margin: 20px 0;">
            <a href="${reviewLink}" style="background-color: #0056b3; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-size: 16px;">Write a Review</a>
        </div>
        <p>Thank you for choosing HallBooker.</p>
        <hr style="border: 0; border-top: 1px solid #eee;" />
        <p style="font-size: 12px; color: #888;">&copy; HallBooker Inc. All rights reserved.</p>
    </div>
  `;
}

const generateStaffRemovalEmail = (staffName, ownerName) => {
  return `
    <div style="font-family: Arial, sans-serif; line-height: 1.6;">
      <h2 style="color: #333;">You have been removed as a staff member.</h2>
      <p>Hi ${staffName},</p>
      <p>You have been removed as a staff member by ${ownerName}.</p>
      <hr style="border: 0; border-top: 1px solid #eee;" />
      <p style="font-size: 12px; color: #888;">&copy; HallBooker Inc. All rights reserved.</p>
    </div>
  `;
};

const generateStaffAdditionEmail = (staffName, ownerName, halls) => {
  const hallsHtml = halls.map(hall => `<li><strong>${hall.name}</strong> at ${hall.location}</li>`).join('');

  return `
    <div style="font-family: Arial, sans-serif; line-height: 1.6;">
      <h2 style="color: #333;">You have been added as a staff member!</h2>
      <p>Hi ${staffName},</p>
      <p>You have been added as a staff member by ${ownerName}. You have been assigned to the following halls:</p>
      <ul>
        ${hallsHtml}
      </ul>
      <p>Log in to your dashboard to see the halls you have been assigned to.</p>
      <hr style="border: 0; border-top: 1px solid #eee;" />
      <p style="font-size: 12px; color: #888;">&copy; HallBooker Inc. All rights reserved.</p>
    </div>
  `;
};

const generateHallOwnerRejectionEmailForUser = (name, reason) => {
  return `
    <div style="font-family: Arial, sans-serif; line-height: 1.6;">
      <h2 style="color: #d9534f;">Application Status Update</h2>
      <p>Hi ${name},</p>
      <p>Thank you for your interest in becoming a hall owner. After careful review, we regret to inform you that your application has been rejected.</p>
      <p><strong>Reason for rejection:</strong></p>
      <p style="padding: 10px; border-left: 4px solid #d9534f; background-color: #f9f9f9;">
        ${reason}
      </p>
      <p>If you have any questions, please contact our support team.</p>
      <hr style="border: 0; border-top: 1px solid #eee;" />
      <p style="font-size: 12px; color: #888;">&copy; HallBooker Inc. All rights reserved.</p>
    </div>
  `;
};

const generateHallOwnerApplicationEmailForUser = (name) => {
  return `
    <div style="font-family: Arial, sans-serif; line-height: 1.6;">
      <h2 style="color: #333;">Application Received</h2>
      <p>Hi ${name},</p>
      <p>We have received your application to become a hall owner. Our team will review your application and get back to you shortly.</p>
      <p>Thank you for your interest in HallBooker.</p>
      <hr style="border: 0; border-top: 1px solid #eee;" />
      <p style="font-size: 12px; color: #888;">&copy; HallBooker Inc. All rights reserved.</p>
    </div>
  `;
};

const generateHallOwnerApplicationEmailForAdmin = (userName, userEmail) => {
  return `
    <div style="font-family: Arial, sans-serif; line-height: 1.6;">
      <h2 style="color: #333;">New Hall Owner Application</h2>
      <p>A new application to become a hall owner has been submitted.</p>
      <h3>User Details:</h3>
      <ul>
        <li><strong>Name:</strong> ${userName}</li>
        <li><strong>Email:</strong> ${userEmail}</li>
      </ul>
      <p>Please review the application in the admin dashboard.</p>
      <hr style="border: 0; border-top: 1px solid #eee;" />
      <p style="font-size: 12px; color: #888;">This is an automated notification from HallBooker.</p>
    </div>
  `;
};

const generateHallOwnerApprovalEmailForUser = (name) => {
  return `
    <div style="font-family: Arial, sans-serif; line-height: 1.6;">
      <h2 style="color: #4CAF50;">Application Approved!</h2>
      <p>Hi ${name},</p>
      <p>Congratulations! Your application to become a hall owner has been approved. You can now log in to your dashboard and start managing your halls.</p>
      <hr style="border: 0; border-top: 1px solid #eee;" />
      <p style="font-size: 12px; color: #888;">&copy; HallBooker Inc. All rights reserved.</p>
    </div>
  `;
};

const generateHallOwnerCreationEmailForUser = (name, password) => {
  return `
    <div style="font-family: Arial, sans-serif; line-height: 1.6;">
      <h2 style="color: #333;">Welcome to HallBooker!</h2>
      <p>Hi ${name},</p>
      <p>A hall owner account has been created for you on HallBooker. You can log in with the following temporary password:</p>
      <p style="font-size: 24px; font-weight: bold; color: #444; letter-spacing: 2px; border: 1px solid #ddd; padding: 10px; display: inline-block;">
        ${password}
      </p>
      <p>We recommend changing your password after your first login.</p>
      <hr style="border: 0; border-top: 1px solid #eee;" />
      <p style="font-size: 12px; color: #888;">&copy; HallBooker Inc. All rights reserved.</p>
    </div>
  `;
};

const generatePromotionToHallOwnerEmailForUser = (name) => {
  return `
    <div style="font-family: Arial, sans-serif; line-height: 1.6;">
      <h2 style="color: #4CAF50;">You have been promoted!</h2>
      <p>Hi ${name},</p>
      <p>Congratulations! You have been promoted to a hall owner. You can now log in to your dashboard and start managing your halls.</p>
      <hr style="border: 0; border-top: 1px solid #eee;" />
      <p style="font-size: 12px; color: #888;">&copy; HallBooker Inc. All rights reserved.</p>
    </div>
  `;
};