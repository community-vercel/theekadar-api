// controllers/verificationController.js
const Verification = require('../models/Verification');
const { uploadFile } = require('../utils/vercelBlob');

const { put } = require("@vercel/blob");

exports.uploadVerification = async (req, res) => {
  try {
    const { userId, documentType } = req.body;

    // Validate fields
    if (!userId || !documentType) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    if (!["id", "passport", "license"].includes(documentType)) {
      return res.status(400).json({ message: "Invalid document type" });
    }

    // Check file
    if (!req.files || !req.files.document) {
      return res.status(400).json({ message: "No document uploaded" });
    }

    const file = req.files.document;
    const fileName = `verification/${Date.now()}-${file.name}`;

    // Upload to Vercel Blob
    const { url } = await put(fileName, file.data, {
      access: "public",
      token: process.env.VERCEL_BLOB_WRITE_ONLY_TOKEN,
    });

    // Save to MongoDB
    const verification = new Verification({
      userId,
      documentType,
      documentUrl: url,
      status: "pending",
    });

    await verification.save();

    res.status(201).json({
      success: true,
      message: "Document uploaded successfully",
      data: verification,
    });
  } catch (error) {
    console.error("Verification upload error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};
