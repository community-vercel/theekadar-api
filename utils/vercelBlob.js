// utils/vercelBlob.js
const { put } = require('@vercel/blob');

async function uploadFile(file) {
  try {
    console.log('Uploading file:', {
      originalname: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
      hasBuffer: !!file.buffer
    });

    if (!file.buffer) {
      throw new Error('File buffer is missing');
    }

    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      throw new Error('BLOB_READ_WRITE_TOKEN is not set');
    }

    // Generate a unique filename to avoid conflicts
    const timestamp = Date.now();
    const filename = `${timestamp}-${file.originalname}`;

    const { url } = await put(filename, file.buffer, {
      access: 'public',
      token: process.env.BLOB_READ_WRITE_TOKEN,
      contentType: file.mimetype, // Add content type for better handling
    });

    console.log('File uploaded successfully:', url);
    return url;
  } catch (error) {
    console.error('Upload file error:', error);
    throw new Error(`File upload failed: ${error.message}`);
  }
}

module.exports = { uploadFile };