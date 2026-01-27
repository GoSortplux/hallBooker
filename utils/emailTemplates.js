import { formatDuration } from './time.js';

const generateVerificationEmail = (name, token, companyName = 'Gobokin') => {
  return `
    <div style="font-family: Arial, sans-serif; line-height: 1.6;">
      <h2 style="color: #333;">Welcome to ${companyName}, ${name}!</h2>
      <p>Thank you for registering. To complete your registration, please use the following verification code:</p>
      <p style="font-size: 24px; font-weight: bold; color: #444; letter-spacing: 2px; border: 1px solid #ddd; padding: 10px; display: inline-block;">
        ${token}
      </p>
      <p>This code will expire in 10 minutes.</p>
      <p>If you did not sign up for a ${companyName} account, you can safely ignore this email.</p>
      <hr style="border: 0; border-top: 1px solid #eee;" />
      <p style="font-size: 12px; color: #888;">&copy; ${companyName}. All rights reserved.</p>
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

const generateMandateCancellationEmail = (userName, expiryDate, companyName = 'Gobokin') => {
    return `
    <div style="font-family: Arial, sans-serif; line-height: 1.6;">
        <h2 style="color: #333;">Subscription Auto-Renewal Cancelled</h2>
        <p>Hi ${userName},</p>
        <p>This email confirms that the automatic renewal for your subscription has been successfully cancelled.</p>
        <p>Your subscription will remain active and you can continue to enjoy all its benefits until the current billing period ends on <strong>${new Date(expiryDate).toDateString()}</strong>.</p>
        <p>If you change your mind, you can set up a new subscription from your dashboard at any time. Thank you for using ${companyName}.</p>
    </div>
  `;
};

const generateWelcomeEmail = (name, companyName = 'Gobokin') => {
    return `
    <div style="font-family: Arial, sans-serif; line-height: 1.6;">
        <h2 style="color: #333;">Welcome to ${companyName}, ${name}!</h2>
        <p>Your email has been successfully verified. We're excited to have you on board.</p>
        <p>You can now log in and start exploring our services.</p>
        <hr style="border: 0; border-top: 1px solid #eee;" />
        <p style="font-size: 12px; color: #888;">&copy; ${companyName}. All rights reserved.</p>
    </div>
  `;
}

const generateSubscriptionExpiryWarningEmail = (userName, tierName, expiryDate, companyName = 'Gobokin') => {
    return `
    <div style="font-family: Arial, sans-serif; line-height: 1.6;">
        <h2 style="color: #333;">Your Subscription is Expiring Soon</h2>
        <p>Hi ${userName},</p>
        <p>This is a reminder that your subscription for the <strong>${tierName}</strong> plan is expiring on <strong>${new Date(expiryDate).toDateString()}</strong>.</p>
        <p>To avoid any interruption in service and to keep your halls active, please renew your subscription at your earliest convenience.</p>
        <hr style="border: 0; border-top: 1px solid #eee;" />
        <p style="font-size: 12px; color: #888;">&copy; ${companyName}. All rights reserved.</p>
    </div>
  `;
}

const generateSubscriptionConfirmationEmail = (userName, tierName, price, expiryDate, companyName = 'Gobokin') => {
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
        <p>Thank you for choosing ${companyName}.</p>
        <hr style="border: 0; border-top: 1px solid #eee;" />
        <p style="font-size: 12px; color: #888;">&copy; ${companyName}. All rights reserved.</p>
    </div>
  `;
}

const generateAdminLicenseNotificationEmail = (ownerName, tierName, price, companyName = 'Gobokin') => {
    return `
    <div style="font-family: Arial, sans-serif; line-height: 1.6;">
        <h2 style="color: #333;">New Subscription Purchase</h2>
        <p>A new subscription has been purchased on ${companyName}.</p>
        <h3>Transaction Details:</h3>
        <ul>
            <li><strong>Hall Owner:</strong> ${ownerName}</li>
            <li><strong>Subscription Plan:</strong> ${tierName}</li>
            <li><strong>Amount Paid:</strong> NGN ${price.toLocaleString()}</li>
        </ul>
        <hr style="border: 0; border-top: 1px solid #eee;" />
        <p style="font-size: 12px; color: #888;">This is an automated notification from ${companyName}.</p>
    </div>
  `;
}

