import jwt from 'jsonwebtoken';
import { env } from '../config/env';
export function signAccessToken(user) {
    const expiresIn = env.jwtExpiresIn;
    return jwt.sign({
        sub: user.id,
        role: user.role,
        email: user.email
    }, env.jwtSecret, {
        expiresIn
    });
}
export function verifyAccessToken(token) {
    const decoded = jwt.verify(token, env.jwtSecret);
    if (typeof decoded === 'string') {
        throw new Error('Invalid token payload');
    }
    const sub = decoded.sub;
    if (!sub || typeof sub !== 'string' || typeof decoded.role !== 'string' || typeof decoded.email !== 'string') {
        throw new Error('Invalid token payload');
    }
    return {
        sub,
        role: decoded.role,
        email: decoded.email
    };
}
