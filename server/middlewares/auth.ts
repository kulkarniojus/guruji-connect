import { Request, Response, NextFunction } from 'express';
import { pool } from '../db';
import { isSampleAccount } from '../authAccess';

/**
 * Middleware to check if user is authenticated
 */
export const isAuthenticated = async (req: Request, res: Response, next: NextFunction) => {
  if (!req.session?.userId) return res.status(401).json({ message: 'Unauthorized' });
  try {
    const result = await pool.query(`SELECT email,role,"isBlocked" FROM users WHERE id=$1`, [req.session.userId]);
    const user = result.rows[0];
    if (!user || user.isBlocked || isSampleAccount(user.email)) {
      req.session.destroy(() => {});
      return res.status(401).json({message: 'Please log in with an active registered account'});
    }
    req.session.userRole = user.role;
    return next();
  } catch {
    return res.status(503).json({message: 'Unable to verify your login. Please try again'});
  }
};

/**
 * Middleware to check if user has required role
 */
export const checkRole = (roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.session || !req.session.userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    if (!req.session.userRole || !roles.includes(req.session.userRole)) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    next();
  };
};