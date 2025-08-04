const express = require('express');
const multer = require('multer');
const { put, del } = require('@vercel/blob');
const Verification = require('../models/Verification'); // Your schema file
const User = require('../models/User'); // Assuming you have a User model
const { authMiddleware } = require('../middleware/auth');


const router = express.Router();

// Configure multer for file uploads (memory storage)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept only image files
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  },
});

// POST /api/verification/submit - Submit document for verification
router.post('/submit', authMiddleware, upload.single('document'), async (req, res) => {
  try {
    const { documentType } = req.body;
    const userId = req.user.id; // From authMiddleware middleware

    // Validate required fields
    if (!documentType || !['id', 'passport', 'license'].includes(documentType)) {
      return res.status(400).json({
        error: 'Valid document type is required (id, passport, or license)'
      });
    }

    if (!req.file) {
      return res.status(400).json({
        error: 'Document file is required'
      });
    }

    // Check if user already has a pending/approved verification for this document type
    const existingVerification = await Verification.findOne({
      userId,
      documentType,
      status: { $in: ['pending', 'approved'] }
    });

    if (existingVerification) {
      return res.status(400).json({
        error: `You already have a ${existingVerification.status} verification for ${documentType}`
      });
    }

    // Upload file to Vercel Blob
    const filename = `verification/${userId}/${documentType}-${Date.now()}.${req.file.originalname.split('.').pop()}`;
    const blob = await put(filename, req.file.buffer, {
      access: 'public',
      contentType: req.file.mimetype,
    });

    // Create verification record
    const verification = new Verification({
      userId,
      documentType,
      documentUrl: blob.url,
      status: 'pending'
    });

    await verification.save();

    res.status(201).json({
      message: 'Document submitted successfully for verification',
      verification: {
        id: verification._id,
        documentType: verification.documentType,
        status: verification.status,
        submittedAt: verification.submittedAt
      }
    });

  } catch (error) {
    console.error('Error submitting verification:', error);
    res.status(500).json({
      error: 'Failed to submit document for verification'
    });
  }
});

// GET /api/verification/status - Get user's verification status
router.get('/status', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;

    const verifications = await Verification.find({ userId })
      .select('documentType status submittedAt')
      .sort({ submittedAt: -1 });

    res.json({
      verifications: verifications.map(v => ({
        id: v._id,
        documentType: v.documentType,
        status: v.status,
        submittedAt: v.submittedAt
      }))
    });

  } catch (error) {
    console.error('Error fetching verification status:', error);
    res.status(500).json({
      error: 'Failed to fetch verification status'
    });
  }
});

// GET /api/verification/:id - Get specific verification details
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const verification = await Verification.findOne({ _id: id, userId });

    if (!verification) {
      return res.status(404).json({
        error: 'Verification not found'
      });
    }

    res.json({
      verification: {
        id: verification._id,
        documentType: verification.documentType,
        status: verification.status,
        submittedAt: verification.submittedAt,
        documentUrl: verification.documentUrl
      }
    });

  } catch (error) {
    console.error('Error fetching verification:', error);
    res.status(500).json({
      error: 'Failed to fetch verification details'
    });
  }
});

// DELETE /api/verification/:id - Cancel pending verification
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const verification = await Verification.findOne({ _id: id, userId });

    if (!verification) {
      return res.status(404).json({
        error: 'Verification not found'
      });
    }

    if (verification.status !== 'pending') {
      return res.status(400).json({
        error: 'Can only cancel pending verifications'
      });
    }

    // Delete file from Vercel Blob
    try {
      await del(verification.documentUrl);
    } catch (blobError) {
      console.error('Error deleting blob:', blobError);
      // Continue with deletion even if blob deletion fails
    }

    // Delete verification record
    await Verification.findByIdAndDelete(id);

    res.json({
      message: 'Verification cancelled successfully'
    });

  } catch (error) {
    console.error('Error cancelling verification:', error);
    res.status(500).json({
      error: 'Failed to cancel verification'
    });
  }
});

// ADMIN ROUTES (require admin role)
// const adminAuth = require('./middleware/adminAuth'); // Your admin auth middleware

// // GET /api/verification/admin/pending - Get all pending verifications (Admin only)
// router.get('/admin/pending', adminAuth, async (req, res) => {
//   try {
//     const { page = 1, limit = 10 } = req.query;
//     const skip = (page - 1) * limit;

