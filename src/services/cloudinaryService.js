import { Cloudinary } from '@cloudinary/url-gen';

const CLOUD_NAME = 'dhtotljvn';
const UPLOAD_PRESET = 'qa_tool_preset'; // Updated to match your new preset name

export const cld = new Cloudinary({
  cloud: {
    cloudName: CLOUD_NAME
  }
});

/**
 * Uploads a file to Cloudinary using an unsigned upload preset.
 * Note: For this to work, the user must have an unsigned upload preset named 'ml_default' 
 * (or whatever is configured) in their Cloudinary dashboard.
 */
export async function uploadToCloudinary(file) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', UPLOAD_PRESET);
  formData.append('cloud_name', CLOUD_NAME);

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
    {
      method: 'POST',
      body: formData,
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Cloudinary upload failed');
  }

  const data = await response.json();
  
  return {
    url: data.secure_url,
    publicId: data.public_id,
    name: file.name,
    type: file.type,
    thumbnail: data.thumbnail_url || data.secure_url,
  };
}
