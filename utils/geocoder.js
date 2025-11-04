import axios from 'axios';
import dotenv from 'dotenv';
import { ApiError } from './apiError.js';

dotenv.config();

const geocode = async (address) => {
  try {
    const apiKey = process.env.GEOCODE_MAPS_CO_API_KEY;
    if (!apiKey) {
      throw new ApiError(500, 'Geocoding API key is not configured.');
    }

    const response = await axios.get('https://geocode.maps.co/search', {
      params: {
        q: address,
        api_key: apiKey,
      },
    });

    if (response.data && response.data.length > 0) {
      const { lat, lon, display_name } = response.data[0];
      return [
        {
          latitude: parseFloat(lat),
          longitude: parseFloat(lon),
          formattedAddress: display_name,
        },
      ];
    } else {
      return [];
    }
  } catch (error) {
    console.error('Geocoding error:', error);
    if (error.response) {
      throw new ApiError(error.response.status, error.response.data);
    }
    throw new ApiError(500, 'An error occurred during geocoding.');
  }
};

export default {
  geocode,
};
