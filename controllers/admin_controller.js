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
            .populate('pilgrim_id', 'full_name email phone_number national_id email_verified')
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

        if (request.status === 'approved') {
            return res.status(400).json({ success: false, message: 'Request already approved' });
        }

        const pilgrim = await Pilgrim.findById(request.pilgrim_id);
        if (!pilgrim) {
            return res.status(404).json({ success: false, message: 'Pilgrim not found' });
        }

        // Verify email is verified
        if (!pilgrim.email_verified) {
            return res.status(400).json({
                success: false,
                message: 'Pilgrim email must be verified before approval'
            });
        }

        // Check if User entry already exists (shouldn't happen, but safety check)
        const existingUser = await User.findById(pilgrim._id);
        if (existingUser) {
            // Just update the role
            existingUser.role = 'moderator';
            await existingUser.save();
        } else {
            // Create User entry for moderator
            const newModerator = new User({
                _id: pilgrim._id, // Use same ID
                full_name: pilgrim.full_name,
                email: pilgrim.email,
                password: pilgrim.password,
                phone_number: pilgrim.phone_number,
                role: 'moderator',
                active: true
            });

            await newModerator.save();
        }

        // Update pilgrim role
        pilgrim.role = 'moderator';
        await pilgrim.save();

        // Update request
        request.status = 'approved';
        request.updated_at = Date.now();
        await request.save();

        res.json({
            success: true,
            message: 'Pilgrim approved as Moderator',
            user: pilgrim.full_name
        });
    } catch (err) {
        console.error('Approve moderator error:', err);
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

        // Try to find in User collection first
        let user = await User.findById(id);

        // If not found in User, try Pilgrim collection
        if (!user) {
            user = await Pilgrim.findById(id);
        }

        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        user.active = false;
        await user.save();
        res.json({ success: true, message: 'User deactivated (Soft Delete)' });
    } catch (err) {
        console.error('Soft delete error:', err);
        res.status(500).json({ success: false, message: err.message });
    }
};

// 6. Hard Delete User
exports.hard_delete_user = async (req, res) => {
    try {
        const { id } = req.params;

        // Try to delete from User collection first
        let result = await User.findByIdAndDelete(id);

        // If not found in User, try Pilgrim collection
        if (!result) {
            result = await Pilgrim.findByIdAndDelete(id);
        }

        if (!result) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        // Cleanup associated Data (Optional but recommended)
        await ModeratorRequest.deleteMany({ pilgrim_id: id });

        res.json({ success: true, message: 'User permanently deleted' });
    } catch (err) {
        console.error('Hard delete error:', err);
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
        const pilgrims = await Pilgrim.countDocuments(); // Count from Pilgrim collection

        const activeGroups = await Group.countDocuments();
        const pendingRequests = await ModeratorRequest.countDocuments({ status: 'pending' });

        res.json({
            success: true,
            stats: {
                total_users: totalUsers,
                moderators,
                pilgrims: pilgrims,
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
        let users = [];

        if (!role) {
            // Fetch all: admins, moderators from User, and pilgrims from Pilgrim
            const usersFromUserCollection = await User.find().select('-password');
            const pilgrims = await Pilgrim.find().select('-password');

            users = [...usersFromUserCollection, ...pilgrims];
        } else if (role === 'pilgrim') {
            // Fetch only pilgrims from Pilgrim collection
            users = await Pilgrim.find().select('-password');
        } else if (role === 'moderator' || role === 'admin') {
            // Fetch moderators/admins from User collection
            users = await User.find({ role }).select('-password');
        } else {
            return res.status(400).json({
                success: false,
                message: 'Invalid role. Use: pilgrim, moderator, or admin'
            });
        }

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