const generatePaymentConfirmationEmail = (booking, companyName = 'Gobokin') => {
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
                    <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Payment Method:</strong></td>
                    <td style="padding: 10px; border-bottom: 1px solid #ddd;">${booking.paymentMethod || 'N/A'}</td>
                </tr>
                <tr>
                    <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Payment Status:</strong></td>
                    <td style="padding: 10px; border-bottom: 1px solid #ddd; color: #4CAF50; font-weight: bold;">Paid</td>
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
        <p style="font-size: 14px; color: #555;">We have also attached an updated PDF receipt for your records.</p>
        <hr style="border: 0; border-top: 1px solid #eee; margin-top: 20px;" />
        <p style="font-size: 12px; color: #888; text-align: center;">&copy; ${companyName}. All rights reserved.</p>
    </div>
  `;
}

const generateBookingConfirmationEmail = (booking, companyName = 'Gobokin') => {
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
                <tr>
                    <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Payment Method:</strong></td>
                    <td style="padding: 10px; border-bottom: 1px solid #ddd;">${booking.paymentMethod || 'N/A'}</td>
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
        <p style="font-size: 12px; color: #888; text-align: center;">&copy; ${companyName}. All rights reserved.</p>
    </div>
  `;
}

const generateNewBookingNotificationEmailForOwner = (recipient, customer, booking, companyName = 'Gobokin') => {
    const timezone = 'Africa/Lagos';
    const bookedOn = new Date(booking.createdAt).toLocaleString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
        timeZone: timezone,
        timeZoneName: 'shortOffset'
    }).replace('GMT', 'UTC');

    const bookingDatesHtml = booking.bookingDates.map(bookingDate => {
        const duration = formatDuration(new Date(bookingDate.startTime), new Date(bookingDate.endTime));
        const dateOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: timezone };
        const timeOptions = { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: timezone };

        const formattedDate = new Date(bookingDate.startTime).toLocaleDateString('en-US', dateOptions);
        const formattedTime = `${new Date(bookingDate.startTime).toLocaleTimeString('en-US', timeOptions)} - ${new Date(bookingDate.endTime).toLocaleTimeString('en-US', timeOptions)}`;

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
                <td style="padding: 10px; border-bottom: 1px solid #ddd;">${f.name} (x${f.quantity})</td>
                <td style="padding: 10px; border-bottom: 1px solid #ddd; text-align: right;">NGN ${f.cost.toLocaleString()}</td>
            </tr>
        `).join('');

        facilitiesHtml = `
            <tr style="background-color: #f2f2f2;">
                <th colspan="2" style="padding: 12px; text-align: left; border-bottom: 1px solid #ddd;">Booked Facilities</th>
            </tr>
            ${facilityRows}
        `;
    }

    const phoneHtml = customer.phone ? `
        <tr>
            <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Phone:</strong></td>
            <td style="padding: 10px; border-bottom: 1px solid #ddd;">${customer.phone}</td>
        </tr>
    ` : '';

    const bookingTypeTitle = booking.paymentStatus === 'paid' ? 'Booking Payment Confirmed' : 'New Booking Notification';
    const mainMessage = booking.paymentStatus === 'paid'
        ? `Payment has been confirmed for a booking at <strong>${booking.hall.name}</strong>.`
        : `A new booking has been made for your hall, <strong>${booking.hall.name}</strong>.`;

    return `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #ddd; padding: 20px;">
        <h2 style="color: #0056b3; text-align: center;">${bookingTypeTitle}</h2>
        <p>Hi ${recipient.fullName},</p>
        <p>${mainMessage} Please find the details below:</p>

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
                    <td style="padding: 10px; border-bottom: 1px solid #ddd;">${bookedOn}</td>
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
                            <tbody>${bookingDatesHtml}</tbody>
                        </table>
                    </td>
                </tr>
                 <tr>
                    <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Event Details:</strong></td>
                    <td style="padding: 10px; border-bottom: 1px solid #ddd;">${booking.eventDetails}</td>
                </tr>
            </tbody>
        </table>

        <h3 style="color: #0056b3;">Customer Details</h3>
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 14px;">
            <thead>
                <tr style="background-color: #f2f2f2;">
                    <th colspan="2" style="padding: 12px; text-align: left; border-bottom: 2px solid #0056b3;">Contact Information</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td style="padding: 10px; border-bottom: 1px solid #ddd; width: 120px;"><strong>Full Name:</strong></td>
                    <td style="padding: 10px; border-bottom: 1px solid #ddd;">${customer.fullName}</td>
                </tr>
                <tr>
                    <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Email:</strong></td>
                    <td style="padding: 10px; border-bottom: 1px solid #ddd;">${customer.email}</td>
                </tr>
                ${phoneHtml}
            </tbody>
        </table>

        <h3 style="color: #0056b3;">Payment Details</h3>
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 14px;">
            <thead>
                <tr style="background-color: #f2f2f2;">
                    <th colspan="2" style="padding: 12px; text-align: left; border-bottom: 2px solid #0056b3;">Financial Summary</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Payment Status:</strong></td>
                    <td style="padding: 10px; border-bottom: 1px solid #ddd;">
                        <strong style="color: ${booking.paymentStatus === 'paid' ? '#4CAF50' : '#d9534f'};">${booking.paymentStatus.charAt(0).toUpperCase() + booking.paymentStatus.slice(1)}</strong>
                    </td>
                </tr>
                <tr>
                    <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Payment Method:</strong></td>
                    <td style="padding: 10px; border-bottom: 1px solid #ddd;">${booking.paymentMethod || 'N/A'}</td>
                </tr>
                ${facilitiesHtml}
                <tr>
                    <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Hall Price:</strong></td>
                    <td style="padding: 10px; border-bottom: 1px solid #ddd; text-align: right;">NGN ${(booking.hallPrice || 0).toLocaleString()}</td>
                </tr>
                <tr>
                    <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Facilities Price:</strong></td>
                    <td style="padding: 10px; border-bottom: 1px solid #ddd; text-align: right;">NGN ${(booking.facilitiesPrice || 0).toLocaleString()}</td>
                </tr>
                <tr style="background-color: #f2f2f2;">
                    <td style="padding: 10px; font-weight: bold;">Total Price:</td>
                    <td style="padding: 10px; font-weight: bold; text-align: right;">NGN ${booking.totalPrice.toLocaleString()}</td>
                </tr>
            </tbody>
        </table>

        <hr style="border: 0; border-top: 1px solid #eee; margin-top: 20px;" />
        <p style="font-size: 12px; color: #888; text-align: center;">This is an automated notification from ${companyName}.</p>
    </div>
  `;
};

const generateHallCreationEmail = (name, hallName, hallLocation, companyName = 'Gobokin') => {
    return `
    <div style="font-family: Arial, sans-serif; line-height: 1.6;">
        <h2 style="color: #333;">New Hall Created!</h2>
        <p>Hi ${name},</p>
        <p>Congratulations! Your new hall has been successfully created on ${companyName}.</p>
        <h3>Hall Details:</h3>
        <ul>
            <li><strong>Name:</strong> ${hallName}</li>
            <li><strong>Location:</strong> ${hallLocation}</li>
        </ul>
        <p>You can now manage your hall from your dashboard.</p>
        <hr style="border: 0; border-top: 1px solid #eee;" />
        <p style="font-size: 12px; color: #888;">&copy; ${companyName}. All rights reserved.</p>
    </div>
  `;
}

const generateLicensePurchaseEmail = (name, tierName, price, expiryDate, companyName = 'Gobokin') => {
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
        <p style="font-size: 12px; color: #888;">&copy; ${companyName}. All rights reserved.</p>
    </div>
  `;
}

