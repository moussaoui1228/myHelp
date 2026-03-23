"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const Product_1 = require("../models/Product");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// GET /api/products - Get all available products
router.get('/', async (req, res) => {
    try {
        const products = await Product_1.Product.find({ is_available: true });
        res.json(products);
    }
    catch (err) {
        res.status(500).json({ message: 'Erreur lors de la récupération des produits.' });
    }
});
// POST /api/products - Create a new product (Admin only)
router.post('/', auth_1.authenticate, auth_1.ownerOnly, [
    (0, express_validator_1.body)('name').notEmpty().withMessage('Le nom est requis'),
    (0, express_validator_1.body)('category').isIn(['extra_virgin', 'virgin', 'third_quality']).withMessage('Catégorie invalide'),
    (0, express_validator_1.body)('price_per_liter').isNumeric().withMessage('Le prix doit être un nombre'),
    (0, express_validator_1.body)('stock_liters').isNumeric().withMessage('Le stock doit être un nombre'),
], async (req, res) => {
    const errors = (0, express_validator_1.validationResult)(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    try {
        const product = await Product_1.Product.create(req.body);
        res.status(201).json(product);
    }
    catch (err) {
        res.status(500).json({ message: 'Erreur lors de la création du produit.' });
    }
});
// PUT /api/products/:id - Update a product (Admin only)
router.put('/:id', auth_1.authenticate, auth_1.ownerOnly, async (req, res) => {
    try {
        const product = await Product_1.Product.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!product)
            return res.status(404).json({ message: 'Produit non trouvé' });
        res.json(product);
    }
    catch (err) {
        res.status(500).json({ message: 'Erreur lors de la mise à jour du produit.' });
    }
});
// DELETE /api/products/:id - Delete a product (Admin only)
router.delete('/:id', auth_1.authenticate, auth_1.ownerOnly, async (req, res) => {
    try {
        const product = await Product_1.Product.findByIdAndDelete(req.params.id);
        if (!product)
            return res.status(404).json({ message: 'Produit non trouvé' });
        res.json({ message: 'Produit supprimé avec succès' });
    }
    catch (err) {
        res.status(500).json({ message: 'Erreur lors de la suppression du produit.' });
    }
});
exports.default = router;
