import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { adminAuth } from '../lib/firebase-admin.ts';
import { getOrCreateUser, getUserById, getUserByUid } from '../db/users.ts';

const SESSION_SECRET = process.env.SESSION_SECRET || 'recircuit-dev-session-secret-2026';

export interface AuthenticatedUser {
  id: number;
  uid: string;
  email: string;
  fullName: string;
  role: string;
  phone: string;
  accountStatus: string;
  emailVerifiedAt: Date | null;
  isDemo: boolean;
}

export interface AuthRequest extends Request {
  user?: {
    uid: string;
    email?: string;
    name?: string;
  };
  dbUser?: AuthenticatedUser;
}

export function createSessionToken(userId: number, uid: string, email: string, role: string): string {
  const payload = JSON.stringify({
    userId,
    uid,
    email,
    role,
    exp: Date.now() + 7 * 24 * 60 * 60 * 1000,
  });
  const base64Payload = Buffer.from(payload).toString('base64url');
  const signature = crypto
    .createHmac('sha256', SESSION_SECRET)
    .update(base64Payload)
    .digest('base64url');
  return `rc_sess.${base64Payload}.${signature}`;
}

export function verifySessionToken(token: string): { userId: number; uid: string; email: string; role: string } | null {
  try {
    if (!token.startsWith('rc_sess.')) return null;
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const [, base64Payload, signature] = parts;
    const expectedSig = crypto
      .createHmac('sha256', SESSION_SECRET)
      .update(base64Payload)
      .digest('base64url');
    if (signature !== expectedSig) return null;
    const decoded = JSON.parse(Buffer.from(base64Payload, 'base64url').toString('utf8'));
    if (decoded.exp && decoded.exp < Date.now()) return null;
    return decoded;
  } catch {
    return null;
  }
}

export const optionalAuth = async (req: AuthRequest, _res: Response, next: NextFunction) => {
  try {
    let token: string | undefined;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split('Bearer ')[1];
    } else if (req.cookies && req.cookies.recircuit_session) {
      token = req.cookies.recircuit_session;
    }

    if (!token) {
      return next();
    }

    // Check if it's our signed session token
    if (token.startsWith('rc_sess.')) {
      const sessionData = verifySessionToken(token);
      if (sessionData) {
        const dbUser = await getUserById(sessionData.userId);
        if (dbUser && dbUser.accountStatus === 'ACTIVE') {
          req.user = { uid: dbUser.uid, email: dbUser.email, name: dbUser.fullName };
          req.dbUser = dbUser;
        }
      }
      return next();
    }

    // Otherwise verify as Firebase ID token
    const decodedToken = await adminAuth.verifyIdToken(token);
    req.user = {
      uid: decodedToken.uid,
      email: decodedToken.email,
      name: decodedToken.name,
    };

    if (decodedToken.email) {
      const dbUser = await getOrCreateUser(
        decodedToken.uid,
        decodedToken.email,
        decodedToken.name || decodedToken.email.split('@')[0]
      );
      req.dbUser = dbUser;
    } else {
      const existing = await getUserByUid(decodedToken.uid);
      if (existing) req.dbUser = existing;
    }
    return next();
  } catch {
    return next();
  }
};

export const requireAuth = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    let token: string | undefined;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split('Bearer ')[1];
    } else if (req.cookies && req.cookies.recircuit_session) {
      token = req.cookies.recircuit_session;
    }

    if (!token) {
      return res.status(401).json({ error: 'Unauthorized: Missing authentication token' });
    }

    if (token.startsWith('rc_sess.')) {
      const sessionData = verifySessionToken(token);
      if (!sessionData) {
        return res.status(401).json({ error: 'Unauthorized: Invalid or expired session token' });
      }
      const dbUser = await getUserById(sessionData.userId);
      if (!dbUser) {
        return res.status(401).json({ error: 'Unauthorized: User account not found' });
      }
      if (dbUser.accountStatus !== 'ACTIVE') {
        return res.status(403).json({ error: `Account is ${dbUser.accountStatus.toLowerCase()}` });
      }
      req.user = { uid: dbUser.uid, email: dbUser.email, name: dbUser.fullName };
      req.dbUser = dbUser;
      return next();
    }

    const decodedToken = await adminAuth.verifyIdToken(token);
    req.user = {
      uid: decodedToken.uid,
      email: decodedToken.email,
      name: decodedToken.name,
    };

    const dbUser = await getOrCreateUser(
      decodedToken.uid,
      decodedToken.email || `${decodedToken.uid}@firebase.user`,
      decodedToken.name
    );

    if (dbUser.accountStatus !== 'ACTIVE') {
      return res.status(403).json({ error: `Account is ${dbUser.accountStatus.toLowerCase()}` });
    }

    req.dbUser = dbUser;
    return next();
  } catch (error) {
    console.error('Error verifying authentication token:', error);
    return res.status(401).json({ error: 'Unauthorized: Invalid token' });
  }
};

export const requireRole = (...roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.dbUser) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    if (!roles.includes(req.dbUser.role)) {
      return res.status(403).json({ error: `Forbidden: Requires ${roles.join(' or ')} role` });
    }
    next();
  };
};
