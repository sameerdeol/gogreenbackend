const ProductCategory = require('../models/productCategoryModel');

exports.getAllCategories = (req, res) => {
    ProductCategory.findAll((err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
};

exports.getCategoryById = (req, res) => {
    ProductCategory.findById(req.params.id, (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!result.length) return res.status(404).json({ message: 'Category not found' });
        res.json(result[0]);
    });
};

exports.createCategory = (req, res) => {
    const { name, description } = req.body;
    ProductCategory.create(name, description, (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        res.status(201).json({ message: 'Category created successfully', id: result.insertId });
    });
};

exports.updateCategory = (req, res) => {
    const { name, description } = req.body;
    ProductCategory.update(req.params.id, name, description, (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Category updated successfully' });
    });
};

exports.deleteCategory = (req, res) => {
    ProductCategory.delete(req.params.id, (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Category deleted successfully' });
    });
};
