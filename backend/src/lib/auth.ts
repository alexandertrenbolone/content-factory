import { Request, Response, NextFunction } from 'express';
import { verifyToken } from './jwt';

export interface AuthRequest extends Request {
  userId?: string;
  companyId?: string;
}

export function requireAuth(req: AuthRequest, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  try {
    const token = header.slice(7);
    const payload = verifyToken(token);
    req.userId = payload.userId;
    req.companyId = payload.companyId;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
}
