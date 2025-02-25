const ProductSubcategory = require('../models/productSubcategoryModel');

exports.getAllSubcategories = (req, res) => {
    ProductSubcategory.findAll((err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
};

exports.getSubcategoryById = (req, res) => {
    ProductSubcategory.findById(req.params.id, (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!result.length) return res.status(404).json({ message: 'Subcategory not found' });
        res.json(result[0]);
    });
};

exports.getSubcategoriesByCategoryId = (req, res) => {
    ProductSubcategory.findByCategoryId(req.params.categoryId, (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
};

exports.createSubcategory = (req, res) => {
    const { name, category_id, description } = req.body;
    ProductSubcategory.create(name, category_id, description, (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        res.status(201).json({ message: 'Subcategory created successfully', id: result.insertId });
    });
};

exports.updateSubcategory = (req, res) => {
    const { name, category_id, description } = req.body;
    ProductSubcategory.update(req.params.id, name, category_id, description, (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Subcategory updated successfully' });
    });
};

exports.deleteSubcategory = (req, res) => {
    ProductSubcategory.delete(req.params.id, (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Subcategory deleted successfully' });
    });
};
