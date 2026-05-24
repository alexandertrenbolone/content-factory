"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const client_1 = require("@prisma/client");
const jwt_1 = require("../lib/jwt");
const auth_1 = require("../lib/auth");
const validate_1 = require("../lib/validate");
const router = (0, express_1.Router)();
const prisma = new client_1.PrismaClient();
// POST /auth/register
router.post('/register', async (req, res) => {
    const { email, password, name, companyName } = req.body;
    const err = (0, validate_1.firstError)((0, validate_1.validateString)(email, 'email', { min: 5, max: 100 }), (0, validate_1.validateString)(password, 'password', { min: 6, max: 100 }), (0, validate_1.validateString)(name, 'name', { min: 2, max: 100 }), (0, validate_1.validateString)(companyName, 'companyName', { min: 2, max: 100 }));
    if (err) {
        res.status(400).json({ error: err });
        return;
    }
    if (!(0, validate_1.isValidEmail)(email)) {
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
    const passwordHash = await bcryptjs_1.default.hash(password, 12);
    const company = await prisma.company.create({ data: { name: companyName.trim() } });
    const user = await prisma.user.create({
        data: { email: email.trim().toLowerCase(), passwordHash, name: name.trim(), companyId: company.id },
    });
    const token = (0, jwt_1.signToken)({ userId: user.id, companyId: company.id });
    res.status(201).json({ token, user: { id: user.id, email: user.email, name: user.name } });
});
// POST /auth/login
router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        res.status(400).json({ error: 'Нужны email и password' });
        return;
    }
    if (!(0, validate_1.isValidEmail)(String(email))) {
        res.status(400).json({ error: 'Неверный формат email' });
        return;
    }
    const user = await prisma.user.findUnique({ where: { email: String(email).trim().toLowerCase() } });
    if (!user) {
        res.status(401).json({ error: 'Неверный email или пароль' });
        return;
    }
    const valid = await bcryptjs_1.default.compare(password, user.passwordHash);
    if (!valid) {
        res.status(401).json({ error: 'Неверный email или пароль' });
        return;
    }
    const token = (0, jwt_1.signToken)({ userId: user.id, companyId: user.companyId });
    res.json({ token, user: { id: user.id, email: user.email, name: user.name } });
});
// GET /auth/me
router.get('/me', auth_1.requireAuth, async (req, res) => {
    const user = await prisma.user.findUnique({
        where: { id: req.userId },
        select: { id: true, email: true, name: true, companyId: true, createdAt: true },
    });
    res.json(user);
});
exports.default = router;
