import { Suitability } from '../models/suitability.model.js';
import { ApiError } from '../utils/apiError.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const createSuitability = asyncHandler(async (req, res) => {
  const { name } = req.body;

  if (!name) {
    throw new ApiError(400, 'Suitability name is required');
  }

  const existingSuitability = await Suitability.findOne({ name });
  if (existingSuitability) {
    throw new ApiError(400, 'Suitability category already exists');
  }

  const suitability = await Suitability.create({ name });

  return res
    .status(201)
    .json(new ApiResponse(201, suitability, 'Suitability category created successfully'));
});

const getAllSuitabilities = asyncHandler(async (req, res) => {
  const suitabilities = await Suitability.find();
  return res
    .status(200)
    .json(new ApiResponse(200, suitabilities, 'Suitability categories fetched successfully'));
});

const getSuitabilityById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const suitability = await Suitability.findById(id);

  if (!suitability) {
    throw new ApiError(404, 'Suitability category not found');
  }

  return res
    .status(200)
    .json(new ApiResponse(200, suitability, 'Suitability category fetched successfully'));
});

const updateSuitability = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name } = req.body;

  if (!name) {
    throw new ApiError(400, 'Suitability name is required');
  }

  const suitability = await Suitability.findByIdAndUpdate(
    id,
    { name },
    { new: true, runValidators: true }
  );

  if (!suitability) {
    throw new ApiError(404, 'Suitability category not found');
  }

  return res
    .status(200)
    .json(new ApiResponse(200, suitability, 'Suitability category updated successfully'));
});

const deleteSuitability = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const suitability = await Suitability.findByIdAndDelete(id);

  if (!suitability) {
    throw new ApiError(404, 'Suitability category not found');
  }

  return res
    .status(200)
    .json(new ApiResponse(200, {}, 'Suitability category deleted successfully'));
});

export {
  createSuitability,
  getAllSuitabilities,
  getSuitabilityById,
  updateSuitability,
  deleteSuitability,
};
