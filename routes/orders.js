"use strict";
/**
 * ORDERS ROUTE
 * Handles everything related to customer orders for olive oil and products.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const Order_1 = require("../models/Order");
const Notification_1 = require("../models/Notification");
const OliveCategory_1 = require("../models/OliveCategory");
const Product_1 = require("../models/Product");
const User_1 = require("../models/User");
const auth_1 = require("../middleware/auth");
const sendEmail_1 = require("../utils/sendEmail");
const crypto_1 = __importDefault(require("crypto"));
const router = (0, express_1.Router)();
/**
 * [ADMIN ONLY] Get all orders
 * Retrieves every order in the system to display on the owner's dashboard.
 */
router.get('/', auth_1.authenticate, auth_1.ownerOnly, async (req, res) => {
    try {
        const orders = await Order_1.Order.find({ is_archived: false })
            .populate('user_id', 'first_name last_name email phone address is_blacklisted')
            .populate({ path: 'items.olive_category_id' })
            .populate({ path: 'items.pressing_service_id', select: 'name' })
            .sort({ created_at: -1 });
        res.json(orders);
    }
    catch {
        res.status(500).json({ message: 'Erreur serveur.' });
    }
});
/**
 * [CUSTOMER ONLY] Get my orders
 * Retrieves only the orders belonging to the logged-in user.
 */
router.get('/my', auth_1.authenticate, async (req, res) => {
    try {
        const orders = await Order_1.Order.find({ user_id: req.user.id })
            .populate({ path: 'items.olive_category_id' })
            .populate({ path: 'items.pressing_service_id', select: 'name' })
            .sort({ created_at: -1 });
        res.json(orders);
    }
    catch {
        res.status(500).json({ message: 'Erreur serveur.' });
    }
});
/**
 * [CUSTOMER] Create a new order
 * This is the most complex part: it checks stock, creates the order,
 * sends notifications to the admin, and an email to the customer.
 */
router.post('/', auth_1.authenticate, [
    // Validation: ensures the data sent from the frontend is correct
    (0, express_validator_1.body)('items').isArray({ min: 1 }).withMessage('La commande doit contenir au moins un article'),
    (0, express_validator_1.body)('items.*.quantity').isNumeric().withMessage('Quantité invalide'),
], async (req, res) => {
    const errors = (0, express_validator_1.validationResult)(req);
    if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
    }
    try {
        const { items, shipping, total_price } = req.body;
        // 1. STOCK CHECK: Verify we have enough oil/bottles before accepting the order
        for (const item of items) {
            if (item.olive_category_id) {
                const model = (item.model_type === 'Product' ? Product_1.Product : OliveCategory_1.OliveCategory);
                const itemData = await model.findById(item.olive_category_id);
                if (!itemData) {
                    res.status(404).json({ message: `Article introuvable.` });
                    return;
                }
                const stock = itemData.stock_liters;
                if (stock < item.quantity) {
                    res.status(400).json({ message: `Stock insuffisant pour ${itemData.name}.` });
                    return;
                }
            }
        }
        // 2. GENERATE TRACKING CODE: A random 6-character code for the customer
        const tracking_code = crypto_1.default.randomBytes(3).toString('hex').toUpperCase();
        // 3. CREATE ORDER IN DATABASE
        const order = await Order_1.Order.create({
            user_id: req.user.id,
            items,
            shipping,
            total_price,
            tracking_code,
            status: 'pending',
        });
        // 4. NOTIFY ADMINS: Tell the owners that a new sale just happened
        try {
            const owners = await User_1.User.find({ role: 'owner' }, '_id');
            const orderRef = order._id.toString().slice(-6).toUpperCase();
            const notifications = owners.map(owner => ({
                user_id: owner._id,
                order_id: order._id,
                title: '🛒 Nouvelle commande reçue !',
                message: `Une nouvelle commande #${orderRef} vient d'être passée. Montant total : ${total_price} DA.`,
            }));
            if (notifications.length > 0) {
                await Notification_1.Notification.insertMany(notifications);
            }
        }
        catch (notifError) {
            console.error('Failed to create owner notifications:', notifError);
        }
        // 5. UPDATE STOCK: Subtract the purchased quantity from our inventory
        for (const item of items) {
            if (item.olive_category_id) {
                const model = (item.model_type === 'Product' ? Product_1.Product : OliveCategory_1.OliveCategory);
                await model.findByIdAndUpdate(item.olive_category_id, {
                    $inc: { stock_liters: -item.quantity }
                });
            }
        }
        // 6. POPULATE DATA FOR RESPONSE
        const populatedOrder = await order.populate([
            { path: 'user_id', select: 'first_name last_name email phone address' },
            { path: 'items.olive_category_id' },
            { path: 'items.pressing_service_id' }
        ]);
        // 7. SEND CONFIRMATION EMAIL (Does not block the response)
        (async () => {
            try {
                const user = await User_1.User.findById(req.user.id);
                if (user && user.email) {
                    const emailItems = await Promise.all(items.map(async (item) => {
                        const model = (item.model_type === 'Product' ? Product_1.Product : OliveCategory_1.OliveCategory);
                        const itemData = await model.findById(item.olive_category_id);
                        return {
                            name: itemData?.name || 'Huile',
                            quantity: item.quantity,
                            price: item.olive_price_at_order,
                            subtotal: item.subtotal
                        };
                    }));
                    await (0, sendEmail_1.sendOrderConfirmationEmail)(user.email, {
                        tracking_code,
                        total_price,
                        items: emailItems
                    });
                }
            }
            catch (err) {
                console.error('Confirmation email error:', err);
            }
        })();
        res.status(201).json(populatedOrder);
    }
    catch (error) {
        console.error('Order creation error:', error);
        res.status(500).json({ message: 'Erreur serveur.' });
    }
});
/**
 * [ADMIN] Update Order Status
 * Changes status (e.g., from 'pending' to 'completed') and notifies the user.
 */
