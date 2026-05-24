"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const client_1 = require("@prisma/client");
const auth_1 = require("../lib/auth");
const crypto_1 = require("../lib/crypto");
const googleDrive = __importStar(require("../services/googleDrive"));
const yandexDisk = __importStar(require("../services/yandexDisk"));
const router = (0, express_1.Router)();
const prisma = new client_1.PrismaClient();
// GET /storage/status — какие хранилища подключены
router.get('/status', auth_1.requireAuth, async (req, res) => {
    const connections = await prisma.storageConnection.findMany({
        where: { companyId: req.companyId },
        select: { provider: true, folderName: true, createdAt: true },
    });
    res.json(connections);
});
// --- Google Drive ---
router.get('/google/auth', auth_1.requireAuth, (req, res) => {
    const url = googleDrive.getAuthUrl(req.companyId);
    res.json({ url });
});
router.get('/google/callback', async (req, res) => {
    const FRONTEND = process.env.FRONTEND_URL || 'http://localhost:5173';
    const { code, state: companyId, error } = req.query;
    if (error || !code || !companyId) {
        res.redirect(`${FRONTEND}/storage?error=cancelled`);
        return;
    }
    try {
        const tokens = await googleDrive.exchangeCode(code);
        await prisma.storageConnection.upsert({
            where: { companyId_provider: { companyId, provider: 'google' } },
            update: {
                encryptedAccessToken: (0, crypto_1.encrypt)(tokens.access_token),
                encryptedRefreshToken: tokens.refresh_token ? (0, crypto_1.encrypt)(tokens.refresh_token) : undefined,
                expiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
            },
            create: {
                companyId,
                provider: 'google',
                encryptedAccessToken: (0, crypto_1.encrypt)(tokens.access_token),
                encryptedRefreshToken: tokens.refresh_token ? (0, crypto_1.encrypt)(tokens.refresh_token) : null,
                expiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
            },
        });
        res.redirect(`${FRONTEND}/storage?connected=google`);
    }
    catch (e) {
        console.error('[storage/google/callback]', e.message);
        res.status(500).send('Ошибка при подключении Google Drive. Попробуй ещё раз.');
    }
});
// --- Yandex Disk ---
router.get('/yandex/auth', auth_1.requireAuth, (req, res) => {
    const url = yandexDisk.getAuthUrl(req.companyId);
    res.json({ url });
});
router.get('/yandex/callback', async (req, res) => {
    const FRONTEND = process.env.FRONTEND_URL || 'http://localhost:5173';
    const { code, state: companyId, error } = req.query;
    if (error || !code || !companyId) {
        res.redirect(`${FRONTEND}/storage?error=cancelled`);
        return;
    }
    try {
        const tokens = await yandexDisk.exchangeCode(code);
        const expiresAt = new Date(Date.now() + tokens.expires_in * 1000);
        await prisma.storageConnection.upsert({
            where: { companyId_provider: { companyId, provider: 'yandex' } },
            update: {
                encryptedAccessToken: (0, crypto_1.encrypt)(tokens.access_token),
                encryptedRefreshToken: tokens.refresh_token ? (0, crypto_1.encrypt)(tokens.refresh_token) : undefined,
                expiresAt,
            },
            create: {
                companyId,
                provider: 'yandex',
                encryptedAccessToken: (0, crypto_1.encrypt)(tokens.access_token),
                encryptedRefreshToken: tokens.refresh_token ? (0, crypto_1.encrypt)(tokens.refresh_token) : null,
                expiresAt,
            },
        });
        res.redirect(`${FRONTEND}/storage?connected=yandex`);
    }
    catch (e) {
        console.error('[storage/yandex/callback]', e.message);
        res.status(500).send('Ошибка при подключении Яндекс Диска. Попробуй ещё раз.');
    }
});
// DELETE /storage/:provider — отключить хранилище
router.delete('/:provider', auth_1.requireAuth, async (req, res) => {
    await prisma.storageConnection.deleteMany({
        where: { companyId: req.companyId, provider: req.params.provider },
    });
    res.json({ ok: true });
});
exports.default = router;
