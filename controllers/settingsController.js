const AdminUser = require('../models/AdminUser');
const bcrypt = require('bcryptjs');
const { logActivity } = require('../utils/auditLogger');

exports.getTeam = async (req, res) => {
  try {
    const team = await AdminUser.find().sort({ createdAt: -1 });
    res.json({ success: true, team });
  } catch (error) {
    console.error('getTeam Error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.addEmployee = async (req, res) => {
  try {
    const { email, permissions, password } = req.body;
    if (!email) return res.status(400).json({ success: false, message: 'Email is required' });

    if (email.toLowerCase() === process.env.ADMIN_EMAIL.toLowerCase()) {
      return res.status(400).json({ success: false, message: 'Cannot add superadmin as an employee' });
    }

    let user = await AdminUser.findOne({ email: email.toLowerCase() });
    if (user) {
      return res.status(400).json({ success: false, message: 'User already exists' });
    }

    user = new AdminUser({
      email: email.toLowerCase(),
      role: 'employee',
      permissions: permissions || []
    });

    if (password) {
      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(password, salt);
    }
    
    await user.save();

    logActivity({
      req,
      action: 'INVITE_EMPLOYEE',
      target: `Employee: ${user.email}`,
      details: { permissions: user.permissions }
    });

    res.json({ success: true, message: 'Employee added successfully', user });
  } catch (error) {
    console.error('addEmployee Error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.updateEmployee = async (req, res) => {
  try {
    const { id } = req.params;
    const { permissions, isActive, password } = req.body;

    const user = await AdminUser.findById(id);
    if (!user) return res.status(404).json({ success: false, message: 'Employee not found' });

    if (permissions !== undefined) user.permissions = permissions;
    if (isActive !== undefined) user.isActive = isActive;
    
    if (password) {
      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(password, salt);
    }

    await user.save();
    
    logActivity({
      req,
      action: 'UPDATE_EMPLOYEE',
      target: `Employee: ${user.email}`,
      details: { permissions: user.permissions, isActive: user.isActive, passwordUpdated: !!password }
    });

    res.json({ success: true, message: 'Employee updated successfully', user });
  } catch (error) {
    console.error('updateEmployee Error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.removeEmployee = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await AdminUser.findByIdAndDelete(id);
    if (!user) return res.status(404).json({ success: false, message: 'Employee not found' });
    
    logActivity({
      req,
      action: 'DELETE_EMPLOYEE',
      target: `Employee: ${user.email}`,
      details: 'Removed employee access'
    });

    res.json({ success: true, message: 'Employee removed successfully' });
  } catch (error) {
    console.error('removeEmployee Error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
