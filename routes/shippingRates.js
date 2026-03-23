"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const ShippingRate_1 = require("../models/ShippingRate");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// GET /api/shipping-rates — Public
router.get('/', async (req, res) => {
    try {
        const rates = await ShippingRate_1.ShippingRate.find().sort({ wilaya_code: 1 });
        res.json(rates);
    }
    catch {
        res.status(500).json({ message: 'Erreur serveur.' });
    }
});
// PUT /api/shipping-rates/:wilaya — Owner only
router.put('/:wilaya', auth_1.authenticate, auth_1.ownerOnly, async (req, res) => {
    try {
        const rate = await ShippingRate_1.ShippingRate.findOneAndUpdate({ wilaya: req.params.wilaya }, { price: req.body.price }, { new: true });
        if (!rate) {
            res.status(404).json({ message: 'Wilaya introuvable.' });
            return;
        }
        res.json(rate);
    }
    catch {
        res.status(500).json({ message: 'Erreur serveur.' });
    }
});
exports.default = router;
