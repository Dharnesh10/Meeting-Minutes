const router = require('express').Router();
const authMiddleware = require('../middleware/auth');
const { Department } = require('../models/department');
const { User } = require('../models/user');

// Get all departments
router.get('/', authMiddleware, async (req, res) => {
  try {
    const departments = await Department.find({ isActive: true })
      .populate('hod', 'firstName lastName email facultyId')
      .sort({ name: 1 });

    res.status(200).send(departments);
  } catch (err) {
    console.error(err);
    res.status(500).send({ message: 'Server error' });
  }
});

// Get department with users
router.get('/:id/users', authMiddleware, async (req, res) => {
  try {
    const department = await Department.findById(req.params.id);
    
    if (!department) {
      return res.status(404).send({ message: 'Department not found' });
    }

    const users = await User.find({ 
      department: req.params.id,
      isActive: true 
    })
    .select('firstName lastName email facultyId role')
    .sort({ role: 1, lastName: 1 });

    res.status(200).send({
      department,
      users
    });
  } catch (err) {
    console.error(err);
    res.status(500).send({ message: 'Server error' });
  }
});

// Create department (Admin only)
router.post('/', authMiddleware, async (req, res) => {
  try {
    // Check if user is admin
    const user = await User.findById(req.user.id);
    if (user.role !== 'Admin') {
      return res.status(403).send({ message: 'Access denied. Admin only.' });
    }

    const { name, code, fullName, hod } = req.body;

    const department = new Department({
      name,
      code,
      fullName,
      hod
    });

    await department.save();

    res.status(201).send({
      message: 'Department created successfully',
      department
    });
  } catch (err) {
    console.error(err);
    if (err.code === 11000) {
      return res.status(400).send({ message: 'Department code already exists' });
    }
    res.status(500).send({ message: 'Server error' });
  }
});

// Update department
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (user.role !== 'Admin') {
      return res.status(403).send({ message: 'Access denied. Admin only.' });
    }

    const { name, code, fullName, hod, isActive } = req.body;

    const department = await Department.findByIdAndUpdate(
      req.params.id,
      { name, code, fullName, hod, isActive },
      { new: true }
    ).populate('hod', 'firstName lastName email');

    if (!department) {
      return res.status(404).send({ message: 'Department not found' });
    }

    res.status(200).send({
      message: 'Department updated successfully',
      department
    });
  } catch (err) {
    console.error(err);
    res.status(500).send({ message: 'Server error' });
  }
});

module.exports = router;