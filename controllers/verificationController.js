// controllers/verificationController.js
const Verification = require('../models/Verification');
const { uploadFile } = require('../utils/vercelBlob');

exports.submitVerification = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Document required' });
    }
    if (!req.body.documentType) {
      return res.status(400).json({ message: 'Document type required' });
    }

    const documentUrl = await uploadFile(req.file);
    const verification = new Verification({
      userId: req.user.userId,
      documentType: req.body.documentType,
      documentUrl,
    });
    await verification.save();

    res.status(201).json({ message: 'Document submitted for verification' });
  } catch (error) {
    console.error('Error submitting verification:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};