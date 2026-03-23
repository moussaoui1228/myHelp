"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const OilQualitySetting_1 = require("../models/OilQualitySetting");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// GET /api/oil-quality — Public
router.get('/', async (req, res) => {
    try {
        const qualities = await OilQualitySetting_1.OilQualitySetting.find();
        res.json(qualities);
    }
    catch {
        res.status(500).json({ message: 'Erreur serveur.' });
    }
});
// PUT /api/oil-quality/:quality — Owner only
router.put('/:quality', auth_1.authenticate, auth_1.ownerOnly, async (req, res) => {
    const validQualities = ['extra_virgin', 'virgin', 'third_quality'];
    if (!validQualities.includes(req.params.quality)) {
        res.status(400).json({ message: 'Qualité invalide.' });
        return;
    }
    try {
        const setting = await OilQualitySetting_1.OilQualitySetting.findOneAndUpdate({ quality_name: req.params.quality }, req.body, { new: true });
        if (!setting) {
            res.status(404).json({ message: 'Qualité introuvable.' });
            return;
        }
        res.json(setting);
    }
    catch {
        res.status(500).json({ message: 'Erreur serveur.' });
    }
});
exports.default = router;
