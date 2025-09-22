import passport from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { storage } from '../storage';
import { verifyPassword } from './auth';
import type { users } from '@shared/schema';

type User = typeof users.$inferSelect;

/**
 * Configure Passport Local Strategy for email/password authentication
 */
passport.use(new LocalStrategy({
  usernameField: 'email',
  passwordField: 'password',
}, async (email: string, password: string, done) => {
  try {
    // Normalize email to lowercase for consistent lookup
    const normalizedEmail = email.toLowerCase().trim();
    
    // Find user by email
    const user = await storage.getUserByEmail(normalizedEmail);
    
    // Use generic error message for all credential failures to prevent user enumeration
    const genericError = 'Invalid email or password';
    
    if (!user) {
      console.log(`[Auth] Login attempt with non-existent email: ${normalizedEmail}`);
      return done(null, false, { message: genericError });
    }

    // Check if user has a password (not OAuth-only user)
    if (!user.password) {
      console.log(`[Auth] Login attempt on OAuth-only account: ${normalizedEmail}`);
      return done(null, false, { message: genericError });
    }

    // Check if email is verified
    if (!user.emailVerified) {
      console.log(`[Auth] Login attempt with unverified email: ${normalizedEmail}`);
      return done(null, false, { message: genericError });
    }

    // Verify password
    const isPasswordValid = await verifyPassword(password, user.password);
    
    if (!isPasswordValid) {
      console.log(`[Auth] Login attempt with invalid password: ${normalizedEmail}`);
      return done(null, false, { message: genericError });
    }

    // Success - return user without password
    const { password: _, ...userWithoutPassword } = user;
    console.log(`[Auth] Successful login: ${normalizedEmail}`);
    return done(null, userWithoutPassword);
    
  } catch (error) {
    console.error('[Auth] Local strategy error:', error);
    return done(error);
  }
}));

/**
 * Configure Passport Google OAuth Strategy
 * Only configures if Google OAuth credentials are provided
 */
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: '/api/auth/google/callback',
  }, async (accessToken: string, refreshToken: string, profile: any, done) => {
    try {
      // Validate that Google profile has a verified email
      const email = profile.emails?.[0]?.value;
      const emailVerified = profile._json?.email_verified === true || profile.emails?.[0]?.verified === true;
      
      if (!email || !emailVerified) {
        console.log(`[Auth] Google login rejected - missing or unverified email for profile ${profile.id}`);
        return done(null, false, { message: 'Authentication failed. Please try again.' });
      }

      const normalizedEmail = email.toLowerCase().trim();

      // Check if user already exists with this Google ID
      let user = await storage.getUserByGoogleId(profile.id);
      
      if (user) {
        // User exists with Google ID - return user
        const { password: _, ...userWithoutPassword } = user;
        return done(null, userWithoutPassword);
      }

      // Check if user exists with same email
      const existingUser = await storage.getUserByEmail(normalizedEmail);
      
      if (existingUser) {
        // Link Google account to existing user and mark email as verified
        await storage.linkGoogleAccount(existingUser.id, profile.id);
        
        // Update email verification status if not already verified
        if (!existingUser.emailVerified) {
          await storage.updateUserEmailVerification(existingUser.id, true);
        }
        
        const updatedUser = await storage.getUser(existingUser.id);
        const { password: _, ...userWithoutPassword } = updatedUser!;
        return done(null, userWithoutPassword);
      }

      // Create new user from Google profile
      const newUser = await storage.createGoogleUser({
        email: normalizedEmail,
        firstName: profile.name?.givenName || '',
        lastName: profile.name?.familyName || '',
        profileImageUrl: profile.photos?.[0]?.value || null,
        googleId: profile.id,
        emailVerified: true, // Google emails are verified
      });

      const { password: _, ...userWithoutPassword } = newUser;
      return done(null, userWithoutPassword);
      
    } catch (error) {
      console.error('[Auth] Google strategy error:', error);
      return done(error);
    }
  }));
  
  console.log('[Auth] Google OAuth strategy configured');
} else {
  console.warn('[Auth] Google OAuth not configured - missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET');
}

/**
 * Serialize user for session storage
 */
passport.serializeUser((user: any, done) => {
  done(null, user.id);
});

/**
 * Deserialize user from session storage
 */
passport.deserializeUser(async (id: string, done) => {
  try {
    const user = await storage.getUser(id);
    
    if (!user) {
      return done(null, false);
    }

    // Return user without password for security
    const { password: _, ...userWithoutPassword } = user;
    done(null, userWithoutPassword);
    
  } catch (error) {
    console.error('[Auth] Deserialize user error:', error);
    done(error);
  }
});

export default passport;