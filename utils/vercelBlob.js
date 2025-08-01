// utils/vercelBlob.js
const { put } = require('@vercel/blob');

async function uploadFile(file) {
  const { url } = await put(file.originalname, file.buffer, {
    access: 'public',
    token: process.env.BLOB_READ_WRITE_TOKEN,
  });
  return url;
}

module.exports = { uploadFile };