router.patch('/:id/status', auth_1.authenticate, auth_1.ownerOnly, async (req, res) => {
    const { status } = req.body;
    const valid = ['pending', 'in-progress', 'completed', 'delivered', 'cancelled'];
    if (!valid.includes(status)) {
        res.status(400).json({ message: 'Statut invalide.' });
        return;
    }
    try {
        const order = await Order_1.Order.findByIdAndUpdate(req.params.id, { status }, { new: true });
        if (!order) {
            res.status(404).json({ message: 'Commande introuvable.' });
            return;
        }
        // Notify the customer about their order progress
        await Notification_1.Notification.create({
            user_id: order.user_id,
            order_id: order._id,
            title: 'Mise à jour de votre commande',
            message: `Le statut de votre commande est maintenant : ${status}.`,
        });
        res.json(order);
    }
    catch (error) {
        console.error('Status update error:', error);
        res.status(500).json({ message: 'Erreur serveur.' });
    }
});
/**
 * [ADMIN] Propose Pickup Dates
 * When an owner decides when the customer can come pick up their oil.
 */
router.patch('/:id/pickup', auth_1.authenticate, auth_1.ownerOnly, async (req, res) => {
    const { pickup_range_start, pickup_range_end, pickup_hours } = req.body;
    try {
        const order = await Order_1.Order.findByIdAndUpdate(req.params.id, {
            'shipping.pickup_range_start': pickup_range_start,
            'shipping.pickup_range_end': pickup_range_end,
            'shipping.pickup_hours': pickup_hours,
            'shipping.pickup_status': 'proposed',
            status: 'in-progress'
        }, { new: true });
        if (!order) {
            res.status(404).json({ message: 'Commande introuvable.' });
            return;
        }
        // Notify user of the proposed dates
        await Notification_1.Notification.create({
            user_id: order.user_id,
            order_id: order._id,
            title: '📅 Disponibilité de votre commande',
            message: `Vous pouvez récupérer votre commande entre le ${new Date(pickup_range_start).toLocaleDateString()} et le ${new Date(pickup_range_end).toLocaleDateString()} (${pickup_hours}).`,
        });
        res.json(order);
    }
    catch (error) {
        console.error('Pickup update error:', error);
        res.status(500).json({ message: 'Erreur serveur.' });
    }
});
/**
 * [CUSTOMER] Accept/Reject Pickup
 * Simple actions for the customer to confirm they are coming.
 */
