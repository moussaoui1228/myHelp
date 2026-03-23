"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const Comment_1 = require("../models/Comment");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// GET /api/comments - Get all comments
router.get('/', async (req, res) => {
    try {
        const comments = await Comment_1.Comment.find()
            .populate('user_id', 'first_name last_name')
            .sort({ created_at: -1 });
        res.json(comments);
    }
    catch (err) {
        res.status(500).json({ message: 'Erreur lors de la récupération des commentaires.' });
    }
});
router.post('/', auth_1.authenticate, [
    (0, express_validator_1.body)('content').notEmpty().withMessage('Le contenu du commentaire est requis'),
    (0, express_validator_1.body)('rating').isInt({ min: 1, max: 5 }).withMessage('La note doit être entre 1 et 5'),
], async (req, res) => {
    const errors = (0, express_validator_1.validationResult)(req);
    if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
    }
    try {
        const comment = await Comment_1.Comment.create({
            user_id: req.user.id,
            content: req.body.content,
            rating: req.body.rating || 5,
        });
        const populatedComment = await comment.populate('user_id', 'first_name last_name');
        res.status(201).json(populatedComment);
    }
    catch (err) {
        res.status(500).json({ message: 'Erreur lors de la création du commentaire.' });
    }
});
// DELETE /api/comments/:id - Delete a comment
router.delete('/:id', auth_1.authenticate, async (req, res) => {
    try {
        const comment = await Comment_1.Comment.findById(req.params.id);
        if (!comment) {
            res.status(404).json({ message: 'Commentaire non trouvé.' });
            return;
        }
        // Check ownership: only the author or an owner can delete
        if (comment.user_id.toString() !== req.user.id && req.user.role !== 'owner') {
            res.status(403).json({ message: 'Opération non autorisée.' });
            return;
        }
        await comment.deleteOne();
        res.json({ message: 'Commentaire supprimé.' });
    }
    catch (err) {
        res.status(500).json({ message: 'Erreur lors de la suppression.' });
    }
});
exports.default = router;
