// E:\theekadar-api\utils\blob.js
const { put } = require('@vercel/blob');

const uploadToVercelBlob = async (file, filename) => {
  try {
    const { url } = await put(filename, file, {
      access: 'public',
      token: process.env.VERCEL_BLOB_TOKEN,
    });
    return url;
  } catch (error) {
    throw new Error(`Vercel Blob upload failed: ${error.message}`);
  }
};

module.exports = { uploadToVercelBlob };