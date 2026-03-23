"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const Notification_1 = require("../models/Notification");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// GET /api/notifications - Get user's notifications
router.get('/', auth_1.authenticate, async (req, res) => {
    try {
        const notifications = await Notification_1.Notification.find({ user_id: req.user.id }).sort({ created_at: -1 });
        res.json(notifications);
    }
    catch (err) {
        res.status(500).json({ message: 'Erreur lors de la récupération des notifications.' });
    }
});
// PATCH /api/notifications/read-all - Mark all as read
router.patch('/read-all', auth_1.authenticate, async (req, res) => {
    try {
        await Notification_1.Notification.updateMany({ user_id: req.user.id, is_read: false }, { is_read: true });
        res.json({ message: 'All notifications marked as read' });
    }
    catch (err) {
        res.status(500).json({ message: 'Erreur lors de la mise à jour des notifications.' });
    }
});
// GET /api/notifications/unread-count - Get count of unread notifications
router.get('/unread-count', auth_1.authenticate, async (req, res) => {
    try {
        const count = await Notification_1.Notification.countDocuments({ user_id: req.user.id, is_read: false });
        res.json({ count });
    }
    catch (err) {
        res.status(500).json({ message: 'Erreur lors du comptage des notifications.' });
    }
});
// PATCH /api/notifications/:id/read - Mark notification as read
router.patch('/:id/read', auth_1.authenticate, async (req, res) => {
    try {
        const notification = await Notification_1.Notification.findOneAndUpdate({ _id: req.params.id, user_id: req.user.id }, { is_read: true }, { new: true });
        if (!notification)
            return res.status(404).json({ message: 'Notification non trouvée' });
        res.json(notification);
    }
    catch (err) {
        res.status(500).json({ message: 'Erreur lors de la mise à jour de la notification.' });
    }
});
exports.default = router;
