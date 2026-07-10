const Category = require("../models/Categorymodel");
exports.createCategory = async (req, res) => {
  try {
    const { name, parent, isActive } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Category name is required' });
    }

    const category = new Category({
      name: name.trim(),
      parent: parent || null,
      isActive: isActive !== undefined ? isActive : true,
    });
    await category.save(); // use .save() so pre('save') hook sets slug

    res.status(201).json({
      success: true,
      message: 'Category created successfully',
      data: category,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ success: false, message: 'A category with this name already exists' });
    }
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── GET /categories — flat list of ROOT categories only (active, for storefront) ──
exports.getAllCategories = async (req, res) => {
  try {
    const categories = await Category.find({ parent: null, isActive: true }).lean();
    res.status(200).json({ success: true, data: categories });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── GET /categories/admin — ALL root categories incl. inactive (admin only) ──
exports.getAllCategoriesAdmin = async (req, res) => {
  try {
    const categories = await Category.find({ parent: null }).lean();
    res.status(200).json({ success: true, data: categories });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── GET /categories/all — full nested tree ───────────────
exports.getAllCategoriesWithSubs = async (req, res) => {
  try {
    const allCategories = await Category.find({ isActive: true }).lean();

    const buildTree = (parentId = null) => {
      return allCategories
        .filter((cat) =>
          parentId === null
            ? !cat.parent
            : String(cat.parent) === String(parentId)
        )
        .map((cat) => ({ ...cat, children: buildTree(cat._id) }));
    };

    res.status(200).json({ success: true, data: buildTree(null) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── GET /categories/:id — single category with parent ────
exports.getCategoryById = async (req, res) => {
  try {
    const category = await Category.findById(req.params.id).populate('parent');
    if (!category) {
      return res.status(404).json({ success: false, message: 'Category not found' });
    }
    res.status(200).json({ success: true, data: category });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── GET /categories/:id/subcategories — direct children ──
exports.getSubCategories = async (req, res) => {
  try {
    const subcategories = await Category.find({
      parent: req.params.id,
      isActive: true,
    }).lean();
    res.status(200).json({ success: true, data: subcategories });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── PUT /categories/:id ──────────────────────────────────
exports.updateCategory = async (req, res) => {
  try {
    const { name, parent, isActive } = req.body;

    const category = await Category.findById(req.params.id);
    if (!category) {
      return res.status(404).json({ success: false, message: 'Category not found' });
    }

    if (name !== undefined) category.name = name;
    if (parent !== undefined) category.parent = parent || null;
    if (isActive !== undefined) category.isActive = isActive;

    await category.save(); // triggers slug update via pre('save')

    res.status(200).json({
      success: true,
      message: 'Category updated successfully',
      data: category,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ success: false, message: 'Category name already exists' });
    }
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── DELETE /categories/:id — deactivates recursively ─────
exports.deleteCategory = async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) {
      return res.status(404).json({ success: false, message: 'Category not found' });
    }

    const deactivateChildren = async (parentId) => {
      const children = await Category.find({ parent: parentId });
      for (const child of children) {
        child.isActive = false;
        await child.save();
        await deactivateChildren(child._id);
      }
    };

    await deactivateChildren(req.params.id);
    category.isActive = false;
    await category.save();

    res.status(200).json({
      success: true,
      message: 'Category and its subcategories deactivated successfully',
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};