const generateSubscriptionPaymentEmail = (subscription, companyName = 'Gobokin') => {
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
        <p style="font-size: 12px; color: #888; text-align: center;">&copy; ${companyName}. All rights reserved.</p>
    </div>
  `;
}

const generateSubscriptionExpiredEmail = (userName, tierName, companyName = 'Gobokin') => {
    return `
    <div style="font-family: Arial, sans-serif; line-height: 1.6;">
        <h2 style="color: #d9534f;">Your Subscription Has Expired</h2>
        <p>Hi ${userName},</p>
        <p>This is to notify you that your subscription for the <strong>${tierName}</strong> plan has expired.</p>
        <p>As a result, your halls have been deactivated and are no longer visible for booking. To continue using our services and reactivate your halls, please log in to your dashboard and purchase a new subscription.</p>
        <hr style="border: 0; border-top: 1px solid #eee;" />
        <p style="font-size: 12px; color: #888;">&copy; ${companyName}. All rights reserved.</p>
    </div>
  `;
}

const generatePendingBookingCancelledEmail = (recipientName, booking, companyName = 'Gobokin', reason = 'the payment was not completed within the allowed time frame') => {
    return `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #ddd; padding: 20px;">
        <h2 style="color: #d9534f; text-align: center;">Booking Automatically Cancelled</h2>
        <p>Hi ${recipientName},</p>
        <p>This is to inform you that a pending booking has been automatically cancelled because ${reason}.</p>

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
        <p style="font-size: 12px; color: #888; text-align: center;">This is an automated notification from ${companyName}.</p>
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
  generateReservationConfirmationEmail,
  generateNewReservationNotificationForOwner,
  generateReservationExpiredEmail,
  generateReservationReminderEmail,
  generateNewReservationPendingPaymentEmailForUser,
  generatePendingReservationCancelledEmail,
  generateAccountDeletionRequestEmailForUser,
  generateAccountDeletionRequestEmailForAdmin,
  generateAccountDeletionApprovedEmailForUser,
  generateAccountDeletionDeclinedEmailForUser,
  generateHallUnlistedEmailForOwner,
  generatePaymentFailedEmail
};

