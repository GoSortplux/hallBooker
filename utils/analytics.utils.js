// This file will contain helper functions for the analytics v2 controller.

/**
 * @desc    Parses and validates the date range from the request query.
 * @param   {object} query - The request query object.
 * @returns {object} An object containing the startDate and endDate.
 */
export const getDateRange = (query) => {
  let { startDate, endDate } = query;

  if (!endDate) {
    endDate = new Date();
  } else {
    endDate = new Date(endDate);
  }

  if (!startDate) {
    startDate = new Date(endDate);
    startDate.setDate(endDate.getDate() - 7); // Default to the last 7 days
  } else {
    startDate = new Date(startDate);
  }

  // to ensure the end date is inclusive
  endDate.setHours(23, 59, 59, 999);


  return { startDate, endDate };
};
