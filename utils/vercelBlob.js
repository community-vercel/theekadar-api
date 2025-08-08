// utils/vercelBlob.js
const { put } = require('@vercel/blob');

async function uploadFile(file) {
  const { url } = await put(file.originalname, file.buffer, {
    access: 'public',
    token: process.env.VERCEL_BLOB_TOKEN,
  });
  return url;
}

module.exports = { uploadFile };