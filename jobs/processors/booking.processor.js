import mongoose from 'mongoose';
import { Booking } from '../../models/booking.model.js';
import { Hall } from '../../models/hall.model.js';
import { User } from '../../models/user.model.js';
import generateBookingId from '../../utils/bookingIdGenerator.js';
import sendEmail from '../../services/email.service.js';
import { generateRecurringBookingConfirmationEmail } from '../../utils/emailTemplates.js';
import { generateRecurringBookingPdfReceipt } from '../../utils/pdfGenerator.js';
import { getCompanyName } from '../../utils/settings.js';
import logger from '../../utils/logger.js';

const bookingProcessor = async (job) => {
  const {
    hallId,
    bookingDates,
    eventDetails,
    finalPaymentMethod,
    paymentStatus,
    bookedBy,
    walkInUserDetails,
    recurringBookingId,
    finalPricePerBooking,
    finalHallPricePerBooking,
    finalFacilitiesPricePerBooking,
    facilitiesWithCalculatedCosts,
    selectedFacilitiesData
  } = job.data;

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const hall = await Hall.findById(hallId).populate('owner', 'email fullName');
    const createdBookings = [];

    for (let i = 0; i < bookingDates.length; i++) {
      const dateRange = bookingDates[i];
      const bookingId = (i === 0 && !recurringBookingId.includes('REC-'))
        ? await generateBookingId(hall.name)
        : await generateBookingId(hall.name, i);

      const bookingData = {
        bookingId,
        hall: hallId,
        bookingDates: [{
            startTime: new Date(dateRange.startTime),
            endTime: new Date(dateRange.endTime)
        }],
        eventDetails,
        totalPrice: finalPricePerBooking,
        hallPrice: finalHallPricePerBooking,
        facilitiesPrice: finalFacilitiesPricePerBooking,
        paymentMethod: finalPaymentMethod,
        paymentStatus: paymentStatus,
        bookingType: 'walk-in',
        bookedBy,
        walkInUserDetails,
        isRecurring: true,
        recurringBookingId,
        selectedFacilities: facilitiesWithCalculatedCosts.map((cf, idx) => ({
          ...cf,
          facility: selectedFacilitiesData[idx].facilityId,
        })),
      };
      createdBookings.push(bookingData);
    }

    const newBookings = await Booking.create(createdBookings, { session });

    await session.commitTransaction();
    session.endSession();

    logger.info(`[BookingWorker] Successfully created ${newBookings.length} recurring bookings for ID: ${recurringBookingId}`);

    // Send notifications
    try {
      const companyName = await getCompanyName();
      if (walkInUserDetails.email) {
        const pdfReceipt = generateRecurringBookingPdfReceipt(walkInUserDetails, newBookings, hall, companyName);

        await sendEmail({
          email: walkInUserDetails.email,
          subject: `Recurring Booking Confirmation - ${companyName}`,
          html: generateRecurringBookingConfirmationEmail(walkInUserDetails.fullName, newBookings, hall, companyName),
          attachments: [{
            filename: `receipt-recurring-${recurringBookingId}.pdf`,
            content: Buffer.from(pdfReceipt),
            contentType: 'application/pdf'
          }],
        });
      }

      const admins = await User.find({ role: 'super-admin' });
      const notificationEmails = [hall.owner.email, ...admins.map(a => a.email)];

      await Promise.all(notificationEmails.map(email => {
          const recipientName = email === hall.owner.email ? hall.owner.fullName : 'Admin';
          return sendEmail({
              email,
              subject: 'New Recurring Booking Notification',
              html: generateRecurringBookingConfirmationEmail(recipientName, newBookings, hall, companyName),
          });
      }));
    } catch (emailError) {
      logger.error(`[BookingWorker] Email notification failed: ${emailError}`);
    }

    return { recurringBookingId, count: newBookings.length };

  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    logger.error(`[BookingWorker] Recurring booking failed: ${error}`);
    throw error;
  }
};

export default bookingProcessor;
