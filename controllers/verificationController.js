// controllers/verificationController.js
const Verification = require('../models/Verification');
const { put } = require('@vercel/blob');
const mongoose = require('mongoose');

exports.uploadVerification = async (req, res) => {
  try {
    const { userId, documentType } = req.body;

    // Validate fields
    if (!userId || !documentType) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: userId and documentType are required',
      });
    }

    // Validate userId
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID format',
      });
    }

    // Validate documentType
    const validDocumentTypes = ['id', 'passport', 'license'];
    if (!validDocumentTypes.includes(documentType)) {
      return res.status(400).json({
        success: false,
        message: `Invalid document type. Must be one of: ${validDocumentTypes.join(', ')}`,
      });
    }

    // Check if user already has a verification document
    const existingVerification = await Verification.findOne({ userId }).lean();
    if (existingVerification) {
      return res.status(400).json({
        success: false,
        message: 'User already has a verification document submitted',
      });
    }

    // Check file
    if (!req.files || !req.files.document) {
      return res.status(400).json({
        success: false,
        message: 'No document uploaded',
      });
    }

    const file = req.files.document;

    // Generate file name without extension
    const originalFileName = file.name;
    const fileNameWithoutExtension = `verification/${Date.now()}-${originalFileName.split('.')[0]}`;

    // Upload to Vercel Blob
    const { url } = await put(fileNameWithoutExtension, file.data, {
      access: 'public',
      token: process.env.VERCEL_BLOB_TOKEN,
    });

    // Save to MongoDB
    const verification = new Verification({
      userId: new mongoose.Types.ObjectId(userId),
      documentType,
      documentUrl: url,
      status: 'pending',
      submittedAt: new Date(),
    });

    await verification.save();

    res.status(201).json({
      success: true,
      message: 'Document uploaded successfully',
      data: verification.toObject(),
    });
  } catch (error) {
    console.error('Verification upload error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
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