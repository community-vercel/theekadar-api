// controllers/verificationController.js
const Verification = require('../models/Verification');
const { put } = require('@vercel/blob');
const path = require('path');

exports.uploadVerification = async (req, res) => {
  try {
    const { userId, documentType } = req.body;

    // 1️⃣ Validate fields
    if (!userId || !documentType) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: userId, documentType'
      });
    }

    const allowedTypes = ['id', 'passport', 'license'];
    if (!allowedTypes.includes(documentType)) {
      return res.status(400).json({
        success: false,
        message: `Invalid document type. Allowed types: ${allowedTypes.join(', ')}`
      });
    }

    // 2️⃣ Check if user already has a verification document
    const existingVerification = await Verification.findOne({ userId });
    if (existingVerification) {
      return res.status(409).json({
        success: false,
        message: 'User already submitted a verification document'
      });
    }

    // 3️⃣ Check file
    if (!req.files || !req.files.document) {
      return res.status(400).json({
        success: false,
        message: 'No document uploaded'
      });
    }

    const file = req.files.document;

    // Optional: Validate file type and size
    const allowedExtensions = ['.jpg', '.jpeg', '.png', '.pdf'];
    const ext = path.extname(file.name).toLowerCase();
    if (!allowedExtensions.includes(ext)) {
      return res.status(400).json({
        success: false,
        message: `Invalid file format. Allowed: ${allowedExtensions.join(', ')}`
      });
    }

    if (file.size > 5 * 1024 * 1024) { // 5MB
      return res.status(400).json({
        success: false,
        message: 'File too large. Max size: 5MB'
      });
    }

    // 4️⃣ Upload to Vercel Blob
    const fileName = `verification/${Date.now()}-${file.name}`;
    const { url } = await put(fileName, file.data, {
      access: 'public',
      token: process.env.VERCEL_BLOB_WRITE_ONLY_TOKEN,
    });

    // 5️⃣ Save to MongoDB
    const verification = new Verification({
      userId,
      documentType,
      documentUrl: url,
      status: 'pending',
    });

    await verification.save();

    // 6️⃣ Respond success
    return res.status(201).json({
      success: true,
      message: 'Document uploaded successfully',
      data: verification
    });

  } catch (error) {
    console.error('Verification upload error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error. Please try again later.'
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