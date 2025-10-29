import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { Country } from '../models/country.model.js';
import { State } from '../models/state.model.js';
import { LocalGovernment } from '../models/localGovernment.model.js';

const getCountries = asyncHandler(async (req, res) => {
  const countries = await Country.find({});
  res.status(200).json(new ApiResponse(200, countries, 'Countries fetched successfully'));
});

const getStates = asyncHandler(async (req, res) => {
  const states = await State.find({ country: req.params.countryId });
  res.status(200).json(new ApiResponse(200, states, 'States fetched successfully'));
});

const getLocalGovernments = asyncHandler(async (req, res) => {
  const lgas = await LocalGovernment.find({ state: req.params.stateId });
  res.status(200).json(new ApiResponse(200, lgas, 'Local Governments fetched successfully'));
});

export { getCountries, getStates, getLocalGovernments };
