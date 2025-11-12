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

const setPendingBookingDeletionTime = asyncHandler(async (req, res) => {
    const { time } = req.body;

    if (time === undefined || typeof time !== 'number') {
        throw new ApiError(400, 'Time is required and must be a number');
    }

    let setting = await Setting.findOne({ key: 'pendingBookingDeletionTime' });

    if (setting) {
        setting.value = time;
        await setting.save();
    } else {
        setting = await Setting.create({ key: 'pendingBookingDeletionTime', value: time });
    }

    return res
        .status(200)
        .json(new ApiResponse(200, setting, 'Pending booking deletion time updated successfully'));
});

const setOnlineBookingReactivationTime = asyncHandler(async (req, res) => {
    const { time } = req.body;

    if (time === undefined || typeof time !== 'number') {
        throw new ApiError(400, 'Time is required and must be a number');
    }

    let setting = await Setting.findOne({ key: 'onlineBookingReactivationTime' });

    if (setting) {
        setting.value = time;
        await setting.save();
    } else {
        setting = await Setting.create({ key: 'onlineBookingReactivationTime', value: time });
    }

    return res
        .status(200)
        .json(new ApiResponse(200, setting, 'Online booking reactivation time updated successfully'));
});

const setOnlineBookingDeactivationTime = asyncHandler(async (req, res) => {
    const { time } = req.body;

    if (time === undefined || typeof time !== 'number') {
        throw new ApiError(400, 'Time is required and must be a number');
    }

    let setting = await Setting.findOne({ key: 'onlineBookingDeactivationTime' });

    if (setting) {
        setting.value = time;
        await setting.save();
    } else {
        setting = await Setting.create({ key: 'onlineBookingDeactivationTime', value: time });
    }

    return res
        .status(200)
        .json(new ApiResponse(200, setting, 'Online booking deactivation time updated successfully'));
});

const getBookingOptions = asyncHandler(async (req, res) => {
    let paymentMethodsSetting = await Setting.findOne({ key: 'paymentMethods' });
    let paymentStatusesSetting = await Setting.findOne({ key: 'paymentStatuses' });

    if (!paymentMethodsSetting) {
        paymentMethodsSetting = await Setting.create({
            key: 'paymentMethods',
            value: ['cash', 'pos', 'bank-transfer', 'online'],
        });
    }

    if (!paymentStatusesSetting) {
        paymentStatusesSetting = await Setting.create({
            key: 'paymentStatuses',
            value: ['pending', 'paid', 'failed'],
        });
    }

    return res.status(200).json(
        new ApiResponse(200, {
            paymentMethods: paymentMethodsSetting.value,
            paymentStatuses: paymentStatusesSetting.value,
        })
    );
});

export {
  setCommissionRate,
  getCommissionRate,
  setPendingBookingDeletionTime,
  setOnlineBookingReactivationTime,
  setOnlineBookingDeactivationTime,
  getBookingOptions,
};