const generatePaymentFailedEmail = (booking, companyName = 'Gobokin') => {
  // Use a generic customer name if the user details aren't fully populated
  const customerName = booking.user ? booking.user.fullName : (booking.walkInUserDetails ? booking.walkInUserDetails.fullName : 'Customer');

  return `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #ddd; padding: 20px;">
        <h2 style="color: #d9534f; text-align: center;">Payment Failed</h2>
        <p>Hi ${customerName},</p>
        <p>We're sorry, but we were unable to process the payment for your booking. The transaction was either declined or cancelled.</p>

        <table style="width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 14px;">
            <thead>
                <tr style="background-color: #f2f2f2;">
                    <th colspan="2" style="padding: 12px; text-align: left; border-bottom: 2px solid #d9534f;">Booking Summary</th>
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
                <tr style="background-color: #f2f2f2;">
                    <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Total Amount:</strong></td>
                    <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>NGN ${booking.totalPrice.toLocaleString()}</strong></td>
                </tr>
            </tbody>
        </table>

        <p style="font-size: 14px; color: #555;">No payment has been charged to your account for this transaction.</p>
        <p style="font-size: 14px; color: #555;">You can attempt to make the payment again from your dashboard. If the problem persists, please try a different payment method or contact your bank.</p>

        <hr style="border: 0; border-top: 1px solid #eee; margin-top: 20px;" />
        <p style="font-size: 12px; color: #888; text-align: center;">&copy; ${companyName}. All rights reserved.</p>
    </div>
  `;
}

const generateHallUnlistedEmailForOwner = (ownerName, hallName, reason, companyName = 'Gobokin') => {
  return `
    <div style="font-family: Arial, sans-serif; line-height: 1.6;">
      <h2 style="color: #d9534f;">Your Hall Has Been Unlisted</h2>
      <p>Hi ${ownerName},</p>
      <p>This is to inform you that your hall, <strong>${hallName}</strong>, has been unlisted from our platform.</p>
      <p><strong>Reason for unlisting:</strong></p>
      <p style="padding: 10px; border-left: 4px solid #d9534f; background-color: #f9f9f9;">
        ${reason}
      </p>
      <p>Your hall will not appear in search results and will not be available for new bookings. Existing bookings are not affected.</p>
      <p>If you have any questions, please contact our support team.</p>
      <hr style="border: 0; border-top: 1px solid #eee;" />
      <p style="font-size: 12px; color: #888;">&copy; ${companyName}. All rights reserved.</p>
    </div>
  `;
};

const generateAccountDeletionDeclinedEmailForUser = (name, reason, companyName = 'Gobokin') => {
  return `
    <div style="font-family: Arial, sans-serif; line-height: 1.6;">
      <h2 style="color: #333;">Account Deletion Request Update</h2>
      <p>Hi ${name},</p>
      <p>We are writing to inform you that your request to delete your account has been declined.</p>
      <p><strong>Reason for decline:</strong></p>
      <p style="padding: 10px; border-left: 4px solid #f0ad4e; background-color: #f9f9f9;">
        ${reason}
      </p>
      <p>Your account remains active. If you have any questions, please contact our support team.</p>
      <hr style="border: 0; border-top: 1px solid #eee;" />
      <p style="font-size: 12px; color: #888;">&copy; ${companyName}. All rights reserved.</p>
    </div>
  `;
};

const generateAccountDeletionApprovedEmailForUser = (name, companyName = 'Gobokin') => {
  return `
    <div style="font-family: Arial, sans-serif; line-height: 1.6;">
      <h2 style="color: #333;">Your Account Has Been Deactivated</h2>
      <p>Hi ${name},</p>
      <p>As you requested, your account has been deactivated and will be permanently deleted in 7 days. We are sorry to see you go.</p>
      <p>If you did not request this, please contact our support team immediately.</p>
      <hr style="border: 0; border-top: 1px solid #eee;" />
      <p style="font-size: 12px; color: #888;">&copy; ${companyName}. All rights reserved.</p>
    </div>
  `;
};

const generateAccountDeletionRequestEmailForAdmin = (userName, userEmail, companyName = 'Gobokin') => {
  return `
    <div style="font-family: Arial, sans-serif; line-height: 1.6;">
      <h2 style="color: #d9534f;">User Account Deletion Request</h2>
      <p>A user has requested to delete their account.</p>
      <h3>User Details:</h3>
      <ul>
        <li><strong>Name:</strong> ${userName}</li>
        <li><strong>Email:</strong> ${userEmail}</li>
      </ul>
      <p>Please review this request in the admin dashboard and take the appropriate action (approve or decline).</p>
      <hr style="border: 0; border-top: 1px solid #eee;" />
      <p style="font-size: 12px; color: #888;">This is an automated notification from ${companyName}.</p>
    </div>
  `;
};

const generateAccountDeletionRequestEmailForUser = (name, companyName = 'Gobokin') => {
  return `
    <div style="font-family: Arial, sans-serif; line-height: 1.6;">
      <h2 style="color: #333;">Account Deletion Request Received</h2>
      <p>Hi ${name},</p>
      <p>We have received your request to delete your account. Your account access has been restricted while we process your request.</p>
      <p>An administrator will review your request shortly. You will receive another email once a decision has been made.</p>
      <p>If you did not make this request, please contact our support team immediately.</p>
      <hr style="border: 0; border-top: 1px solid #eee;" />
      <p style="font-size: 12px; color: #888;">&copy; ${companyName}. All rights reserved.</p>
    </div>
  `;
};

