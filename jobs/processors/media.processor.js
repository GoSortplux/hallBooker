import { GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { s3Client } from '../../config/storage.js';
import { applyWatermarkToImage } from '../../utils/imageProcessor.js';
import logger from '../../utils/logger.js';

const streamToBuffer = (stream) =>
  new Promise((resolve, reject) => {
    const chunks = [];
    stream.on('data', (chunk) => chunks.push(chunk));
    stream.on('error', reject);
    stream.on('end', () => resolve(Buffer.concat(chunks)));
  });

const mediaProcessor = async (job) => {
  const { publicUrl, resourceType, mimeType } = job.data;

  if (resourceType !== 'image') {
    logger.info(`[MediaWorker] Skipping watermarking for non-image resource: ${publicUrl}`);
    return;
  }

  try {
    const url = new URL(publicUrl);
    // Remove leading slash from pathname to get the S3 Key
    const key = url.pathname.startsWith('/') ? url.pathname.slice(1) : url.pathname;

    logger.info(`[MediaWorker] Processing watermark for: ${key}`);

    const getParams = {
      Bucket: process.env.R2_BUCKET_NAME,
      Key: key,
    };

    const data = await s3Client.send(new GetObjectCommand(getParams));
    const buffer = await streamToBuffer(data.Body);

    const watermarkedBuffer = await applyWatermarkToImage(buffer);

    const putParams = {
      Bucket: process.env.R2_BUCKET_NAME,
      Key: key,
      Body: watermarkedBuffer,
      ContentType: mimeType || 'image/jpeg',
    };

    await s3Client.send(new PutObjectCommand(putParams));
    logger.info(`[MediaWorker] Watermark applied and uploaded for: ${key}`);
  } catch (error) {
    logger.error(`[MediaWorker] Error processing media ${publicUrl}: ${error}`);
    throw error;
  }
};

export default mediaProcessor;
