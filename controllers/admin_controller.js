const User = require('../models/user_model');
const ModeratorRequest = require('../models/moderator_request_model');
const Group = require('../models/group_model');
const Pilgrim = require('../models/pilgrim_model');
const bcrypt = require('bcryptjs');

const jwt = require('jsonwebtoken');

// Helper to hash password
const hashPassword = async (password) => {
    const salt = await bcrypt.genSalt(10);
    return await bcrypt.hash(password, salt);
};

// 0. Admin Login
exports.login_admin = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ success: false, message: 'Please provide email and password' });
        }

        const user = await User.findOne({ email });
        if (!user) {
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }

        // Check if user is actually an admin
        if (user.role !== 'admin') {
            return res.status(403).json({ success: false, message: 'Access denied. Admins only.' });
        }

        // Verify password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }

        // Generate Token
        const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, {
            expiresIn: '1d'
        });

        res.json({
            success: true,
            message: 'Admin Login Successful',
            token,
            user: {
                id: user._id,
                full_name: user.full_name,
                email: user.email,
                role: user.role
            }
        });

    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// 1. Create Moderator Directly
exports.create_moderator = async (req, res) => {
    try {
        const { full_name, email, password, phone_number } = req.body;

        // Validation
        if (!email || !password || !phone_number) {
            return res.status(400).json({ success: false, message: 'Missing required fields' });
        }

        // Check exists
        const emailExists = await User.findOne({ email });
        if (emailExists) return res.status(400).json({ success: false, message: 'Email already registered' });

        const phoneExists = await User.findOne({ phone_number });
        if (phoneExists) return res.status(400).json({ success: false, message: 'Phone number already registered' });

        const hashedPassword = await hashPassword(password);

        const newModerator = new User({
            full_name,
            email,
            password: hashedPassword,
            phone_number,
            role: 'moderator',
            active: true
        });

        await newModerator.save();
        res.status(201).json({ success: true, message: 'Moderator created successfully', data: newModerator });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// 2. Get Pending Moderator Requests
exports.get_request_moderators = async (req, res) => {
    try {
        const requests = await ModeratorRequest.find({ status: 'pending' })
            .populate('user_id', 'full_name email phone_number')
            .sort({ created_at: -1 });
        res.json({ success: true, count: requests.length, data: requests });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// 3. Approve Moderator Request
exports.approve_moderator_request = async (req, res) => {
    try {
        const { id } = req.params; // Request ID

        const request = await ModeratorRequest.findById(id);
        if (!request) return res.status(404).json({ success: false, message: 'Request not found' });

        if (request.status === 'approved') return res.status(400).json({ success: false, message: 'Request already approved' });

        const user = await User.findById(request.user_id);
        if (!user) return res.status(404).json({ success: false, message: 'User associated with request not found' });

        // Update Request
        request.status = 'approved';
        request.updated_at = Date.now();
        await request.save();

        // Update User Role
        user.role = 'moderator';
        await user.save();

        res.json({ success: true, message: 'User approved as Moderator', user: user.full_name });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// 4. Reject Moderator Request
exports.reject_moderator_request = async (req, res) => {
    try {
        const { id } = req.params;
        const request = await ModeratorRequest.findById(id);
        if (!request) return res.status(404).json({ success: false, message: 'Request not found' });

        request.status = 'rejected';
        request.updated_at = Date.now();
        await request.save();

        res.json({ success: true, message: 'Request rejected' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// 5. Soft Delete User (Moderator/Pilgrim)
exports.soft_delete_user = async (req, res) => {
    try {
        const { id } = req.params;
        const user = await User.findById(id);
        if (!user) return res.status(404).json({ success: false, message: 'User not found' });

        user.active = false;
        await user.save();
        res.json({ success: true, message: 'User deactivated (Soft Delete)' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// 6. Hard Delete User
exports.hard_delete_user = async (req, res) => {
    try {
        const { id } = req.params;
        const result = await User.findByIdAndDelete(id);
        if (!result) return res.status(404).json({ success: false, message: 'User not found' });

        // Cleanup associated Data (Optional but recommended)
        // await ModeratorRequest.deleteMany({ user_id: id });

        res.json({ success: true, message: 'User permanently deleted' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// 7. Hard Delete Group
exports.hard_delete_group = async (req, res) => {
    try {
        const { id } = req.params;
        const result = await Group.findByIdAndDelete(id);
        if (!result) return res.status(404).json({ success: false, message: 'Group not found' });
        res.json({ success: true, message: 'Group permanently deleted' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// 8. System Stats
exports.get_stats = async (req, res) => {
    try {
        const totalUsers = await User.countDocuments();
        const moderators = await User.countDocuments({ role: 'moderator' });
        const pilgrims = await User.countDocuments({ role: 'pilgrim' }); // Note: detailed pilgrims are in Pilgrim model usually? 
        // User model distinguishes roles. Pilgrim model contains EXTRA data for pilgrims. 
        // Sync check: Does every Pilgrim entry have a User entry? Yes usually.

        const activeGroups = await Group.countDocuments();
        const pendingRequests = await ModeratorRequest.countDocuments({ status: 'pending' });

        res.json({
            success: true,
            stats: {
                total_users: totalUsers,
                moderators,
                users_as_pilgrims: pilgrims,
                groups: activeGroups,
                pending_moderator_requests: pendingRequests
            }
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// 9. Get Users (God Mode View)
exports.get_all_users = async (req, res) => {
    try {
        const { role } = req.query;
        let query = {};
        if (role) query.role = role;

        const users = await User.find(query).select('-password');
        res.json({ success: true, count: users.length, data: users });

    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// 10. Get All Groups
exports.get_all_groups = async (req, res) => {
    try {
        const groups = await Group.find()
            .populate('moderator_ids', 'full_name email')
            .populate('created_by', 'full_name');

        res.json({ success: true, count: groups.length, data: groups });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};