router.patch('/:id/pickup/accept', auth_1.authenticate, async (req, res) => {
    try {
        const order = await Order_1.Order.findOne({ _id: req.params.id, user_id: req.user.id });
        if (!order) {
            res.status(404).json({ message: 'Commande introuvable.' });
            return;
        }
        order.shipping.pickup_status = 'accepted';
        await order.save();
        // Tell the owner the customer is coming
        try {
            const owners = await User_1.User.find({ role: 'owner' }, '_id');
            const orderRef = order._id.toString().slice(-6).toUpperCase();
            const notifications = owners.map(owner => ({
                user_id: owner._id,
                order_id: order._id,
                title: '✅ Créneau de récupération accepté',
                message: `Le client a accepté le créneau pour la commande #${orderRef}.`,
            }));
            if (notifications.length > 0) {
                await Notification_1.Notification.insertMany(notifications);
            }
        }
        catch (notifError) {
            console.error('Failed to notify owner of acceptance:', notifError);
        }
        res.json(order);
    }
    catch (error) {
        console.error('Pickup accept error:', error);
        res.status(500).json({ message: 'Erreur serveur.' });
    }
});
router.patch('/:id/pickup/reject', auth_1.authenticate, async (req, res) => {
    try {
        const order = await Order_1.Order.findOne({ _id: req.params.id, user_id: req.user.id });
        if (!order) {
            res.status(404).json({ message: 'Commande introuvable.' });
            return;
        }
        order.shipping.pickup_status = 'rejected';
        await order.save();
        // Tell the owner they need to propose a new date
        try {
            const owners = await User_1.User.find({ role: 'owner' }, '_id');
            const orderRef = order._id.toString().slice(-6).toUpperCase();
            const notifications = owners.map(owner => ({
                user_id: owner._id,
                order_id: order._id,
                title: '❌ Créneau de récupération refusé',
                message: `Le client a refusé le créneau pour la commande #${orderRef}. Veuillez en proposer un nouveau.`,
            }));
            if (notifications.length > 0) {
                await Notification_1.Notification.insertMany(notifications);
            }
        }
        catch (notifError) {
            console.error('Failed to notify owner of rejection:', notifError);
        }
        res.json(order);
    }
    catch (error) {
        console.error('Pickup reject error:', error);
        res.status(500).json({ message: 'Erreur serveur.' });
    }
});
/**
 * [ADMIN] Mark as Collected
 * Finale stage for pickup orders.
 */
router.patch('/:id/pickup/collect', auth_1.authenticate, auth_1.ownerOnly, async (req, res) => {
    try {
        const order = await Order_1.Order.findById(req.params.id);
        if (!order) {
            res.status(404).json({ message: 'Commande introuvable.' });
            return;
        }
        order.shipping.pickup_status = 'collected';
        order.status = 'completed';
        await order.save();
        // Final thank you notification
        await Notification_1.Notification.create({
            user_id: order.user_id,
            order_id: order._id,
            title: '📦 Commande récupérée',
            message: `Votre commande a été marquée comme récupérée. Merci de votre confiance !`,
        });
        res.json(order);
    }
    catch (error) {
        console.error('Pickup collect error:', error);
        res.status(500).json({ message: 'Erreur serveur.' });
    }
});
/**
 * ARCHIVE AND MANAGEMENT
 * Keeping the active list clean.
 */
router.get('/archived', auth_1.authenticate, auth_1.ownerOnly, async (req, res) => {
    try {
        const orders = await Order_1.Order.find({ is_archived: true })
            .populate('user_id', 'first_name last_name email phone address')
            .populate({ path: 'items.olive_category_id' })
            .populate({ path: 'items.pressing_service_id', select: 'name' })
            .sort({ updated_at: -1 });
        res.json(orders);
    }
    catch {
        res.status(500).json({ message: 'Erreur serveur.' });
    }
});
router.patch('/:id/archive', auth_1.authenticate, auth_1.ownerOnly, async (req, res) => {
    try {
        const order = await Order_1.Order.findByIdAndUpdate(req.params.id, { is_archived: true }, { new: true });
        if (!order) {
            res.status(404).json({ message: 'Commande introuvable.' });
            return;
        }
        res.json(order);
    }
    catch {
        res.status(500).json({ message: 'Erreur serveur.' });
    }
});
router.patch('/:id/notes', auth_1.authenticate, auth_1.ownerOnly, async (req, res) => {
    try {
        const order = await Order_1.Order.findByIdAndUpdate(req.params.id, { owner_notes: req.body.notes }, { new: true });
        if (!order) {
            res.status(404).json({ message: 'Commande introuvable.' });
            return;
        }
        res.json(order);
    }
    catch {
        res.status(500).json({ message: 'Erreur serveur.' });
    }
});
router.delete('/:id', auth_1.authenticate, auth_1.ownerOnly, async (req, res) => {
    try {
        const order = await Order_1.Order.findByIdAndDelete(req.params.id);
        if (!order) {
            res.status(404).json({ message: 'Commande introuvable.' });
            return;
        }
        res.json({ message: 'Commande supprimée.' });
    }
    catch {
        res.status(500).json({ message: 'Erreur serveur.' });
    }
});
exports.default = router;
