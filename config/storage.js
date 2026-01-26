import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import axios from 'axios';
import dotenv from 'dotenv';
import Setting from '../models/setting.model.js';

dotenv.config();

const s3Client = new S3Client({
  endpoint: process.env.R2_ENDPOINT,
  region: 'auto',
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

const escapeXml = (unsafe) => {
  return unsafe.replace(/[<>&"']/g, (c) => {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case '"': return '&quot;';
      case "'": return '&apos;';
      default: return c;
    }
  });
};

const applyWatermarkToImage = async (buffer) => {
  try {
    const companyLogoSetting = await Setting.findOne({ key: 'companyLogoUrl' });
    const companyLogoUrl = companyLogoSetting ? companyLogoSetting.value : null;

    const metadata = await sharp(buffer).metadata();
    const width = metadata.width;
    const height = metadata.height;

    if (companyLogoUrl) {
      try {
        const response = await axios.get(companyLogoUrl, { responseType: 'arraybuffer' });
        const logoBuffer = Buffer.from(response.data);

        // Calculate logo size (e.g., 15% of image width)
        const logoWidth = Math.floor(width * 0.15);
        const resizedLogoBuffer = await sharp(logoBuffer)
          .resize({ width: logoWidth })
          .toBuffer();

        // Create versions with different opacities
        const logoMid = await sharp(resizedLogoBuffer)
          .ensureAlpha()
          .composite([{
            input: Buffer.from([255, 255, 255, 76]), // ~0.3 opacity
            raw: { width: 1, height: 1, channels: 4 },
            tile: true,
            blend: 'dest-in'
          }])
          .toBuffer();

        const logoCorner = await sharp(resizedLogoBuffer)
          .ensureAlpha()
          .composite([{
            input: Buffer.from([255, 255, 255, 178]), // ~0.7 opacity
            raw: { width: 1, height: 1, channels: 4 },
            tile: true,
            blend: 'dest-in'
          }])
          .toBuffer();

        const logoMetadata = await sharp(resizedLogoBuffer).metadata();

        return await sharp(buffer)
          .composite([
            {
              input: logoMid,
              top: Math.floor(height / 2 - logoMetadata.height / 2),
              left: Math.floor(width / 2 - logoMetadata.width / 2),
              blend: 'over'
            },
            {
              input: logoCorner,
              top: height - logoMetadata.height - Math.floor(height * 0.05),
              left: width - logoMetadata.width - Math.floor(width * 0.02),
              blend: 'over'
            }
          ])
          .toBuffer();
      } catch (logoError) {
        console.error('Failed to fetch or apply logo watermark, falling back to text:', logoError);
        // Fall through to text watermark
      }
    }

    // Text Watermark Fallback
    const companyNameSetting = await Setting.findOne({ key: 'companyName' });
    const companyName = escapeXml(companyNameSetting ? companyNameSetting.value : 'Gobokin');

    // Create an SVG for the watermark with a gold shadow for visibility on white backgrounds
    const fontSize = Math.max(20, Math.floor(width / 20));
    const svgText = `
      <svg width="${width}" height="${height}">
        <defs>
          <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur in="SourceAlpha" stdDeviation="2" />
            <feOffset dx="1" dy="1" result="offsetblur" />
            <feFlood flood-color="#D4AF37" result="color" />
            <feComposite in="color" in2="offsetblur" operator="in" />
            <feMerge>
              <feMergeNode />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <style>
          .title {
            fill: white;
            font-size: ${fontSize}px;
            font-weight: bold;
            font-family: Arial, sans-serif;
            opacity: 0.95;
            filter: url(#shadow);
          }
        </style>
        <text x="98%" y="95%" text-anchor="end" class="title">${companyName}</text>
      </svg>
    `;

    return await sharp(buffer)
      .composite([{ input: Buffer.from(svgText), top: 0, left: 0 }])
      .toBuffer();
  } catch (error) {
    console.error('Watermarking failed, falling back to original buffer:', error);
    return buffer;
  }
};

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
};
