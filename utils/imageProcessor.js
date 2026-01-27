import sharp from 'sharp';
import axios from 'axios';
import Setting from '../models/setting.model.js';

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

/**
 * Applies a watermark to an image buffer.
 * @param {Buffer} buffer - The original image buffer.
 * @returns {Buffer} - The watermarked image buffer.
 */
export const applyWatermarkToImage = async (buffer) => {
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
      }
    }

    // Text Watermark Fallback
    const fallbackSetting = await Setting.findOne({ key: 'companyName' });
    const companyName = escapeXml(fallbackSetting ? fallbackSetting.value : 'Gobokin');

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
    console.error('Watermarking utility failed:', error);
    return buffer;
  }
};
