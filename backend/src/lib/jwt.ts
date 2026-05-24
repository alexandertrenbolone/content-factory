import jwt from 'jsonwebtoken';

const SECRET = process.env.JWT_SECRET || 'dev-secret';

export function signToken(payload: { userId: string; companyId: string }): string {
  return jwt.sign(payload, SECRET, { expiresIn: '30d' });
}

export function verifyToken(token: string): { userId: string; companyId: string } {
  return jwt.verify(token, SECRET) as { userId: string; companyId: string };
}
