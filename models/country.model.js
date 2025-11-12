import mongoose from 'mongoose';

const countrySchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  iso2: { type: String, required: true, unique: true },
});

export const Country = mongoose.model('Country', countrySchema);
