const Banner = require('../models/Banner');
const asyncHandler = require('../utils/asyncHandler');

// POST /banners — Superadmin only
const createBanner = asyncHandler(async (req, res) => {
  const { title, subtitle, image, link, order } = req.body;

  const banner = await Banner.create({
    title,
    subtitle: subtitle || '',
    image,
    link: link || '',
    order: order || 0,
    createdBy: req.user._id,
  });

  res.status(201).json({
    success: true,
    message: 'Banner created',
    banner,
  });
});

// GET /banners — Superadmin only
const getAllBanners = asyncHandler(async (req, res) => {
  const banners = await Banner.find()
    .populate('createdBy', 'name email')
    .sort({ order: 1 });

  res.status(200).json({
    success: true,
    count: banners.length,
    banners,
  });
});

// GET /banners/active — Public
const getActiveBanners = asyncHandler(async (req, res) => {
  const banners = await Banner.find({ isActive: true }).sort({ order: 1 });

  res.status(200).json({
    success: true,
    count: banners.length,
    banners,
  });
});

// PUT /banners/:id — Superadmin only
const updateBanner = asyncHandler(async (req, res) => {
  const banner = await Banner.findById(req.params.id);
  if (!banner) {
    const error = new Error('Banner not found');
    error.statusCode = 404;
    throw error;
  }

  const { title, subtitle, image, link, order, isActive } = req.body;

  if (title)    banner.title    = title;
  if (subtitle) banner.subtitle = subtitle;
  if (image)    banner.image    = image;
  if (link)     banner.link     = link;
  if (order !== undefined)    banner.order    = order;
  if (isActive !== undefined) banner.isActive = isActive;

  await banner.save();

  res.status(200).json({
    success: true,
    message: 'Banner updated',
    banner,
  });
});

// DELETE /banners/:id — Superadmin only
const deleteBanner = asyncHandler(async (req, res) => {
  const banner = await Banner.findById(req.params.id);
  if (!banner) {
    const error = new Error('Banner not found');
    error.statusCode = 404;
    throw error;
  }

  await banner.deleteOne();

  res.status(200).json({
    success: true,
    message: 'Banner deleted',
  });
});

module.exports = {
  createBanner,
  getAllBanners,
  getActiveBanners,
  updateBanner,
  deleteBanner,
};