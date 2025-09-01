const admin = require('firebase-admin');
require('dotenv').config();

// Initialize Firebase Admin only if it hasn't been initialized
if (!admin.apps.length) {
  try {
    // Validate required environment variables
    const requiredVars = ['FIREBASE_PROJECT_ID', 'FIREBASE_CLIENT_EMAIL', 'FIREBASE_PRIVATE_KEY'];
    const missingVars = requiredVars.filter(varName => !process.env[varName]);
    
    if (missingVars.length > 0) {
      throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
    }

    // Handle private key formatting - try multiple approaches
    let privateKey = process.env.FIREBASE_PRIVATE_KEY;
    
    // Method 1: Replace escaped newlines
    if (privateKey.includes('\\n')) {
      privateKey = privateKey.replace(/\\n/g, '\n');
    }
    
    // Method 2: If it's base64 encoded, decode it
    if (!privateKey.includes('-----BEGIN PRIVATE KEY-----')) {
      try {
        privateKey = Buffer.from(privateKey, 'base64').toString('utf8');
      } catch (error) {
        console.warn('Failed to decode base64 private key, using as-is');
      }
    }

    const serviceAccount = {
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: privateKey,
    };

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });

    console.log('Firebase Admin initialized successfully');
  } catch (error) {
    console.error('Failed to initialize Firebase Admin:', error.message);
    throw error;
  }
} else {
  console.log('Firebase Admin already initialized');
}

module.exports = admin;