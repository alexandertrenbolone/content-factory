import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
import { signToken } from '../lib/jwt';
import { requireAuth, AuthRequest } from '../lib/auth';
import { isValidEmail, validateString, firstError } from '../lib/validate';

const router = Router();
const prisma = new PrismaClient();

// POST /auth/register
router.post('/register', async (req: Request, res: Response) => {
  const { email, password, name, companyName } = req.body;

  const err = firstError(
    validateString(email, 'email', { min: 5, max: 100 }),
    validateString(password, 'password', { min: 6, max: 100 }),
    validateString(name, 'name', { min: 2, max: 100 }),
    validateString(companyName, 'companyName', { min: 2, max: 100 }),
  );
  if (err) { res.status(400).json({ error: err }); return; }

  if (!isValidEmail(email)) {
    res.status(400).json({ error: 'Неверный формат email' });
    return;
  }
  if (password.trim().length < 6) {
    res.status(400).json({ error: 'Пароль должен быть не менее 6 символов' });
    return;
  }

  const existing = await prisma.user.findUnique({ where: { email: email.trim().toLowerCase() } });
  if (existing) {
    res.status(409).json({ error: 'Пользователь с таким email уже существует' });
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const company = await prisma.company.create({ data: { name: companyName.trim() } });
  const user = await prisma.user.create({
    data: { email: email.trim().toLowerCase(), passwordHash, name: name.trim(), companyId: company.id },
  });

  const token = signToken({ userId: user.id, companyId: company.id });
  res.status(201).json({ token, user: { id: user.id, email: user.email, name: user.name } });
});

// POST /auth/login
router.post('/login', async (req: Request, res: Response) => {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400).json({ error: 'Нужны email и password' });
    return;
  }
  if (!isValidEmail(String(email))) {
    res.status(400).json({ error: 'Неверный формат email' });
    return;
  }

  const user = await prisma.user.findUnique({ where: { email: String(email).trim().toLowerCase() } });
  if (!user) {
    res.status(401).json({ error: 'Неверный email или пароль' });
    return;
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    res.status(401).json({ error: 'Неверный email или пароль' });
    return;
  }

  const token = signToken({ userId: user.id, companyId: user.companyId });
  res.json({ token, user: { id: user.id, email: user.email, name: user.name } });
});

// GET /auth/me
router.get('/me', requireAuth, async (req: AuthRequest, res: Response) => {
  const user = await prisma.user.findUnique({
    where: { id: req.userId },
    select: { id: true, email: true, name: true, companyId: true, createdAt: true },
  });
  res.json(user);
});

export default router;
