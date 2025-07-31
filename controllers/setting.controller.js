import Setting from '../models/setting.model.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/apiError.js';
import { ApiResponse } from '../utils/apiResponse.js';

const setCommissionRate = asyncHandler(async (req, res) => {
  const { rate } = req.body;

  if (rate === undefined || typeof rate !== 'number') {
    throw new ApiError(400, 'Rate is required and must be a number');
  }

  let commissionRateSetting = await Setting.findOne({ key: 'commissionRate' });

  if (commissionRateSetting) {
    commissionRateSetting.value = rate;
    await commissionRateSetting.save();
  } else {
    commissionRateSetting = await Setting.create({ key: 'commissionRate', value: rate });
  }

  return res
    .status(200)
    .json(new ApiResponse(200, commissionRateSetting, 'Commission rate updated successfully'));
});

const getCommissionRate = asyncHandler(async (req, res) => {
  const commissionRateSetting = await Setting.findOne({ key: 'commissionRate' });

  if (!commissionRateSetting) {
    throw new ApiError(404, 'Commission rate has not been set yet');
  }

  return res
    .status(200)
    .json(new ApiResponse(200, commissionRateSetting, 'Commission rate retrieved successfully'));
});

module.exports = {
  setCommissionRate,
  getCommissionRate,
};
