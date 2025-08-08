// utils/vercelBlob.js
const { put } = require('@vercel/blob');

async function uploadFile(file) {
  try {
    if (!file.buffer) {
      throw new Error('File buffer is missing');
    }

    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      throw new Error('BLOB_READ_WRITE_TOKEN is not set');
    }

    // Generate a unique filename to avoid conflicts
    const timestamp = Date.now();
    const filename = `${timestamp}-${file.name || 'unnamed-file'}`;

    console.log('Uploading file:', {
      filename,
      mimetype: file.mimetype,
      size: file.size,
    });

    const { url } = await put(filename, file.buffer, {
      access: 'public',
      token: process.env.BLOB_READ_WRITE_TOKEN,
      contentType: file.mimetype || 'application/octet-stream',
    });

    console.log('File uploaded successfully:', url);
    return url;
  } catch (error) {
    console.error('Upload file error:', error);
    throw new Error(`File upload failed: ${error.message}`);
  }
}

module.exports = { uploadFile };