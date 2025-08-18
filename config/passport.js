const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/User'); // Adjust path to your User model

passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: '/auth/google/callback'
}, async (accessToken, refreshToken, profile, done) => {
  try {
    // Find or create user
    let user = await User.findOne({ googleId: profile.id });
    if (!user) {
      user = await User.findOne({ email: profile.emails[0].value });
      if (user) {
        // Link Google ID to existing user
        user.googleId = profile.id;
        await user.save();
      } else {
        // Create new user
        user = new User({
          googleId: profile.id,
          email: profile.emails[0].value,
          name: profile.displayName,
          phone: 'default-phone', // You may need to prompt for this later
          role: 'client', // Default role, adjust as needed
          profileImage: profile.photos[0].value
        });
        await user.save();
      }
    }
    return done(null, user);
  } catch (err) {
    return done(err, null);
  }
}));

// Serialize and deserialize user
passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser(async (id, done) => {
  const user = await User.findById(id);
  done(null, user);
});

module.exports = passport;