const superAdminOnly = (req, res, next) => {
  if (req.user && req.user.role === 'superadmin') {
    next();
  } else {
    const error = new Error('Not authorized, superadmin only');
    error.statusCode = 403;
    next(error);
  }
};

module.exports = { superAdminOnly };