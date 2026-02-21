import createError from 'http-errors';
export function requireRole(...allowedRoles) {
    return (req, _res, next) => {
        const role = req.authUser?.role;
        if (!role) {
            return next(createError(401, 'Unauthorized'));
        }
        if (!allowedRoles.includes(role)) {
            return next(createError(403, 'Forbidden'));
        }
        return next();
    };
}
