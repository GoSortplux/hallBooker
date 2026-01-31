import Policy from '../models/policy.model.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/apiError.js';
import { ApiResponse } from '../utils/apiResponse.js';

const getPolicies = asyncHandler(async (req, res) => {
  const now = new Date();
  
  // Get all unique slugs
  const slugs = await Policy.distinct('slug', {
    isPublished: true,
    effectiveDate: { $lte: now }
  });

  // For each slug, get the latest version
  const policies = await Promise.all(slugs.map(async (slug) => {
    return await Policy.findOne({
      slug,
      isPublished: true,
      effectiveDate: { $lte: now }
    })
    .sort({ effectiveDate: -1, version: -1 })
    .select('title slug effectiveDate version');
  }));

  return res.status(200).json(
    new ApiResponse(200, policies, 'Policies retrieved successfully')
  );
});

const getPolicyBySlug = asyncHandler(async (req, res) => {
  const { slug } = req.params;
  const now = new Date();

  const policy = await Policy.findOne({
    slug,
    isPublished: true,
    effectiveDate: { $lte: now }
  })
  .sort({ effectiveDate: -1, version: -1 });

  if (!policy) {
    throw new ApiError(404, `Policy with slug '${slug}' not found or not yet effective`);
  }

  return res.status(200).json(
    new ApiResponse(200, policy, 'Policy retrieved successfully')
  );
});

const createPolicy = asyncHandler(async (req, res) => {
  const { title, slug, content, effectiveDate, isPublished } = req.body;

  // Find the latest version for this slug to increment
  const latestPolicy = await Policy.findOne({ slug }).sort({ version: -1 });
  const nextVersion = latestPolicy ? latestPolicy.version + 1 : 1;

  const policy = await Policy.create({
    title,
    slug,
    content,
    version: nextVersion,
    effectiveDate,
    isPublished: isPublished ?? true,
    createdBy: req.user._id
  });

  return res.status(201).json(
    new ApiResponse(201, policy, 'Policy created successfully')
  );
});

const updatePolicy = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { title, content, effectiveDate, isPublished } = req.body;

  const policy = await Policy.findById(id);

  if (!policy) {
    throw new ApiError(404, 'Policy version not found');
  }

  if (title) policy.title = title;
  if (content) policy.content = content;
  if (effectiveDate) policy.effectiveDate = effectiveDate;
  if (isPublished !== undefined) policy.isPublished = isPublished;

  await policy.save();

  return res.status(200).json(
    new ApiResponse(200, policy, 'Policy updated successfully')
  );
});

const deletePolicy = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const policy = await Policy.findByIdAndDelete(id);

  if (!policy) {
    throw new ApiError(404, 'Policy version not found');
  }

  return res.status(200).json(
    new ApiResponse(200, {}, 'Policy version deleted successfully')
  );
});

export {
  getPolicies,
  getPolicyBySlug,
  createPolicy,
  updatePolicy,
  deletePolicy
};
