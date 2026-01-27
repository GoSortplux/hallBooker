import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { applyWatermarkToImage } from '../utils/imageProcessor.js';

dotenv.config();

const s3Client = new S3Client({
  endpoint: process.env.R2_ENDPOINT,
  region: 'auto',
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

const uploadToR2 = async (localFilePath, resourceType = 'image', mimeType = null, shouldWatermark = true) => {
  const abortController = new AbortController();
  const timeoutId = setTimeout(() => abortController.abort(), 60000); // 60 seconds timeout

  try {
    if (!localFilePath) return null;

    const originalFileName = path.basename(localFilePath);
    // Sanitize filename: replace spaces and non-alphanumeric chars (except dots/hyphens) with underscores
    const sanitizedFileName = originalFileName.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9.-]/g, '_');

    const resolvedMimeType = mimeType || (resourceType === 'video' ? 'video/mp4' : 'image/jpeg');
    let body;

    // Apply watermark only for images and if requested
    if (resourceType === 'image' && shouldWatermark) {
      const originalBuffer = fs.readFileSync(localFilePath);
      body = await applyWatermarkToImage(originalBuffer);
    } else if (resourceType === 'image' && !shouldWatermark) {
      body = fs.readFileSync(localFilePath);
    } else {
      // For videos and other types, use stream to avoid OOM
      body = fs.createReadStream(localFilePath);
    }

    const uploadParams = {
      Bucket: process.env.R2_BUCKET_NAME,
      Key: `${resourceType}s/${Date.now()}-${sanitizedFileName}`,
      Body: body,
      ContentType: resolvedMimeType,
    };

    await s3Client.send(new PutObjectCommand(uploadParams), { abortSignal: abortController.signal });

    const publicUrl = `${process.env.R2_PUBLIC_URL}/${uploadParams.Key}`;
    return publicUrl;
  } catch (error) {
    if (error.name === 'AbortError') {
      console.error('R2 upload timed out');
    } else {
      console.error('R2 upload error:', error);
    }
    return null;
  } finally {
    clearTimeout(timeoutId);
    if (fs.existsSync(localFilePath)) {
      try {
        fs.unlinkSync(localFilePath);
      } catch (err) {
        console.error('Error deleting temp file:', err);
      }
    }
  }
};

const deleteFromR2 = async (publicUrl) => {
  try {
    if (!publicUrl) return null;

    const url = new URL(publicUrl);
    const key = url.pathname.startsWith('/') ? url.pathname.slice(1) : url.pathname;

    const deleteParams = {
      Bucket: process.env.R2_BUCKET_NAME,
      Key: key,
    };

    const result = await s3Client.send(new DeleteObjectCommand(deleteParams));
    return result;
  } catch (error) {
    console.error(`R2 deletion error for URL ${publicUrl}:`, error);
    return null;
  }
};

const applyWatermark = async (input, resourceType = 'image') => {
  return input;
};

export {
  uploadToR2,
  deleteFromR2,
  applyWatermark,
  s3Client,
};
