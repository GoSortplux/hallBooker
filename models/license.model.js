// This model is deprecated and will be removed in a future update.
// Please use the SubscriptionHistory model instead.
import mongoose from 'mongoose';

const licenseSchema = new mongoose.Schema({});

export const License = mongoose.model('License', licenseSchema);
