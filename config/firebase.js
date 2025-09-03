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

    // Handle private key formatting for Vercel deployment
    let privateKey = process.env.FIREBASE_PRIVATE_KEY;
    
    if (!privateKey) {
      throw new Error('FIREBASE_PRIVATE_KEY is not defined');
    }

    // For Vercel: Handle different private key formats
    if (typeof privateKey === 'string') {
      // Remove extra quotes if present
      privateKey = privateKey.replace(/^["']|["']$/g, '');
      
      // Replace \\n with actual newlines (common in Vercel env vars)
      if (privateKey.includes('\\n')) {
        privateKey = privateKey.replace(/\\n/g, '\n');
      }
      
      // If it doesn't look like a PEM key, try base64 decoding
      if (!privateKey.includes('-----BEGIN PRIVATE KEY-----')) {
        try {
          privateKey = Buffer.from(privateKey, 'base64').toString('utf8');
        } catch (error) {
          console.warn('Failed to decode base64 private key, using as-is');
        }
      }
    }

    // Validate the private key format
    if (!privateKey.includes('-----BEGIN PRIVATE KEY-----') || !privateKey.includes('-----END PRIVATE KEY-----')) {
      throw new Error('Invalid private key format. Make sure it includes BEGIN and END markers.');
    }

    const serviceAccount = {
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: privateKey,
    };

    // Additional validation
    if (!serviceAccount.projectId || !serviceAccount.clientEmail || !serviceAccount.privateKey) {
      throw new Error('One or more Firebase service account fields are missing or invalid');
    }

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      // Optional: Add database URL if using Realtime Database
      // databaseURL: `https://${process.env.FIREBASE_PROJECT_ID}-default-rtdb.firebaseio.com/`
    });

    console.log('Firebase Admin initialized successfully');
    
    // Test the connection (optional)
    if (process.env.NODE_ENV !== 'production') {
      admin.auth().listUsers(1)
        .then(() => console.log('Firebase Admin connection verified'))
        .catch((error) => console.warn('Firebase Admin connection test failed:', error.message));
    }

  } catch (error) {
    console.error('Failed to initialize Firebase Admin:', error);
    
    // Log additional debug info for Vercel
    if (process.env.VERCEL) {
      console.error('Vercel deployment detected. Debug info:');
      console.error('- PROJECT_ID exists:', !!process.env.FIREBASE_PROJECT_ID);
      console.error('- CLIENT_EMAIL exists:', !!process.env.FIREBASE_CLIENT_EMAIL);
      console.error('- PRIVATE_KEY exists:', !!process.env.FIREBASE_PRIVATE_KEY);
      console.error('- PRIVATE_KEY length:', process.env.FIREBASE_PRIVATE_KEY?.length || 0);
      console.error('- PRIVATE_KEY starts with BEGIN:', process.env.FIREBASE_PRIVATE_KEY?.includes('-----BEGIN PRIVATE KEY-----'));
    }
    
    throw error;
  }
} else {
  console.log('Firebase Admin already initialized');
}

module.exports = admin;