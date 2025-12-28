import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiResponse } from '../utils/apiResponse.js';
import {
    validateBankAccount as validateBankAccountService,
    getBanks as getBanksService
} from '../services/payment.service.js';

const getBanks = asyncHandler(async (req, res) => {
  const banks = await getBanksService();

  return res
    .status(200)
    .json(new ApiResponse(200, banks, 'Banks retrieved successfully.'));
});

const validateBankAccount = asyncHandler(async (req, res) => {
  const { accountNumber, bankCode } = req.body;

  const accountDetails = await validateBankAccountService(accountNumber, bankCode);

  return res
    .status(200)
    .json(new ApiResponse(200, accountDetails, 'Account details retrieved successfully.'));
});

export { validateBankAccount, getBanks };
