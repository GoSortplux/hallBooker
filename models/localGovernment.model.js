import mongoose from 'mongoose';

const localGovernmentSchema = new mongoose.Schema({
  name: { type: String, required: true },
  state: { type: mongoose.Schema.Types.ObjectId, ref: 'State', required: true },
});

export const LocalGovernment = mongoose.model('LocalGovernment', localGovernmentSchema);
