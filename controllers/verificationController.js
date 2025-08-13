// controllers/verificationController.js
const Verification = require('../models/Verification');
const { put } = require('@vercel/blob');
const mongoose = require('mongoose');

// controllers/verificationController.js

exports.uploadVerification = async (req, res) => {
  try {
    const { userId, documentType, document } = req.body;

    // Validate fields
    if (!userId || !documentType || !document) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: userId, documentType, and document are required',
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

    // Parse Base64 string
    const matches = document.match(/^data:(image\/jpeg|image\/png|application\/pdf);base64,(.+)$/);
    if (!matches) {
      return res.status(400).json({
        success: false,
        message: 'Invalid Base64 string format. Must include data URI scheme (e.g., data:image/jpeg;base64,...)',
      });
    }

    const mimeType = matches[1];
    const base64Data = matches[2];

    // Validate MIME type
    const allowedMimeTypes = ['image/jpeg', 'image/png', 'application/pdf'];
    if (!allowedMimeTypes.includes(mimeType)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid file type. Only JPEG, PNG, or PDF are allowed',
      });
    }

    // Decode Base64 to buffer
    const fileBuffer = Buffer.from(base64Data, 'base64');

    // Validate file size (5MB limit)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (fileBuffer.length > maxSize) {
      return res.status(400).json({
        success: false,
        message: 'File size exceeds 5MB limit',
      });
    }

    // Determine file extension from MIME type
    const mimeToExtension = {
      'image/jpeg': 'jpg',
      'image/png': 'png',
      'application/pdf': 'pdf',
    };
    const extension = mimeToExtension[mimeType];

    // Generate file name with extension
    const sanitizedBaseName = `user-${userId}-${documentType}`;
    const fileName = `verification/${Date.now()}-${sanitizedBaseName}.${extension}`;

    // Log file name for debugging
    console.log('Generated file name:', fileName);

    // Upload to Vercel Blob
    const { url } = await put(fileName, fileBuffer, {
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