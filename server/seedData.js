// Seed script to populate initial data
// Run: node seedData.js

const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
require('dotenv').config();

const { Department } = require('./models/department');
const { User } = require('./models/user');
const { Venue } = require('./models/venue');

async function seedDatabase() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/meetminutes');
    console.log('Connected to MongoDB');

    // Clear existing data
    console.log('\nClearing existing data...');
    await Department.deleteMany({});
    await User.deleteMany({});
    await Venue.deleteMany({});
    console.log('✓ Cleared all collections');

    // Create Departments
    console.log('\nCreating departments...');
    const departments = await Department.insertMany([
      { name: 'Information Technology', code: 'IT', fullName: 'Department of Information Technology' },
      { name: 'Computer Science', code: 'CS', fullName: 'Department of Computer Science' },
      { name: 'Computer Science (BS)', code: 'CB', fullName: 'Department of Computer Science & Business Systems' },
      { name: 'Mathematics', code: 'MA', fullName: 'Department of Mathematics' },
      { name: 'Physics', code: 'PH', fullName: 'Department of Physics' }
    ]);
    console.log(`✓ Created ${departments.length} departments`);

    // Create Venues
    console.log('\nCreating venues...');
    const venues = await Venue.insertMany([
      { 
        name: 'Room A', 
        code: 'RMA', 
        capacity: 30,
        facilities: ['Projector', 'Whiteboard', 'AC'],
        floor: 'Ground',
        building: 'Main Block'
      },
      { 
        name: 'Room B', 
        code: 'RMB', 
        capacity: 50,
        facilities: ['Projector', 'Whiteboard', 'AC', 'Video Conferencing'],
        floor: 'First',
        building: 'Main Block'
      },
      { 
        name: 'Conference Hall', 
        code: 'CONFH', 
        capacity: 100,
        facilities: ['Projector', 'Sound System', 'AC', 'Video Conferencing', 'Stage'],
        floor: 'Second',
        building: 'Admin Block'
      },
      { 
        name: 'Auditorium', 
        code: 'AUD', 
        capacity: 300,
        facilities: ['Projector', 'Sound System', 'AC', 'Stage', 'Recording'],
        floor: 'Ground',
        building: 'Academic Block'
      },
      { 
        name: 'Seminar Hall', 
        code: 'SEMH', 
        capacity: 75,
        facilities: ['Projector', 'Whiteboard', 'AC'],
        floor: 'Third',
        building: 'Main Block'
      }
    ]);
    console.log(`✓ Created ${venues.length} venues`);

    // Create Users
    console.log('\nCreating users...');
    const salt = await bcrypt.genSalt(Number(process.env.SALT) || 10);
    const defaultPassword = await bcrypt.hash('Password@123', salt);

    const users = [];

    // Admin
    users.push({
      firstName: 'System',
      lastName: 'Admin',
      email: 'admin@college.edu',
      passwordHash: defaultPassword,
      facultyId: 'ADM001',
      department: departments[0]._id, // IT
      role: 'Admin',
      phone: '9876543210',
      canApproveMeetings: true
    });

    // HODs for each department
    const hodRoles = [
      { dept: 0, id: 'IT001', name: 'Rajesh', lastName: 'Kumar' },
      { dept: 1, id: 'CS001', name: 'Priya', lastName: 'Sharma' },
      { dept: 2, id: 'CB001', name: 'Amit', lastName: 'Patel' },
      { dept: 3, id: 'MA001', name: 'Sunita', lastName: 'Reddy' },
      { dept: 4, id: 'PH001', name: 'Vikram', lastName: 'Singh' }
    ];

    for (const hod of hodRoles) {
      users.push({
        firstName: hod.name,
        lastName: hod.lastName,
        email: `${hod.id.toLowerCase()}@college.edu`,
        passwordHash: defaultPassword,
        facultyId: hod.id,
        department: departments[hod.dept]._id,
        role: 'HOD',
        phone: '9876543210',
        canApproveMeetings: true
      });
    }

    // Faculty members
    const facultyData = [
      // IT Department
      { dept: 0, id: 'IT002', firstName: 'Arun', lastName: 'Verma', role: 'Professor' },
      { dept: 0, id: 'IT003', firstName: 'Kavita', lastName: 'Nair', role: 'Associate Professor' },
      { dept: 0, id: 'IT004', firstName: 'Ravi', lastName: 'Gupta', role: 'Assistant Professor Level 1' },
      { dept: 0, id: 'IT005', firstName: 'Sneha', lastName: 'Iyer', role: 'Assistant Professor Level 2' },
      
      // CS Department
      { dept: 1, id: 'CS002', firstName: 'Manoj', lastName: 'Desai', role: 'Professor' },
      { dept: 1, id: 'CS003', firstName: 'Anjali', lastName: 'Mehta', role: 'Associate Professor' },
      { dept: 1, id: 'CS004', firstName: 'Karthik', lastName: 'Rao', role: 'Assistant Professor Level 1' },
      
      // CSBS Department
      { dept: 2, id: 'CB002', firstName: 'Deepak', lastName: 'Joshi', role: 'Professor' },
      { dept: 2, id: 'CB003', firstName: 'Pooja', lastName: 'Kulkarni', role: 'Assistant Professor Level 1' },
      
      // Mathematics
      { dept: 3, id: 'MA002', firstName: 'Suresh', lastName: 'Pillai', role: 'Professor' },
      { dept: 3, id: 'MA003', firstName: 'Lakshmi', lastName: 'Krishnan', role: 'Associate Professor' },
      
      // Physics
      { dept: 4, id: 'PH002', firstName: 'Ramesh', lastName: 'Shetty', role: 'Professor' },
      { dept: 4, id: 'PH003', firstName: 'Divya', lastName: 'Menon', role: 'Assistant Professor Level 1' }
    ];

    for (const faculty of facultyData) {
      users.push({
        firstName: faculty.firstName,
        lastName: faculty.lastName,
        email: `${faculty.id.toLowerCase()}@college.edu`,
        passwordHash: defaultPassword,
        facultyId: faculty.id,
        department: departments[faculty.dept]._id,
        role: faculty.role,
        phone: '9876543210'
      });
    }

    const createdUsers = await User.insertMany(users);
    console.log(`✓ Created ${createdUsers.length} users`);

    // Update departments with HOD references
    console.log('\nUpdating department HODs...');
    for (let i = 0; i < hodRoles.length; i++) {
      const hod = createdUsers.find(u => u.facultyId === hodRoles[i].id);
      await Department.findByIdAndUpdate(departments[i]._id, { hod: hod._id });
    }
    console.log('✓ Updated department HODs');

    // Print summary
    console.log('\n' + '='.repeat(60));
    console.log('DATABASE SEEDED SUCCESSFULLY!');
    console.log('='.repeat(60));
    
    console.log('\nLogin Credentials (default password: Password@123):');
    console.log('\nADMIN:');
    console.log('  Email: admin@college.edu');
    
    console.log('\nHODs:');
    hodRoles.forEach(hod => {
      console.log(`  ${hod.id}: ${hod.id.toLowerCase()}@college.edu`);
    });

    console.log('\nFaculty: Use facultyId@college.edu (e.g., it002@college.edu)');
    
    console.log('\nDepartments:');
    departments.forEach(dept => {
      console.log(`  ${dept.code}: ${dept.name}`);
    });

    console.log('\nVenues:');
    venues.forEach(venue => {
      console.log(`  ${venue.code}: ${venue.name} (Capacity: ${venue.capacity})`);
    });

    console.log('\n' + '='.repeat(60));
    
    process.exit(0);
  } catch (err) {
    console.error('❌ Error seeding database:', err);
    process.exit(1);
  }
}

seedDatabase();