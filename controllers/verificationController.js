// controllers/verificationController.js
const Verification = require('../models/Verification');
const { put } = require('@vercel/blob');

exports.uploadVerification = async (req, res) => {
  try {
    const { userId, documentType } = req.body;

    // Validate fields
    if (!userId || !documentType) {
      return res.status(400).json({ 
        success: false, 
        message: 'Missing required fields' 
      });
    }

    if (!['id', 'passport', 'license'].includes(documentType)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid document type' 
      });
    }

    // Check if user already has a verification document
    const existingVerification = await Verification.findOne({ userId });
    if (existingVerification) {
      return res.status(400).json({ 
        success: false, 
        message: 'User already has a verification document submitted' 
      });
    }

    // Check file
    if (!req.files || !req.files.document) {
      return res.status(400).json({ 
        success: false, 
        message: 'No document uploaded' 
      });
    }

    const file = req.files.document;
    const fileName = `verification/${Date.now()}-${file.name}`;

    // Upload to Vercel Blob
    const { url } = await put(fileName, file.data, {
      access: 'public',
      token: process.env.VERCEL_BLOB_WRITE_ONLY_TOKEN,
    });

    // Save to MongoDB
    const verification = new Verification({
      userId,
      documentType,
      documentUrl: url,
      status: 'pending',
    });

    await verification.save();

    res.status(201).json({
      success: true,
      message: 'Document uploaded successfully',
      data: verification,
    });
  } catch (error) {
    console.error('Verification upload error:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
};

exports.checkVerificationStatus = async (req, res) => {
  try {
    const { userId } = req.query;

    // Validate userId
    if (!userId) {
      return res.status(400).json({ 
        success: false, 
        message: 'User ID is required' 
      });
    }

    // Find verification records for the user
    const verifications = await Verification.find({ 
      userId 
    }).select('documentType status submittedAt documentUrl -_id');

    if (!verifications || verifications.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'No verification records found for this user' 
      });
    }

    res.status(200).json({
      success: true,
      message: 'Verification status retrieved successfully',
      data: verifications
    });
  } catch (error) {
    console.error('Verification status check error:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
};