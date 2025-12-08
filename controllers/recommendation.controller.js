import { Hall } from '../models/hall.model.js';
import { Analytics } from '../models/analytics.model.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/apiError.js';
import { ApiResponse } from '../utils/apiResponse.js';

// --- Similarity Calculation Helper Functions ---

/**
 * Calculates the Haversine distance between two points on the earth.
 * @param {number} lat1 - Latitude of point 1.
 * @param {number} lon1 - Longitude of point 1.
 * @param {number} lat2 - Latitude of point 2.
 * @param {number} lon2 - Longitude of point 2.
 * @returns {number} The distance in kilometers.
 */
function getDistance(lat1, lon1, lat2, lon2) {
  if (lat1 == null || lon1 == null || lat2 == null || lon2 == null) {
    return Infinity;
  }
  const R = 6371; // Radius of the Earth in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in km
}

/**
 * Calculates the location similarity score.
 * @param {object} hallA - The reference hall.
 * @param {object} hallB - The hall to compare.
 * @returns {number} A score between 0 and 1.
 */
const calculateLocationScore = (hallA, hallB) => {
  if (!hallA.geoLocation?.coordinates || !hallB.geoLocation?.coordinates) {
    return 0;
  }
  const [lonA, latA] = hallA.geoLocation.coordinates;
  const [lonB, latB] = hallB.geoLocation.coordinates;

  const distance = getDistance(latA, lonA, latB, lonB);

  // Normalize score: 1 for 0km, 0 for 50km+
  const maxDistance = 50;
  const score = Math.max(0, 1 - distance / maxDistance);
  return score;
};

/**
 * Calculates the price similarity score based on daily rate.
 * @param {object} hallA - The reference hall.
 * @param {object} hallB - The hall to compare.
 * @returns {number} A score between 0 and 1.
 */
const calculatePriceScore = (hallA, hallB) => {
  const priceA = hallA.pricing?.dailyRate;
  const priceB = hallB.pricing?.dailyRate;

  if (priceA == null || priceB == null || priceA === 0) {
    return 0;
  }

  const difference = Math.abs(priceA - priceB);
  const score = Math.max(0, 1 - difference / priceA);
  return score;
};

/**
 * Calculates the capacity similarity score.
 * @param {object} hallA - The reference hall.
 * @param {object} hallB - The hall to compare.
 * @returns {number} A score between 0 and 1.
 */
const calculateCapacityScore = (hallA, hallB) => {
  const capacityA = hallA.capacity;
  const capacityB = hallB.capacity;

  if (capacityA == null || capacityB == null || capacityA === 0) {
    return 0;
  }

  const difference = Math.abs(capacityA - capacityB);
  const score = Math.max(0, 1 - difference / capacityA);
  return score;
};

/**
 * Calculates the facilities similarity score using the Jaccard index.
 * @param {object} hallA - The reference hall.
 * @param {object} hallB - The hall to compare.
 * @returns {number} A score between 0 and 1.
 */
const calculateFacilitiesScore = (hallA, hallB) => {
  const facilitiesA = new Set(hallA.facilities?.map(f => f.facility.toString()));
  const facilitiesB = new Set(hallB.facilities?.map(f => f.facility.toString()));

  if (facilitiesA.size === 0 && facilitiesB.size === 0) {
    return 1; // Both have no facilities, perfect match.
  }

  if (facilitiesA.size === 0 || facilitiesB.size === 0) {
    return 0; // One has facilities, the other doesn't.
  }

  const intersection = new Set([...facilitiesA].filter(x => facilitiesB.has(x)));
  const union = new Set([...facilitiesA, ...facilitiesB]);

  return intersection.size / union.size;
};

/**
 * @function calculateSimilarity
 * @description Calculate the weighted similarity score between two halls.
 * @param {object} hallA - The first hall object.
 * @param {object} hallB - The second hall object.
 * @param {Set<string>} recentlyViewedHalls - A set of recently viewed hall IDs.
 * @returns {number} The similarity score.
 */
const calculateSimilarity = (hallA, hallB, recentlyViewedHalls) => {
  const weights = {
    location: 0.40,
    price: 0.25,
    capacity: 0.20,
    facilities: 0.15,
  };

  const locationScore = calculateLocationScore(hallA, hallB);
  const priceScore = calculatePriceScore(hallA, hallB);
  const capacityScore = calculateCapacityScore(hallA, hallB);
  const facilitiesScore = calculateFacilitiesScore(hallA, hallB);

  let totalScore =
    locationScore * weights.location +
    priceScore * weights.price +
    capacityScore * weights.capacity +
    facilitiesScore * weights.facilities;

  // Boost score if the hall was recently viewed
  if (recentlyViewedHalls.has(hallB._id.toString())) {
    totalScore *= 1.2; // Apply a 20% boost
  }

  return totalScore;
};


// --- Main Controller Function ---

/**
 * @function getHallRecommendations
 * @description Get hall recommendations based on a given hall's attributes and user behavior.
 * @param {import('express').Request} req - The Express request object.
 * @param {import('express').Response} res - The Express response object.
 * @returns {Promise<void>}
 */
const getHallRecommendations = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user?._id;
  const ipAddress = req.ip;

  // Find the reference hall and populate its facilities
  const referenceHall = await Hall.findById(id).populate('facilities.facility');
  if (!referenceHall) {
    throw new ApiError(404, 'Hall not found');
  }

  // If the reference hall has no location, we can't give location-based recommendations.
  if (!referenceHall.geoLocation?.coordinates) {
    return res
      .status(200)
      .json(new ApiResponse(200, [], 'Cannot provide recommendations for a hall with no location.'));
  }

  const [lon, lat] = referenceHall.geoLocation.coordinates;
  const maxDistanceInMeters = 50 * 1000; // 50km

  // Find halls within a 50km radius
  const nearbyHalls = await Hall.find({
    _id: { $ne: id },
    geoLocation: {
      $near: {
        $geometry: {
          type: 'Point',
          coordinates: [lon, lat],
        },
        $maxDistance: maxDistanceInMeters,
      },
    },
  }).populate('facilities.facility');


  // Fetch user's recent interactions
  let recentlyViewedHalls = new Set();
  if (userId || ipAddress) {
    const query = userId ? { user: userId } : { ipAddress };
    const recentViews = await Analytics.find(query)
      .sort({ createdAt: -1 })
      .limit(10)
      .select('hall');

    recentlyViewedHalls = new Set(recentViews.map(view => view.hall.toString()));
  }

  // Calculate similarity score for each hall
  const recommendations = nearbyHalls.map(hall => {
    const similarityScore = calculateSimilarity(referenceHall, hall, recentlyViewedHalls);
    return { hall, similarityScore };
  });

  // Sort by similarity score in descending order
  recommendations.sort((a, b) => b.similarityScore - a.similarityScore);

  // Get the top 10 recommendations
  const top10RecommendedHalls = recommendations.slice(0, 10).map(rec => rec.hall);

  return res
    .status(200)
    .json(new ApiResponse(200, top10RecommendedHalls, 'Hall recommendations retrieved successfully'));
});

export { getHallRecommendations };
