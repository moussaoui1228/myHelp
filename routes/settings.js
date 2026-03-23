"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const Settings_1 = require("../models/Settings");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// GET /api/settings
router.get('/', async (req, res) => {
    try {
        const settings = await Settings_1.Settings.findOne();
        res.json(settings || { pressing_percentage_taken: 30 });
    }
    catch {
        res.status(500).json({ message: 'Erreur serveur.' });
    }
});
// PUT /api/settings — Owner only
router.put('/', auth_1.authenticate, auth_1.ownerOnly, async (req, res) => {
    try {
        const settings = await Settings_1.Settings.findOneAndUpdate({}, { ...req.body, updated_at: new Date() }, { new: true, upsert: true });
        res.json(settings);
    }
    catch {
        res.status(500).json({ message: 'Erreur serveur.' });
    }
});
exports.default = router;