const generatePendingReservationCancelledEmail = (recipientName, reservation, companyName = 'Gobokin', reason = 'the reservation fee was not paid within the allowed time frame') => {
    return `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #ddd; padding: 20px;">
        <h2 style="color: #d9534f; text-align: center;">Reservation Automatically Cancelled</h2>
        <p>Hi ${recipientName},</p>
        <p>This is to inform you that a pending reservation has been automatically cancelled because ${reason}.</p>

        <table style="width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 14px;">
            <thead>
                <tr style="background-color: #f2f2f2;">
                    <th colspan="2" style="padding: 12px; text-align: left; border-bottom: 2px solid #d9534f;">Cancelled Reservation Details</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td style="padding: 10px; border-bottom: 1px solid #ddd; width: 120px;"><strong>Reservation ID:</strong></td>
                    <td style="padding: 10px; border-bottom: 1px solid #ddd;">${reservation.reservationId}</td>
                </tr>
                <tr>
                    <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Hall:</strong></td>
                    <td style="padding: 10px; border-bottom: 1px solid #ddd;">${reservation.hall.name}</td>
                </tr>
                <tr>
                    <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Reserved On:</strong></td>
                    <td style="padding: 10px; border-bottom: 1px solid #ddd;">${new Date(reservation.createdAt).toLocaleString('en-US', { dateStyle: 'full', timeStyle: 'short' })}</td>
                </tr>
            </tbody>
        </table>

        <p style="font-size: 14px; color: #555;">No further action is required. The timeslot may now be available for others to book.</p>
        <hr style="border: 0; border-top: 1px solid #eee; margin-top: 20px;" />
        <p style="font-size: 12px; color: #888; text-align: center;">This is an automated notification from ${companyName}.</p>
    </div>
  `;
}

const generateNewReservationPendingPaymentEmailForUser = (customerName, reservation, companyName = 'Gobokin') => {
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  // The payment for the initial reservation fee is now handled by the frontend,
  // which will trigger the payment initialization endpoint.
  const paymentUrl = `${frontendUrl}/reservations/${reservation.reservationId}/pay`;

  return `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #ddd; padding: 20px;">
        <h2 style="color: #f0ad4e; text-align: center;">Your Reservation is Pending Payment</h2>
        <p>Hi ${customerName},</p>
        <p>You have successfully created a reservation for <strong>${reservation.hall.name}</strong>. Please complete the payment for the reservation fee to hold your slot.</p>

        <table style="width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 14px;">
            <thead>
                <tr style="background-color: #f2f2f2;">
                    <th colspan="2" style="padding: 12px; text-align: left; border-bottom: 2px solid #f0ad4e;">Reservation Summary</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td style="padding: 10px; border-bottom: 1px solid #ddd; width: 150px;"><strong>Reservation ID:</strong></td>
                    <td style="padding: 10px; border-bottom: 1px solid #ddd;">${reservation.reservationId}</td>
                </tr>
                <tr>
                    <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Hall:</strong></td>
                    <td style="padding: 10px; border-bottom: 1px solid #ddd;">${reservation.hall.name}</td>
                </tr>
                <tr>
                    <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Event Details:</strong></td>
                    <td style="padding: 10px; border-bottom: 1px solid #ddd;">${reservation.eventDetails}</td>
                </tr>
            </tbody>
        </table>

        <h3 style="color: #f0ad4e;">Payment Required</h3>
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 14px;">
             <thead>
                <tr style="background-color: #f2f2f2;">
                    <th style="padding: 12px; text-align: left; border-bottom: 1px solid #ddd;">Description</th>
                    <th style="padding: 12px; text-align: right; border-bottom: 1px solid #ddd;">Amount</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td style="padding: 12px; font-weight: bold; border-bottom: 1px solid #ddd;">Reservation Fee Due</td>
                    <td style="padding: 12px; font-weight: bold; text-align: right; border-bottom: 1px solid #ddd;">NGN ${reservation.reservationFee.toLocaleString()}</td>
                </tr>
            </tbody>
        </table>

        <p style="font-size: 14px; color: #d9534f; text-align: center;">This reservation is not confirmed until the fee is paid. The slot will be held for a limited time.</p>

        <div style="text-align: center; margin: 30px 0;">
            <a href="${paymentUrl}" style="background-color: #0056b3; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-size: 16px;">Pay Reservation Fee Now</a>
        </div>

        <hr style="border: 0; border-top: 1px solid #eee; margin-top: 20px;" />
        <p style="font-size: 12px; color: #888; text-align: center;">&copy; ${companyName}. All rights reserved.</p>
    </div>
  `;
};

