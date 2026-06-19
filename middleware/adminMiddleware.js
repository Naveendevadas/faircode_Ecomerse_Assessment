const adminOnly = (req, res, next) => {
  if (req.user && (req.user.role === 'admin' || req.user.role === 'superadmin')) {
    next();
  } else {
    const error = new Error('Not authorized, admin only');
    error.statusCode = 403;
    next(error);
  }
};

module.exports = { adminOnly };