//     const verifications = await Verification.find({ status: 'pending' })
//       .populate('userId', 'name email')
//       .sort({ submittedAt: 1 })
//       .skip(skip)
//       .limit(parseInt(limit));

//     const total = await Verification.countDocuments({ status: 'pending' });

//     res.json({
//       verifications: verifications.map(v => ({
//         id: v._id,
//         user: {
//           id: v.userId._id,
//           name: v.userId.name,
//           email: v.userId.email
//         },
//         documentType: v.documentType,
//         documentUrl: v.documentUrl,
//         status: v.status,
//         submittedAt: v.submittedAt
//       })),
//       pagination: {
//         current: parseInt(page),
//         total: Math.ceil(total / limit),
//         totalItems: total
//       }
//     });

//   } catch (error) {
//     console.error('Error fetching pending verifications:', error);
//     res.status(500).json({
//       error: 'Failed to fetch pending verifications'
//     });
//   }
// });

// // PUT /api/verification/admin/:id/approve - Approve verification (Admin only)
// router.put('/admin/:id/approve', adminAuth, async (req, res) => {
//   try {
//     const { id } = req.params;

//     const verification = await Verification.findById(id);

//     if (!verification) {
//       return res.status(404).json({
//         error: 'Verification not found'
//       });
//     }

//     if (verification.status !== 'pending') {
//       return res.status(400).json({
//         error: 'Can only approve pending verifications'
//       });
//     }

//     verification.status = 'approved';
//     await verification.save();

//     res.json({
//       message: 'Verification approved successfully',
//       verification: {
//         id: verification._id,
//         status: verification.status
//       }
//     });

//   } catch (error) {
//     console.error('Error approving verification:', error);
//     res.status(500).json({
//       error: 'Failed to approve verification'
//     });
//   }
// });

// // PUT /api/verification/admin/:id/reject - Reject verification (Admin only)
// router.put('/admin/:id/reject', adminAuth, async (req, res) => {
//   try {
//     const { id } = req.params;
//     const { reason } = req.body;

//     const verification = await Verification.findById(id);

//     if (!verification) {
//       return res.status(404).json({
//         error: 'Verification not found'
//       });
//     }

//     if (verification.status !== 'pending') {
//       return res.status(400).json({
//         error: 'Can only reject pending verifications'
//       });
//     }

//     verification.status = 'rejected';
//     if (reason) {
//       verification.rejectionReason = reason; // Add this field to your schema if needed
//     }
//     await verification.save();

//     res.json({
//       message: 'Verification rejected successfully',
//       verification: {
//         id: verification._id,
//         status: verification.status,
//         rejectionReason: reason
//       }
//     });

//   } catch (error) {
//     console.error('Error rejecting verification:', error);
//     res.status(500).json({
//       error: 'Failed to reject verification'
//     });
//   }
// });

// // GET /api/verification/admin/stats - Get verification statistics (Admin only)
// router.get('/admin/stats', adminAuth, async (req, res) => {
//   try {
//     const stats = await Verification.aggregate([
//       {
//         $group: {
//           _id: '$status',
//           count: { $sum: 1 }
//         }
//       }
//     ]);

//     const totalByType = await Verification.aggregate([
//       {
//         $group: {
//           _id: '$documentType',
//           count: { $sum: 1 }
//         }
//       }
//     ]);

//     const formattedStats = {
//       byStatus: stats.reduce((acc, item) => {
//         acc[item._id] = item.count;
//         return acc;
//       }, {}),
//       byType: totalByType.reduce((acc, item) => {
//         acc[item._id] = item.count;
//         return acc;
//       }, {}),
//       total: await Verification.countDocuments()
//     };

//     res.json({ stats: formattedStats });

//   } catch (error) {
//     console.error('Error fetching verification stats:', error);
//     res.status(500).json({
//       error: 'Failed to fetch verification statistics'
//     });
//   }
// });

// Error handling middleware for multer
router.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        error: 'File too large. Maximum size is 5MB.'
      });
    }
  }
  
  if (error.message === 'Only image files are allowed') {
    return res.status(400).json({
      error: 'Only image files are allowed'
    });
  }

  res.status(500).json({
    error: 'An error occurred while processing your request'
  });
});

module.exports = router;