const generateReservationConfirmationEmail = (customerName, reservation, companyName = 'Gobokin') => {
  const remainingBalance = reservation.totalPrice - reservation.reservationFee;
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  const paymentUrl = `${frontendUrl}/reservations/${reservation.reservationId}/pay`; // Assuming a route like this

  return `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #ddd; padding: 20px;">
        <h2 style="color: #0056b3; text-align: center;">Your Reservation is Confirmed!</h2>
        <p>Hi ${customerName},</p>
        <p>Thank you for making a reservation with ${companyName}. Your requested time slot for <strong>${reservation.hall.name}</strong> has been successfully held. To complete your booking, you must pay the remaining balance before the cutoff date.</p>

        <table style="width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 14px;">
            <thead>
                <tr style="background-color: #f2f2f2;">
                    <th colspan="2" style="padding: 12px; text-align: left; border-bottom: 2px solid #0056b3;">Reservation Summary</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td style="padding: 10px; border-bottom: 1px solid #ddd; width: 150px;"><strong>Reservation ID:</strong></td>
                    <td style="padding: 10px; border-bottom: 1px solid #ddd;">${reservation.reservationId}</td>
                </tr>
                <tr>
                    <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Hall:</strong></td>
                    <td style="padding: 10px; border-bottom: 1px solid #ddd;">${reservation.hall.name}</td>
                </tr>
                <tr>
                    <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Event Details:</strong></td>
                    <td style="padding: 10px; border-bottom: 1px solid #ddd;">${reservation.eventDetails}</td>
                </tr>
                 <tr>
                    <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Valid Until:</strong></td>
                    <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>${new Date(reservation.cutoffDate).toLocaleString('en-US', { dateStyle: 'full', timeStyle: 'short', timeZone: 'Africa/Lagos' })}</strong></td>
                </tr>
            </tbody>
        </table>

        <h3 style="color: #0056b3;">Payment Summary</h3>
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 14px;">
             <thead>
                <tr style="background-color: #f2f2f2;">
                    <th style="padding: 12px; text-align: left; border-bottom: 1px solid #ddd;">Description</th>
                    <th style="padding: 12px; text-align: right; border-bottom: 1px solid #ddd;">Amount</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td style="padding: 10px; border-bottom: 1px solid #ddd;">Total Booking Price</td>
                    <td style="padding: 10px; border-bottom: 1px solid #ddd; text-align: right;">NGN ${reservation.totalPrice.toLocaleString()}</td>
                </tr>
                 <tr>
                    <td style="padding: 10px; border-bottom: 1px solid #ddd;">Reservation Fee Paid</td>
                    <td style="padding: 10px; border-bottom: 1px solid #ddd; text-align: right;">- NGN ${reservation.reservationFee.toLocaleString()}</td>
                </tr>
                <tr style="background-color: #f9f9f9;">
                    <td style="padding: 12px; font-weight: bold; border-bottom: 1px solid #ddd;">Remaining Balance</td>
                    <td style="padding: 12px; font-weight: bold; text-align: right; border-bottom: 1px solid #ddd;">NGN ${remainingBalance.toLocaleString()}</td>
                </tr>
            </tbody>
        </table>

        <p style="font-size: 14px; color: #d9534f; text-align: center;">Please note: You must pay the remaining balance before the expiration date to secure your booking.</p>

        <div style="text-align: center; margin: 30px 0;">
            <a href="${paymentUrl}" style="background-color: #4CAF50; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-size: 16px;">Pay Now to Confirm Booking</a>
        </div>

        <hr style="border: 0; border-top: 1px solid #eee; margin-top: 20px;" />
        <p style="font-size: 12px; color: #888; text-align: center;">&copy; ${companyName}. All rights reserved.</p>
    </div>
  `;
};

