import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/apiError.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { LicenseTier } from '../models/licenseTier.model.js';

// @desc    Create a new license tier
// @route   POST /api/v1/license-tiers
// @access  Private/Admin
const createLicenseTier = asyncHandler(async (req, res) => {
  const { name, minHalls, maxHalls, price, durationInDays } = req.body;

  if ([name, minHalls, maxHalls, price, durationInDays].some((field) => field === undefined || field === '')) {
    throw new ApiError(400, 'All fields are required');
  }

  const licenseTier = await LicenseTier.create({
    name,
    minHalls,
    maxHalls,
    price,
    durationInDays,
  });

  return res
    .status(201)
    .json(new ApiResponse(201, licenseTier, 'License tier created successfully'));
});

// @desc    Get all license tiers
// @route   GET /api/v1/license-tiers
// @access  Public (or Private/Admin, depending on requirements)
const getAllLicenseTiers = asyncHandler(async (req, res) => {
  const licenseTiers = await LicenseTier.find({});
  return res
    .status(200)
    .json(new ApiResponse(200, licenseTiers, 'License tiers fetched successfully'));
});

// @desc    Get a single license tier by ID
// @route   GET /api/v1/license-tiers/:id
// @access  Public
const getLicenseTierById = asyncHandler(async (req, res) => {
  const licenseTier = await LicenseTier.findById(req.params.id);
  if (!licenseTier) {
    throw new ApiError(404, 'License tier not found');
  }
  return res
    .status(200)
    .json(new ApiResponse(200, licenseTier, 'License tier fetched successfully'));
});

// @desc    Update a license tier
// @route   PATCH /api/v1/license-tiers/:id
// @access  Private/Admin
const updateLicenseTier = asyncHandler(async (req, res) => {
  const { name, minHalls, maxHalls, price, durationInDays } = req.body;
  const licenseTier = await LicenseTier.findByIdAndUpdate(
    req.params.id,
    { name, minHalls, maxHalls, price, durationInDays },
    { new: true, runValidators: true }
  );

  if (!licenseTier) {
    throw new ApiError(404, 'License tier not found');
  }

  return res
    .status(200)
    .json(new ApiResponse(200, licenseTier, 'License tier updated successfully'));
});

// @desc    Delete a license tier
// @route   DELETE /api/v1/license-tiers/:id
// @access  Private/Admin
const deleteLicenseTier = asyncHandler(async (req, res) => {
  const licenseTier = await LicenseTier.findById(req.params.id);

  if (!licenseTier) {
    throw new ApiError(404, 'License tier not found');
  }

  await licenseTier.deleteOne();

  return res
    .status(200)
    .json(new ApiResponse(200, {}, 'License tier deleted successfully'));
});

export {
  createLicenseTier,
  getAllLicenseTiers,
  getLicenseTierById,
  updateLicenseTier,
  deleteLicenseTier,
};
