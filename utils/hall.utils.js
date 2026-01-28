import mongoose from 'mongoose';
import { Hall } from '../models/hall.model.js';

/**
 * Finds a hall by either its MongoDB ObjectId or its unique slug.
 * @param {string} idOrSlug - The ID or slug of the hall.
 * @returns {Promise<Hall|null>} The hall document or null if not found.
 */
export const findHallByIdOrSlug = async (idOrSlug) => {
    if (!idOrSlug) return null;

    // Try finding by ID if it's a valid ObjectId
    if (mongoose.Types.ObjectId.isValid(idOrSlug)) {
        const hallById = await Hall.findById(idOrSlug);
        if (hallById) return hallById;
    }

    // Otherwise, or if not found by ID, try finding by slug
    // We use lowercase to ensure case-insensitive matching for slugs
    return await Hall.findOne({ slug: idOrSlug.toLowerCase() });
};
