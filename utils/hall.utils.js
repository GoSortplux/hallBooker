import mongoose from 'mongoose';
import { Hall } from '../models/hall.model.js';

/**
 * Finds a hall by either its MongoDB ObjectId or its unique slug.
 * @param {string} idOrSlug - The ID or slug of the hall.
 * @returns {Promise<Hall|null>} The hall document or null if not found.
 */
export const findHallByIdOrSlug = async (idOrSlug) => {
    if (!idOrSlug) return null;
    const query = mongoose.Types.ObjectId.isValid(idOrSlug) ? { _id: idOrSlug } : { slug: idOrSlug };
    return await Hall.findOne(query);
};
