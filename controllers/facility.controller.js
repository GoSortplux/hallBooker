import { Facility } from '../models/facility.model.js';
import { Hall } from '../models/hall.model.js';
import Setting from '../models/setting.model.js';
import { ApiError } from '../utils/apiError.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';

// @desc    Create a new facility
// @route   POST /api/v1/facilities
// @access  Private/Super-Admin
const createFacility = asyncHandler(async (req, res) => {
  const { name } = req.body;

  if (!name) {
    throw new ApiError(400, 'Facility name is required');
  }

  const facilityExists = await Facility.findOne({ name });
  if (facilityExists) {
    throw new ApiError(400, 'Facility already exists');
  }

  const facility = await Facility.create({
    name,
  });

  return res
    .status(201)
    .json(new ApiResponse(201, facility, 'Facility created successfully'));
});

// @desc    Get all facilities and charge methods
// @route   GET /api/v1/facilities
// @access  Public
const getAllFacilities = asyncHandler(async (req, res) => {
  const facilities = await Facility.find({});
  const chargeMethodsSetting = await Setting.findOne({ key: 'chargeMethods' });

  // Use a default array if the setting is not found in the database
  const chargeMethods = chargeMethodsSetting ? chargeMethodsSetting.value : ['free', 'flat', 'per_hour'];

  const data = {
    facilities,
    chargeMethods,
  };

  return res
    .status(200)
    .json(new ApiResponse(200, data, 'Facilities and charge methods retrieved successfully'));
});

// @desc    Get a single facility by ID
// @route   GET /api/v1/facilities/:id
// @access  Private/Super-Admin
const getFacilityById = asyncHandler(async (req, res) => {
  const facility = await Facility.findById(req.params.id);

  if (!facility) {
    throw new ApiError(404, 'Facility not found');
  }

  return res
    .status(200)
    .json(new ApiResponse(200, facility, 'Facility retrieved successfully'));
});

// @desc    Update a facility
// @route   PATCH /api/v1/facilities/:id
// @access  Private/Super-Admin
const updateFacility = asyncHandler(async (req, res) => {
  const { name } = req.body;

  const facility = await Facility.findById(req.params.id);

  if (!facility) {
    throw new ApiError(404, 'Facility not found');
  }

  if (name) {
    const facilityExists = await Facility.findOne({ name });
    if (facilityExists && facilityExists._id.toString() !== req.params.id) {
      throw new ApiError(400, 'Facility with this name already exists');
    }
    facility.name = name;
  }

  const updatedFacility = await facility.save();

  return res
    .status(200)
    .json(new ApiResponse(200, updatedFacility, 'Facility updated successfully'));
});

// @desc    Delete a facility
// @route   DELETE /api/v1/facilities/:id
// @access  Private/Super-Admin
const deleteFacility = asyncHandler(async (req, res) => {
  const facilityId = req.params.id;

  const facility = await Facility.findById(facilityId);
  if (!facility) {
    throw new ApiError(404, 'Facility not found');
  }

  const hallUsingFacility = await Hall.findOne({ 'facilities.facility': facilityId });
  if (hallUsingFacility) {
    throw new ApiError(400, 'Cannot delete a facility that is currently in use by a hall.');
  }

  await facility.deleteOne();

  return res
    .status(200)
    .json(new ApiResponse(200, {}, 'Facility deleted successfully'));
});

export {
  createFacility,
  getAllFacilities,
  getFacilityById,
  updateFacility,
  deleteFacility,
};
