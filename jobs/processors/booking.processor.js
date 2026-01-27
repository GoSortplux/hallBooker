import mongoose from 'mongoose';
import { Booking } from '../../models/booking.model.js';
import { Hall } from '../../models/hall.model.js';
import { User } from '../../models/user.model.js';
import generateBookingId from '../../utils/bookingIdGenerator.js';
import pdfQueue from '../queues/pdf.queue.js';
import sendEmail from '../../services/email.service.js';
import { generateRecurringBookingConfirmationEmail } from '../../utils/emailTemplates.js';

const bookingProcessor = async (job) => {
  const {
    hallId,
    generatedBookingRanges,
    eventDetails,
    finalPricePerBooking,
    finalHallPricePerBooking,
    finalFacilitiesPricePerBooking,
    finalPaymentMethod,
    paymentStatus,
    userId,
    walkInUserDetails,
    recurringBookingId,
    facilitiesWithCalculatedCosts,
    selectedFacilitiesData
  } = job.data;

  const hall = await Hall.findById(hallId).populate('owner', 'email fullName');
  if (!hall) throw new Error('Hall not found');

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const createdBookings = [];
    const firstBookingId = recurringBookingId.replace('REC-', '');

    for (let i = 0; i < generatedBookingRanges.length; i++) {
      const range = generatedBookingRanges[i];
      const bookingId = (i === 0) ? firstBookingId : await generateBookingId(hall.name, i);

      const bookingData = {
        bookingId,
        hall: hallId,
        bookingDates: [{ startTime: new Date(range.startTime), endTime: new Date(range.endTime) }],
        eventDetails,
        totalPrice: finalPricePerBooking,
        hallPrice: finalHallPricePerBooking,
        facilitiesPrice: finalFacilitiesPricePerBooking,
        paymentMethod: finalPaymentMethod,
        paymentStatus: paymentStatus,
        bookingType: 'walk-in',
        bookedBy: userId,
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

    console.log(`[BookingWorker] Successfully created ${newBookings.length} bookings for recurring ID ${recurringBookingId}`);

    // Offload PDF and notifications
    if (walkInUserDetails.email) {
      await pdfQueue.add('generateRecurringPdf', {
        type: 'recurring',
        data: { customerDetails: walkInUserDetails, bookings: newBookings, hall },
        emailOptions: {
          email: walkInUserDetails.email,
          subject: 'Recurring Booking Confirmation - HallBooker',
          html: generateRecurringBookingConfirmationEmail(walkInUserDetails.fullName, newBookings, hall),
        }
      });
    }

    const admins = await User.find({ role: 'super-admin' });
    const adminEmails = admins.map(admin => admin.email);
    const notificationEmails = [hall.owner.email, ...adminEmails];

    await Promise.all(notificationEmails.map(email => {
        const userIsAdmin = admins.some(admin => admin.email === email);
        const recipient = userIsAdmin ? admins.find(admin => admin.email === email)._id : hall.owner._id;
        return sendEmail({
            email,
            subject: 'New Recurring Booking Notification',
            html: generateRecurringBookingConfirmationEmail(hall.owner.fullName, newBookings, hall),
            notification: {
                recipient: recipient.toString(),
                message: `A new recurring booking has been made for hall: ${hall.name}.`,
                link: `/bookings/recurring/${recurringBookingId}`,
            },
        });
    }));

  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error(`[BookingWorker] Recurring booking creation failed for ${recurringBookingId}:`, error);
    throw error;
  }
};

export default bookingProcessor;
