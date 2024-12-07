const isAdmin = (req, res, next) => {
    if (!req.session.user || !req.session.user.isAdmin) {
        return res.status(403).render('error', {
            message: 'Access denied. Admin privileges required.',
            error: { status: 403 }
        });
    }
    next();
};

module.exports = isAdmin;
