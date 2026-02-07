const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin_controller');
const { protect, verifyAdmin } = require('../middleware/auth_middleware');

// Public Route
router.post('/login', adminController.login_admin);

// All routes here should be protected and only for Admins
router.use(protect);
router.use(verifyAdmin);

// === Moderator Management ===
router.post('/moderators', adminController.create_moderator);
router.delete('/moderators/:id', adminController.soft_delete_user);
router.delete('/moderators/:id/force', adminController.hard_delete_user);

// === Moderator Requests Flow ===
router.get('/moderator-requests', adminController.get_request_moderators);
router.post('/moderator-requests/:id/approve', adminController.approve_moderator_request);
router.post('/moderator-requests/:id/reject', adminController.reject_moderator_request);

// === System Management (God Mode) ===
router.get('/users', adminController.get_all_users);
router.delete('/users/:id', adminController.soft_delete_user);       // Generic user soft delete
router.delete('/users/:id/force', adminController.hard_delete_user); // Generic user hard delete
router.get('/groups', adminController.get_all_groups);               // Get all groups
router.delete('/groups/:id', adminController.hard_delete_group);     // Hard delete group

// === Stats ===
router.get('/stats', adminController.get_stats);

module.exports = router;
