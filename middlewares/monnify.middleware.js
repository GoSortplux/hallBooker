import crypto from 'crypto';
import { ApiError } from '../utils/apiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const verifyMonnifySignature = asyncHandler(async (req, res, next) => {
    const signature = req.headers['monnify-signature'];

    if (!signature) {
        throw new ApiError(401, 'Monnify signature missing from headers.');
    }

    const secretKey = process.env.MONNIFY_SECRET_KEY;
    if (!secretKey) {
        // Log this error for the developer, but don't expose it to the client.
        console.error('MONNIFY_SECRET_KEY is not set in environment variables.');
        throw new ApiError(500, 'Webhook secret key not configured.');
    }

    // The rawBody is expected to be attached by a previous middleware
    if (!req.rawBody) {
         console.error('Raw body not available on request object. Make sure the express.json({ verify: ... }) middleware is configured correctly.');
        throw new ApiError(500, 'Internal server error: Raw body missing.');
    }

    const hash = crypto
        .createHmac('sha256', secretKey)
        .update(req.rawBody)
        .digest('hex');

    if (hash !== signature) {
        throw new ApiError(401, 'Invalid Monnify signature.');
    }

    // Signature is valid, proceed to the next handler
    next();
});

export { verifyMonnifySignature };
