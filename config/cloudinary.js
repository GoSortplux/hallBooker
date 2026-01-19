import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs';
import dotenv from 'dotenv';
import Setting from '../models/setting.model.js';

dotenv.config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,   
});

const uploadOnCloudinary = async (localFilePath) => {
  try {
    if (!localFilePath) return null;
    // Upload the file on Cloudinary
    const response = await cloudinary.uploader.upload(localFilePath, {
      resource_type: 'auto',
    });
    // File has been uploaded successfully
    // console.log('File is uploaded on Cloudinary ', response.url);
    fs.unlinkSync(localFilePath); // Remove the locally saved temporary file
    return response;
  } catch (error) {
    fs.unlinkSync(localFilePath); // Remove the locally saved temporary file as the upload operation got failed
    console.error('Cloudinary upload error:', error);
    return null;
  }
};

const deleteFromCloudinary = async (publicUrl) => {
  try {
    if (!publicUrl) return null;

    // A more robust way to extract the public_id and resource_type from the URL
    const urlParts = publicUrl.split('/');

    // Find the resource type ('image', 'video', etc.)
    const resourceTypeIndex = urlParts.findIndex(part => ['image', 'video', 'raw'].includes(part));
    const resourceType = resourceTypeIndex !== -1 ? urlParts[resourceTypeIndex] : 'image';

    // Find the version number (e.g., 'v1234567890')
    const versionIndex = urlParts.findIndex(part => part.startsWith('v') && !isNaN(part.substring(1)));
    if (versionIndex === -1) {
      throw new Error('Could not determine public_id from URL (no version component)');
    }

    // The public_id is everything after the version number, joined back together, with the extension removed.
    const publicIdWithExt = urlParts.slice(versionIndex + 1).join('/');
    const publicId = publicIdWithExt.substring(0, publicIdWithExt.lastIndexOf('.'));

    if (!publicId) {
        throw new Error('Could not determine public_id from URL');
    }

    const result = await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
    return result;
  } catch (error) {
    console.error(`Cloudinary deletion error for URL ${publicUrl}:`, error);
    // We don't re-throw the error, but we log it. The controller will handle the outcome.
    return null;
  }
};

const generateUploadSignature = async () => {
  const timestamp = Math.round(new Date().getTime() / 1000);

  const paramsToSign = {
    timestamp: timestamp,
  };

  const signature = cloudinary.utils.api_sign_request(
    paramsToSign,
    process.env.CLOUDINARY_API_SECRET
  );

  return { timestamp, signature };
};

const applyWatermark = async (publicUrl, resourceType = 'image') => {
  try {
    if (!publicUrl) return null;

    // Check if the URL is from Cloudinary and not already watermarked
    const urlParts = publicUrl.split('/');
    const uploadIndex = urlParts.indexOf('upload');
    if (uploadIndex === -1 || publicUrl.includes('l_text:')) {
      return publicUrl;
    }

    const companyNameSetting = await Setting.findOne({ key: 'companyName' });
    const companyName = companyNameSetting ? companyNameSetting.value : 'Gobokin';

    // Cloudinary transformation string for text overlay
    // Format: l_text:font_family_size_style:text,co_rgb:color,o_opacity,g_gravity,x,y
    const watermarkText = encodeURIComponent(companyName);

    // We use a slightly larger font and higher opacity for visibility
    // while keeping it in the corner (south_east) to avoid distraction.
    let transformation = `l_text:Arial_60_bold:${watermarkText},co_rgb:B0B0B0,o_50,g_south_east,x_20,y_20`;

    // For videos, we need fl_layer_apply to correctly place the overlay
    if (resourceType === 'video') {
      transformation += '/fl_layer_apply';
    }

    // Insert optimization (f_auto, q_auto) and the watermark transformation
    // We add them as separate segments after 'upload'
    urlParts.splice(uploadIndex + 1, 0, 'f_auto,q_auto', transformation);

    return urlParts.join('/');
  } catch (error) {
    console.error('Cloudinary watermark error:', error);
    return publicUrl;
  }
};

export {
  uploadOnCloudinary,
  deleteFromCloudinary,
  generateUploadSignature,
  applyWatermark,
};
