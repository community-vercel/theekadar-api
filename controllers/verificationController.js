// controllers/verificationController.js
const Verification = require('../models/Verification');
const { uploadFile } = require('../utils/vercelBlob');

exports.submitVerification = async (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'Document required' });

  const documentUrl = await uploadFile(req.file);
  const verification = new Verification({
    userId: req.user.userId,
    documentType: req.body.documentType,
    documentUrl,
  });
  await verification.save();

  res.status(201).json({ message: 'Document submitted for verification' });
};