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
        throw new ApiError(500, 'Failed to authenticate with Monnify');
    }
};

const initializeTransaction = async (data) => {
    try {
        const token = await getAuthToken();
        const response = await monnify.post('/merchant/transactions/init-transaction', data, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        return response.data;
    } catch (error) {
        throw new ApiError(500, error.response.data.responseMessage || 'Failed to initialize transaction');
    }
};

const verifyTransaction = async (transactionReference) => {
    try {
        const token = await getAuthToken();
        const response = await monnify.get(`/transactions/${transactionReference}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        return response.data;
    } catch (error) {
        throw new ApiError(500, error.response.data.responseMessage || 'Failed to verify transaction');
    }
};

export { initializeTransaction, verifyTransaction };
