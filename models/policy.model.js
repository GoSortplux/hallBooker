import mongoose from 'mongoose';

const policySchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
  },
  slug: {
    type: String,
    required: true,
    index: true,
  },
  content: {
    type: String,
    required: true,
  },
  version: {
    type: Number,
    default: 1,
  },
  effectiveDate: {
    type: Date,
    required: true,
  },
  isPublished: {
    type: Boolean,
    default: false,
    index: true,
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
}, { timestamps: true });

// Compound index for optimized fetching of the latest published version
policySchema.index({ slug: 1, isPublished: 1, effectiveDate: -1 });

const Policy = mongoose.model('Policy', policySchema);

export default Policy;
