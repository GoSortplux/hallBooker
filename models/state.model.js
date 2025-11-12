import mongoose from 'mongoose';

const stateSchema = new mongoose.Schema({
  name: { type: String, required: true },
  country: { type: mongoose.Schema.Types.ObjectId, ref: 'Country', required: true },
});

export const State = mongoose.model('State', stateSchema);
