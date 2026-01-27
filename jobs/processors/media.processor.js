import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import axios from 'axios';
import { applyWatermarkToImage } from '../../utils/imageProcessor.js';

const s3Client = new S3Client({
  endpoint: process.env.R2_ENDPOINT,
  region: 'auto',
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});


const mediaProcessor = async (job) => {
  const { url, resourceType, mimeType, hallId } = job.data;

  if (resourceType !== 'image') return; // Currently only images

  try {
    console.log(`[MediaWorker] Processing watermark for ${url}`);

    // Download the image
    const response = await axios.get(url, { responseType: 'arraybuffer' });
    const buffer = Buffer.from(response.data);

    // Apply watermark
    const watermarkedBuffer = await applyWatermarkToImage(buffer);

    // Get key from URL
    const urlObj = new URL(url);
    const key = urlObj.pathname.startsWith('/') ? urlObj.pathname.slice(1) : urlObj.pathname;

    // Upload back to R2 (overwrite)
    const uploadParams = {
      Bucket: process.env.R2_BUCKET_NAME,
      Key: key,
      Body: watermarkedBuffer,
      ContentType: mimeType || 'image/jpeg',
    };

    await s3Client.send(new PutObjectCommand(uploadParams));
    console.log(`[MediaWorker] Watermark applied and overwritten for ${url}`);

  } catch (error) {
    console.error(`[MediaWorker] Error processing ${url}:`, error);
    throw error;
  }
};

export default mediaProcessor;
