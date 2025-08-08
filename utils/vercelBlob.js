// utils/vercelBlob.js
const { put } = require('@vercel/blob');
const sharp = require('sharp');

async function uploadFile(file) {
  try {
    if (!file.buffer) {
      throw new Error('File buffer is missing');
    }

    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      throw new Error('BLOB_READ_WRITE_TOKEN is not set');
    }

    // Compress image if it's an image file
    let buffer = file.buffer;
    if (file.mimetype.startsWith('image/')) {
      buffer = await sharp(file.buffer)
        .resize({ width: 1024, withoutEnlargement: true }) // Resize to max 1024px width
        .jpeg({ quality: 80 }) // Compress to 80% quality
        .toBuffer();
    }

    const timestamp = Date.now();
    const filename = `${timestamp}-${file.name || 'unnamed-file'}`;

    console.log('Uploading file:', {
      filename,
      mimetype: file.mimetype,
      size: buffer.length,
    });

    const { url } = await put(filename, buffer, {
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