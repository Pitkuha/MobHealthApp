import createError from 'http-errors';
import { prisma } from '../db/prisma';
import { verifyAccessToken } from '../utils/jwt';
export async function requireAuth(req, _res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
        return next(createError(401, 'Unauthorized'));
    }
    const token = authHeader.slice(7);
    try {
        const payload = verifyAccessToken(token);
        const user = await prisma.user.findUnique({
            where: { id: payload.sub },
            select: {
                id: true,
                role: true,
                email: true
            }
        });
        if (!user) {
            return next(createError(401, 'Unauthorized'));
        }
        req.authUser = {
            id: user.id,
            role: user.role,
            email: user.email
        };
        return next();
    }
    catch {
        return next(createError(401, 'Invalid or expired token'));
    }
}