const generateNewReservationNotificationForOwner = (recipient, customer, reservation, companyName = 'Gobokin') => {
  const isSuperAdmin = recipient.role.includes('super-admin');
  const hallOwnershipText = isSuperAdmin ? `a hall on the platform, <strong>${reservation.hall.name}</strong>` : `your hall, <strong>${reservation.hall.name}</strong>`;
  const paymentStatus = reservation.paymentStatus === 'paid' ? 'Fee Paid' : 'Pending Fee Payment';
  const paymentStatusColor = reservation.paymentStatus === 'paid' ? '#4CAF50' : '#f0ad4e';
   const reservedOn = new Date(reservation.createdAt).toLocaleString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
        timeZone: 'Africa/Lagos',
        timeZoneName: 'shortOffset'
    }).replace('GMT', 'UTC');

  return `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #ddd; padding: 20px;">
        <h2 style="color: #0056b3; text-align: center;">New Reservation Notification</h2>
        <p>Hi ${recipient.fullName},</p>
        <p>A new reservation has been made for ${hallOwnershipText} by <strong>${customer.fullName}</strong>. Please find the details below:</p>

        <table style="width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 14px;">
            <thead>
                <tr style="background-color: #f2f2f2;">
                    <th colspan="2" style="padding: 12px; text-align: left; border-bottom: 2px solid #0056b3;">Reservation Details</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td style="padding: 10px; border-bottom: 1px solid #ddd; width: 150px;"><strong>Reservation ID:</strong></td>
                    <td style="padding: 10px; border-bottom: 1px solid #ddd;">${reservation.reservationId}</td>
                </tr>
                 <tr>
                    <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Reserved On:</strong></td>
                    <td style="padding: 10px; border-bottom: 1px solid #ddd;">${reservedOn}</td>
                </tr>
                <tr>
                    <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Hall Name:</strong></td>
                    <td style="padding: 10px; border-bottom: 1px solid #ddd;">${reservation.hall.name}</td>
                </tr>
                <tr>
                    <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Event Details:</strong></td>
                    <td style="padding: 10px; border-bottom: 1px solid #ddd;">${reservation.eventDetails}</td>
                </tr>
                <tr>
                    <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Expires On:</strong></td>
                    <td style="padding: 10px; border-bottom: 1px solid #ddd;">${new Date(reservation.cutoffDate).toLocaleString('en-US', { dateStyle: 'full', timeStyle: 'short', timeZone: 'Africa/Lagos' })}</td>
                </tr>
            </tbody>
        </table>

        <h3 style="color: #0056b3;">Customer Details</h3>
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 14px;">
             <thead>
                <tr style="background-color: #f2f2f2;">
                    <th colspan="2" style="padding: 12px; text-align: left; border-bottom: 1px solid #ddd;">Contact Information</th>
                </tr>
            </thead>
            <tbody>
                 <tr>
                    <td style="padding: 10px; border-bottom: 1px solid #ddd; width: 150px;"><strong>Full Name:</strong></td>
                    <td style="padding: 10px; border-bottom: 1px solid #ddd;">${customer.fullName}</td>
                </tr>
                <tr>
                    <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Email:</strong></td>
                    <td style="padding: 10px; border-bottom: 1px solid #ddd;">${customer.email || 'N/A'}</td>
                </tr>
                <tr>
                    <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Phone:</strong></td>
                    <td style="padding: 10px; border-bottom: 1px solid #ddd;">${customer.phone || 'N/A'}</td>
                </tr>
            </tbody>
        </table>

        <h3 style="color: #0056b3;">Payment Status</h3>
         <table style="width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 14px;">
            <tbody>
                <tr style="background-color: #f9f9f9;">
                    <td style="padding: 12px; font-weight: bold; border-bottom: 1px solid #ddd;">Reservation Fee Status</td>
                    <td style="padding: 12px; font-weight: bold; text-align: right; border-bottom: 1px solid #ddd; color: ${paymentStatusColor};">${paymentStatus}</td>
                </tr>
            </tbody>
        </table>

        <hr style="border: 0; border-top: 1px solid #eee; margin-top: 20px;" />
        <p style="font-size: 12px; color: #888; text-align: center;">This is an automated notification from ${companyName}.</p>
    </div>
  `;
};

const generateReservationExpiredEmail = (customerName, reservation, companyName = 'Gobokin') => {
  return `
    <div style="font-family: Arial, sans-serif; color: #333;">
      <h2>Reservation Expired</h2>
      <p>Dear ${customerName},</p>
      <p>We're writing to inform you that your reservation for <strong>${reservation.hall.name}</strong> has expired because it was not converted into a booking before the cutoff time.</p>
      <p>The time slot may now be available for other users. If you are still interested, please visit our website to make a new booking or reservation.</p>
      <p>Thank you for your interest in ${companyName}.</p>
    </div>
  `;
};

const generateReservationReminderEmail = (customerName, reservation, companyName = 'Gobokin') => {
  return `
    <div style="font-family: Arial, sans-serif; color: #333;">
      <h2>Reservation Reminder</h2>
      <p>Dear ${customerName},</p>
      <p>This is a friendly reminder that your reservation for <strong>${reservation.hall.name}</strong> is due to expire on <strong>${new Date(reservation.cutoffDate).toLocaleString('en-US', { timeZone: 'Africa/Lagos' })}</strong>.</p>
      <p>Please log in to your account to convert your reservation into a full booking to secure your date.</p>
      <p>Thank you for using ${companyName}!</p>
    </div>
  `;
};

