import { ApiError } from './apiError.js';

export const calculateBookingPriceAndValidate = (bookingDates, pricing, facilitiesToPrice = []) => {
  if (!bookingDates || !Array.isArray(bookingDates) || bookingDates.length === 0) {
    throw new ApiError(400, 'Booking dates are required.');
  }

  let totalHallPrice = 0;
  let totalFacilitiesPrice = 0;
  const facilitiesWithCalculatedCosts = [];

  bookingDates.forEach(bookingDate => {
    const { startTime, endTime } = bookingDate;
    const newBookingStartTime = new Date(startTime);
    const newBookingEndTime = new Date(endTime);

    if (newBookingStartTime >= newBookingEndTime) {
      throw new ApiError(400, 'Start time must be before end time for all booking dates.');
    }

    const bookingDurationHours = (newBookingEndTime - newBookingStartTime) / (1000 * 60 * 60);

    if (bookingDurationHours * 60 < 30) {
      throw new ApiError(400, 'Booking must be for at least 30 minutes for all booking dates.');
    }
    if (bookingDurationHours > 7 * 24) {
      throw new ApiError(400, 'Booking cannot be for longer than 7 days for any single booking date.');
    }

    const { hourlyRate, dailyRate } = pricing;
    let hallPrice;

    if (hourlyRate && dailyRate) {
      hallPrice = bookingDurationHours < 24 ? bookingDurationHours * hourlyRate : Math.ceil(bookingDurationHours / 24) * dailyRate;
    } else if (hourlyRate) {
      hallPrice = bookingDurationHours * hourlyRate;
    } else if (dailyRate) {
      if (bookingDurationHours < 24) {
        throw new ApiError(400, 'This hall requires a minimum booking of 24 hours for all booking dates.');
      }
      hallPrice = Math.ceil(bookingDurationHours / 24) * dailyRate;
    } else {
      throw new ApiError(400, 'Hall does not have valid pricing information.');
    }
    totalHallPrice += hallPrice;

    let facilitiesPriceForDate = 0;
    if (facilitiesToPrice && Array.isArray(facilitiesToPrice)) {
      facilitiesToPrice.forEach(facility => {
        if (facility.requestedQuantity <= 0) {
          throw new ApiError(400, 'Facility quantity must be a positive number.');
        }
        if (facility.requestedQuantity > facility.quantity) {
          throw new ApiError(400, `Cannot book ${facility.requestedQuantity} of ${facility.facility.name}. Only ${facility.quantity} available.`);
        }

        let calculatedCost = 0;
        if (facility.chargeable) {
          const baseCost = facility.cost;
          let multiplier = 1;

          if (facility.chargeMethod === 'per_hour') {
            multiplier = bookingDurationHours;
          } else if (facility.chargeMethod === 'per_day') {
            multiplier = Math.ceil(bookingDurationHours / 24);
          }

          const costByDuration = baseCost * multiplier;

          calculatedCost = facility.chargePerUnit
            ? costByDuration * facility.requestedQuantity
            : costByDuration;
        }

        facilitiesPriceForDate += calculatedCost;

        const existingFacility = facilitiesWithCalculatedCosts.find(f => f.name === facility.facility.name);
        if (existingFacility) {
          existingFacility.cost += calculatedCost;
        } else {
          facilitiesWithCalculatedCosts.push({
            name: facility.facility.name,
            cost: calculatedCost,
            chargeMethod: facility.chargeMethod,
            quantity: facility.requestedQuantity,
          });
        }
      });
    }
    totalFacilitiesPrice += facilitiesPriceForDate;
  });

  let totalPrice = totalHallPrice + totalFacilitiesPrice;
  totalPrice = Math.round(totalPrice * 100) / 100;

  return { totalPrice, hallPrice: totalHallPrice, facilitiesPrice: totalFacilitiesPrice, facilitiesWithCalculatedCosts };
};