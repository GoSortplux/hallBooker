import axios from 'axios';
import { ApiError } from '../utils/apiError.js';

const monnify = axios.create({
    baseURL: 'https://sandbox.monnify.com/api/v1',
    headers: {
        'Content-Type': 'application/json',
    },
});

const getAuthToken = async () => {
    const apiKey = process.env.MONNIFY_API_KEY;
    const clientSecret = process.env.MONNIFY_SECRET_KEY;
    const authString = Buffer.from(`${apiKey}:${clientSecret}`).toString('base64');

    try {
        const response = await monnify.post('/auth/login', {}, {
            headers: {
                'Authorization': `Basic ${authString}`
            }
        });
        return response.data.responseBody.accessToken;
    } catch (error) {
        if (error.code === 'ECONNRESET') {
            console.error("Connection to Monnify was reset. This might be a temporary issue with the Monnify sandbox or a network problem.", error.message);
            throw new ApiError(503, "Could not connect to the payment gateway. Please try again later.");
        }
        console.error("Error from Monnify (getAuthToken):", error.response ? error.response.data : error.message);
        throw new ApiError(500, 'Failed to authenticate with Monnify');
    }
};

const initializeTransaction = async (data) => {
    if (!data.contractCode) {
        throw new ApiError(400, 'contractCode is required to initialize a transaction.');
    }

    try {
        const token = await getAuthToken();
        const response = await monnify.post('/merchant/transactions/init-transaction', data, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        return response.data;
    } catch (error) {
        console.error("Error from Monnify (initializeTransaction):", error.response ? error.response.data : error.message);
        throw new ApiError(500, (error.response && error.response.data && error.response.data.responseMessage) || 'Failed to initialize transaction');
    }
};

const verifyTransaction = async (reference) => {
    try {
        const token = await getAuthToken();
        const response = await axios.get('https://sandbox.monnify.com/api/v2/merchant/transactions/query', {
            params: {
                paymentReference: reference
            },
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        return response.data;
    } catch (error) {
        console.error("Error from Monnify (verifyTransaction):", error.response ? error.response.data : error.message);
        throw new ApiError(500, (error.response && error.response.data && error.response.data.responseMessage) || 'Failed to verify transaction');
    }
};

const createSubAccount = async (data) => {
    try {
        const token = await getAuthToken();
        const response = await monnify.post('/sub-accounts', data, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        return response.data.responseBody;
    } catch (error) {
        console.error("Error from Monnify (createSubAccount):", error.response ? error.response.data : error.message);
        throw new ApiError(500, (error.response && error.response.data && error.response.data.responseMessage) || 'Failed to create sub account');
    }
};

const getBanks = async () => {
    try {
        const token = await getAuthToken();
        const response = await monnify.get('/banks', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        return response.data.responseBody;
    } catch (error) {
        console.error("Error from Monnify (getBanks):", error.response ? error.response.data : error.message);
        throw new ApiError(500, (error.response && error.response.data && error.response.data.responseMessage) || 'Failed to get banks');
    }
};

const updateSubAccount = async (subAccountCode, data) => {
    try {
        const token = await getAuthToken();
        const response = await monnify.put(`/sub-accounts/${subAccountCode}`, data, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        return response.data.responseBody;
    } catch (error) {
        console.error("Error from Monnify (updateSubAccount):", error.response ? error.response.data : error.message);
        throw new ApiError(500, (error.response && error.response.data && error.response.data.responseMessage) || 'Failed to update sub account');
    }
};

const validateBankAccount = async (accountNumber, bankCode) => {
    try {
        const token = await getAuthToken();
        const response = await monnify.get('/disbursements/account/validate', {
            params: {
                accountNumber,
                bankCode,
            },
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        return response.data.responseBody;
    } catch (error) {
        console.error("Error from Monnify (validateBankAccount):", error.response ? error.response.data : error.message);
        throw new ApiError(500, (error.response && error.response.data && error.response.data.responseMessage) || 'Failed to validate bank account');
    }
};

export { initializeTransaction, verifyTransaction, createSubAccount, getBanks, updateSubAccount, validateBankAccount };
