import { ApiError } from './apiError.js';

export const calculateBookingPriceAndValidate = (startTime, endTime, pricing, selectedFacilities = []) => {
  const newBookingStartTime = new Date(startTime);
  const newBookingEndTime = new Date(endTime);

  // Basic time validation
  if (newBookingStartTime >= newBookingEndTime) {
    throw new ApiError(400, 'Start time must be before end time.');
  }

  const bookingDurationHours = (newBookingEndTime - newBookingStartTime) / (1000 * 60 * 60);

  // Duration validation
  if (bookingDurationHours * 60 < 30) {
    throw new ApiError(400, 'Booking must be for at least 30 minutes.');
  }
  if (bookingDurationHours > 7 * 24) {
    throw new ApiError(400, 'Booking cannot be for longer than 7 days.');
  }

  const { hourlyRate, dailyRate } = pricing;
  let hallPrice;

  // Case 1: Hall has both hourly and daily rates
  if (hourlyRate && dailyRate) {
    if (bookingDurationHours < 24) {
      // Use hourly rate for bookings less than 24 hours
      hallPrice = bookingDurationHours * hourlyRate;
    } else {
      // Use daily rate for bookings 24 hours or longer
      const bookingDurationDays = Math.ceil(bookingDurationHours / 24);
      hallPrice = bookingDurationDays * dailyRate;
    }
  }
  // Case 2: Hall has only an hourly rate
  else if (hourlyRate) {
    hallPrice = bookingDurationHours * hourlyRate;
  }
  // Case 3: Hall has only a daily rate
  else if (dailyRate) {
    if (bookingDurationHours < 24) {
      throw new ApiError(400, 'This hall requires a minimum booking of 24 hours.');
    }
    const bookingDurationDays = Math.ceil(bookingDurationHours / 24);
    hallPrice = bookingDurationDays * dailyRate;
  }
  // Case 4: No valid pricing (should be caught earlier, but good to have)
  else {
    throw new ApiError(400, 'Hall does not have valid pricing information.');
  }

  let facilitiesPrice = 0;
  const facilitiesWithCalculatedCosts = [];

  if (selectedFacilities && Array.isArray(selectedFacilities)) {
    selectedFacilities.forEach(facility => {
      let calculatedCost = 0;
      if (facility.chargeable) {
        if (facility.chargeMethod === 'flat') {
          calculatedCost = facility.cost;
        } else if (facility.chargeMethod === 'per_hour') {
          calculatedCost = facility.cost * bookingDurationHours;
        }
      }
      facilitiesPrice += calculatedCost;
      facilitiesWithCalculatedCosts.push({
        name: facility.name,
        cost: calculatedCost,
        chargeMethod: facility.chargeMethod,
      });
    });
  }

  const totalPrice = hallPrice + facilitiesPrice;

  return { totalPrice, facilitiesWithCalculatedCosts };
};