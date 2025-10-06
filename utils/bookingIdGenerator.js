import { Booking } from '../models/booking.model.js';

const generateBookingId = async (venueName) => {
  const today = new Date();
  const day = String(today.getDate()).padStart(2, '0');
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const year = String(today.getFullYear()).slice(-2);
  const dateString = `${day}-${month}-${year}`;

  const venuePrefix = venueName.substring(0, 3).toUpperCase();
  const prefix = `${venuePrefix}-${dateString}-`;

  const lastBooking = await Booking.findOne({ bookingId: { $regex: `^${prefix}` } })
    .sort({ bookingId: -1 })
    .exec();

  let serialNumber = 1;
  if (lastBooking) {
    const lastSerialNumber = parseInt(lastBooking.bookingId.split('-').pop(), 10);
    serialNumber = lastSerialNumber + 1;
  }

  const paddedSerialNumber = String(serialNumber).padStart(3, '0');
  return `${prefix}${paddedSerialNumber}`;
};

export default generateBookingId;