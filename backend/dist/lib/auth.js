"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireAuth = requireAuth;
const jwt_1 = require("./jwt");
function requireAuth(req, res, next) {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
    }
    try {
        const token = header.slice(7);
        const payload = (0, jwt_1.verifyToken)(token);
        req.userId = payload.userId;
        req.companyId = payload.companyId;
        next();
    }
    catch {
        res.status(401).json({ error: 'Invalid token' });
    }
}
