"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const OliveCategory_1 = require("../models/OliveCategory");
const PressingService_1 = require("../models/PressingService");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// --- Olive Categories ---
// GET /api/prices/olives - Public
router.get('/olives', async (req, res) => {
    try {
        const categories = await OliveCategory_1.OliveCategory.find({ active: true });
        res.json(categories);
    }
    catch {
        res.status(500).json({ message: 'Erreur serveur.' });
    }
});
// POST /api/prices/olives - Owner Only
router.post('/olives', auth_1.authenticate, auth_1.ownerOnly, [
    (0, express_validator_1.body)('name').notEmpty().withMessage('Le nom est requis'),
    (0, express_validator_1.body)('price_per_liter').isNumeric().withMessage('Le prix doit être un nombre'),
    (0, express_validator_1.body)('stock_liters').optional().isNumeric().withMessage('Le stock doit être un nombre'),
], async (req, res) => {
    const errors = (0, express_validator_1.validationResult)(req);
    if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
    }
    try {
        const category = await OliveCategory_1.OliveCategory.create(req.body);
        res.status(201).json(category);
    }
    catch (error) {
        if (error.code === 11000) {
            res.status(400).json({ message: 'Cette catégorie existe déjà.' });
            return;
        }
        res.status(500).json({ message: 'Erreur serveur.' });
    }
});
// PATCH /api/prices/olives/:id - Owner Only (Update Price)
router.patch('/olives/:id', auth_1.authenticate, auth_1.ownerOnly, [
    (0, express_validator_1.body)('name').optional().notEmpty().withMessage('Le nom ne peut pas être vide'),
    (0, express_validator_1.body)('price_per_liter').optional().isNumeric().withMessage('Le prix doit être un nombre'),
    (0, express_validator_1.body)('stock_liters').optional().isNumeric().withMessage('Le stock doit être un nombre'),
    (0, express_validator_1.body)('active').optional().isBoolean().withMessage('Actif doit être un booléen'),
], async (req, res) => {
    try {
        const category = await OliveCategory_1.OliveCategory.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!category) {
            res.status(404).json({ message: 'Catégorie introuvable.' });
            return;
        }
        res.json(category);
    }
    catch {
        res.status(500).json({ message: 'Erreur serveur.' });
    }
});
// DELETE /api/prices/olives/:id - Owner Only (Delete Category)
router.delete('/olives/:id', auth_1.authenticate, auth_1.ownerOnly, async (req, res) => {
    try {
        const category = await OliveCategory_1.OliveCategory.findByIdAndDelete(req.params.id);
        if (!category) {
            res.status(404).json({ message: 'Catégorie introuvable.' });
            return;
        }
        res.json({ message: 'Catégorie supprimée avec succès.' });
    }
    catch {
        res.status(500).json({ message: 'Erreur serveur.' });
    }
});
// --- Pressing Services ---
// GET /api/prices/pressing - Public
router.get('/pressing', async (req, res) => {
    try {
        const services = await PressingService_1.PressingService.find({ active: true });
        res.json(services);
    }
    catch {
        res.status(500).json({ message: 'Erreur serveur.' });
    }
});
// POST /api/prices/pressing - Owner Only
router.post('/pressing', auth_1.authenticate, auth_1.ownerOnly, [
    (0, express_validator_1.body)('name').notEmpty().withMessage('Le nom est requis'),
    (0, express_validator_1.body)('category').isIn(['extra_virgin', 'virgin', 'third_quality']).withMessage('Catégorie invalide'),
    (0, express_validator_1.body)('fee').isNumeric().withMessage('Le frais doit être un nombre'),
    (0, express_validator_1.body)('yield_per_kg').optional().isNumeric().withMessage('Le rendement doit être un nombre'),
], async (req, res) => {
    const errors = (0, express_validator_1.validationResult)(req);
    if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
    }
    try {
        const service = await PressingService_1.PressingService.create(req.body);
        res.status(201).json(service);
    }
    catch (error) {
        if (error.code === 11000) {
            res.status(400).json({ message: 'Ce service existe déjà.' });
            return;
        }
        res.status(500).json({ message: 'Erreur serveur.' });
    }
});
// PATCH /api/prices/pressing/:id - Owner Only (Update Fee)
router.patch('/pressing/:id', auth_1.authenticate, auth_1.ownerOnly, [
    (0, express_validator_1.body)('name').optional().notEmpty().withMessage('Le nom ne peut pas être vide'),
    (0, express_validator_1.body)('category').optional().isIn(['extra_virgin', 'virgin', 'third_quality']).withMessage('Catégorie invalide'),
    (0, express_validator_1.body)('fee').optional().isNumeric().withMessage('Le frais doit être un nombre'),
    (0, express_validator_1.body)('yield_per_kg').optional().isNumeric().withMessage('Le rendement doit être un nombre'),
    (0, express_validator_1.body)('active').optional().isBoolean().withMessage('Actif doit être un booléen'),
], async (req, res) => {
    try {
        const service = await PressingService_1.PressingService.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!service) {
            res.status(404).json({ message: 'Service introuvable.' });
            return;
        }
        res.json(service);
    }
    catch {
        res.status(500).json({ message: 'Erreur serveur.' });
    }
});
// DELETE /api/prices/pressing/:id - Owner Only (Delete Service)
router.delete('/pressing/:id', auth_1.authenticate, auth_1.ownerOnly, async (req, res) => {
    try {
        const service = await PressingService_1.PressingService.findByIdAndDelete(req.params.id);
        if (!service) {
            res.status(404).json({ message: 'Service introuvable.' });
            return;
        }
        res.json({ message: 'Service supprimé avec succès.' });
    }
    catch {
        res.status(500).json({ message: 'Erreur serveur.' });
    }
});
exports.default = router;