function generateRecurringBookingConfirmationEmail(customerName, bookings, hall, companyName = 'Gobokin') {
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
                <tr>
                    <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Payment Method:</strong></td>
                    <td style="padding: 10px; border-bottom: 1px solid #ddd;">${firstBooking.paymentMethod || 'N/A'}</td>
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
        <p style="font-size: 12px; color: #888; text-align: center;">&copy; ${companyName}. All rights reserved.</p>
    </div>
    `;
}

const generateReviewNotificationEmail = (userName, hallName, reviewLink, companyName = 'Gobokin') => {
    return `
    <div style="font-family: Arial, sans-serif; line-height: 1.6;">
        <h2 style="color: #333;">Share Your Experience!</h2>
        <p>Hi ${userName},</p>
        <p>We hope you enjoyed your event at <strong>${hallName}</strong>. Your feedback is important to us and to the community.</p>
        <p>Please take a moment to share your experience by leaving a review. Your review will help other users make informed decisions.</p>
        <div style="text-align: center; margin: 20px 0;">
            <a href="${reviewLink}" style="background-color: #0056b3; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-size: 16px;">Write a Review</a>
        </div>
        <p>Thank you for choosing ${companyName}.</p>
        <hr style="border: 0; border-top: 1px solid #eee;" />
        <p style="font-size: 12px; color: #888;">&copy; ${companyName}. All rights reserved.</p>
    </div>
  `;
}

const generateStaffRemovalEmail = (staffName, ownerName, companyName = 'Gobokin') => {
  return `
    <div style="font-family: Arial, sans-serif; line-height: 1.6;">
      <h2 style="color: #333;">You have been removed as a staff member.</h2>
      <p>Hi ${staffName},</p>
      <p>You have been removed as a staff member by ${ownerName}.</p>
      <hr style="border: 0; border-top: 1px solid #eee;" />
      <p style="font-size: 12px; color: #888;">&copy; ${companyName}. All rights reserved.</p>
    </div>
  `;
};

const generateStaffAdditionEmail = (staffName, ownerName, halls, companyName = 'Gobokin') => {
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
      <p style="font-size: 12px; color: #888;">&copy; ${companyName}. All rights reserved.</p>
    </div>
  `;
};

const generateHallOwnerRejectionEmailForUser = (name, reason, companyName = 'Gobokin') => {
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
      <p style="font-size: 12px; color: #888;">&copy; ${companyName}. All rights reserved.</p>
    </div>
  `;
};

const generateHallOwnerApplicationEmailForUser = (name, companyName = 'Gobokin') => {
  return `
    <div style="font-family: Arial, sans-serif; line-height: 1.6;">
      <h2 style="color: #333;">Application Received</h2>
      <p>Hi ${name},</p>
      <p>We have received your application to become a hall owner. Our team will review your application and get back to you shortly.</p>
      <p>Thank you for your interest in ${companyName}.</p>
      <hr style="border: 0; border-top: 1px solid #eee;" />
      <p style="font-size: 12px; color: #888;">&copy; ${companyName}. All rights reserved.</p>
    </div>
  `;
};

const generateHallOwnerApplicationEmailForAdmin = (userName, userEmail, companyName = 'Gobokin') => {
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
      <p style="font-size: 12px; color: #888;">This is an automated notification from ${companyName}.</p>
    </div>
  `;
};

const generateHallOwnerApprovalEmailForUser = (name, companyName = 'Gobokin') => {
  return `
    <div style="font-family: Arial, sans-serif; line-height: 1.6;">
      <h2 style="color: #4CAF50;">Application Approved!</h2>
      <p>Hi ${name},</p>
      <p>Congratulations! Your application to become a hall owner has been approved. You can now log in to your dashboard and start managing your halls.</p>
      <hr style="border: 0; border-top: 1px solid #eee;" />
      <p style="font-size: 12px; color: #888;">&copy; ${companyName}. All rights reserved.</p>
    </div>
  `;
};

const generateHallOwnerCreationEmailForUser = (name, password, companyName = 'Gobokin') => {
  return `
    <div style="font-family: Arial, sans-serif; line-height: 1.6;">
      <h2 style="color: #333;">Welcome to ${companyName}!</h2>
      <p>Hi ${name},</p>
      <p>A hall owner account has been created for you on ${companyName}. You can log in with the following temporary password:</p>
      <p style="font-size: 24px; font-weight: bold; color: #444; letter-spacing: 2px; border: 1px solid #ddd; padding: 10px; display: inline-block;">
        ${password}
      </p>
      <p>We recommend changing your password after your first login.</p>
      <hr style="border: 0; border-top: 1px solid #eee;" />
      <p style="font-size: 12px; color: #888;">&copy; ${companyName}. All rights reserved.</p>
    </div>
  `;
};

const generatePromotionToHallOwnerEmailForUser = (name, companyName = 'Gobokin') => {
  return `
    <div style="font-family: Arial, sans-serif; line-height: 1.6;">
      <h2 style="color: #4CAF50;">You have been promoted!</h2>
      <p>Hi ${name},</p>
      <p>Congratulations! You have been promoted to a hall owner. You can now log in to your dashboard and start managing your halls.</p>
      <hr style="border: 0; border-top: 1px solid #eee;" />
      <p style="font-size: 12px; color: #888;">&copy; ${companyName}. All rights reserved.</p>
    </div>
  `;
};
