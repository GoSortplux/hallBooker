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
        // First, try to verify using the reference as a transactionReference
        const response = await monnify.get(`/transactions/${reference}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        return response.data;
    } catch (error) {
        // If the first attempt fails, try verifying using the reference as a paymentReference
        console.log("Failed to verify with transaction reference, trying with payment reference");
        try {
            const token = await getAuthToken();
            const response = await monnify.get(`/transactions/by-payment-reference/${reference}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            return response.data;
        } catch (secondError) {
            console.error("Error from Monnify (verifyTransaction):", secondError.response ? secondError.response.data : secondError.message);
            throw new ApiError(500, (secondError.response && secondError.response.data && secondError.response.data.responseMessage) || 'Failed to verify transaction');
        }
    }
};

export { initializeTransaction, verifyTransaction };
