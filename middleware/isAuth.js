const isAuth = (req, res, next) => {
    if (!req.session.user) {
        return res.status(401).render('error', {
            message: 'Please log in to access this page',
            error: { status: 401 }
        });
    }
    next();
};

module.exports = isAuth;
