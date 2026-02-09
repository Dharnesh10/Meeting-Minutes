// diagnose.js - Run this to find and fix login issues
// Usage: node diagnose.js

const mongoose = require('mongoose');
require('dotenv').config();

async function diagnose() {
  console.log('🔍 Diagnosing Login Issues...\n');
  
  try {
    // 1. Check environment variables
    console.log('1️⃣ Checking Environment Variables:');
    console.log('   MONGODB_URI:', process.env.MONGODB_URI ? '✅ Set' : '❌ Missing');
    console.log('   JWTPRIVATEKEY:', process.env.JWTPRIVATEKEY ? '✅ Set' : '❌ Missing');
    console.log('   PORT:', process.env.PORT || '5000 (default)');
    
    if (!process.env.JWTPRIVATEKEY) {
      console.log('\n⚠️  JWTPRIVATEKEY is missing! Add to .env file:');
      console.log('   JWTPRIVATEKEY=your-secret-key-at-least-32-characters-long\n');
    }
    
    // 2. Check database connection
    console.log('\n2️⃣ Checking Database Connection:');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/meetminutes');
    console.log('   ✅ Connected to MongoDB\n');
    
    // 3. Check if User model works
    console.log('3️⃣ Checking User Model:');
    const { User } = require('./models/user');
    console.log('   ✅ User model loaded\n');
    
    // 4. Check if users exist
    console.log('4️⃣ Checking Users in Database:');
    const userCount = await User.countDocuments();
    console.log(`   Found ${userCount} users`);
    
    if (userCount === 0) {
      console.log('   ⚠️  No users found! Run: node seedData.js\n');
      process.exit(0);
    }
    
    // 5. Check admin user specifically
    console.log('\n5️⃣ Checking Admin User:');
    const adminUser = await User.findOne({ email: 'admin@college.edu' });
    
    if (!adminUser) {
      console.log('   ❌ Admin user not found!');
      console.log('   Run: node seedData.js\n');
      process.exit(0);
    }
    
    console.log('   ✅ Admin user exists');
    console.log('   Email:', adminUser.email);
    console.log('   Name:', adminUser.firstName, adminUser.lastName);
    console.log('   Role:', adminUser.role);
    console.log('   Faculty ID:', adminUser.facultyId);
    console.log('   Department:', adminUser.department);
    console.log('   Password Hash:', adminUser.passwordHash ? '✅ Set' : '❌ Missing');
    
    // 6. Check if department exists
    console.log('\n6️⃣ Checking Department:');
    if (adminUser.department) {
      const { Department } = require('./models/department');
      const dept = await Department.findById(adminUser.department);
      if (dept) {
        console.log('   ✅ Department found:', dept.name, `(${dept.code})`);
      } else {
        console.log('   ⚠️  Department ID exists but department not found');
        console.log('   Run: node seedData.js');
      }
    } else {
      console.log('   ⚠️  User has no department assigned');
      console.log('   Run: node seedData.js');
    }
    
    // 7. Test password comparison
    console.log('\n7️⃣ Testing Password Validation:');
    const bcrypt = require('bcrypt');
    const testPassword = 'Password@123';
    
    try {
      const isValid = await bcrypt.compare(testPassword, adminUser.passwordHash);
      if (isValid) {
        console.log('   ✅ Password "Password@123" is correct');
      } else {
        console.log('   ❌ Password "Password@123" is incorrect');
        console.log('   Database may have wrong password. Run: node seedData.js');
      }
    } catch (err) {
      console.log('   ❌ Error comparing password:', err.message);
    }
    
    // 8. Test JWT token generation
    console.log('\n8️⃣ Testing JWT Token Generation:');
    try {
      const token = adminUser.generateAuthToken();
      if (token) {
        console.log('   ✅ Token generated successfully');
        console.log('   Token preview:', token.substring(0, 50) + '...');
      }
    } catch (err) {
      console.log('   ❌ Error generating token:', err.message);
      console.log('   Check if User model has generateAuthToken method');
    }
    
    // 9. Test full login flow
    console.log('\n9️⃣ Testing Full Login Flow:');
    try {
      const testUser = await User.findOne({ email: 'admin@college.edu' }).populate('department');
      const passwordValid = await bcrypt.compare('Password@123', testUser.passwordHash);
      
      if (!passwordValid) {
        throw new Error('Password validation failed');
      }
      
      const token = testUser.generateAuthToken();
      
      console.log('   ✅ Login flow works!');
      console.log('\n✅ ALL CHECKS PASSED!');
      console.log('\nYou can now login with:');
      console.log('   Email: admin@college.edu');
      console.log('   Password: Password@123\n');
      
    } catch (err) {
      console.log('   ❌ Login flow failed:', err.message);
      console.log('\n🔧 Recommended fix: Run node seedData.js');
    }
    
    process.exit(0);
    
  } catch (err) {
    console.error('\n❌ Fatal Error:', err.message);
    console.error('\nFull error:', err);
    console.log('\n🔧 Recommended fixes:');
    console.log('1. Check MongoDB is running: mongod --version');
    console.log('2. Check .env file exists with correct values');
    console.log('3. Run: npm install');
    console.log('4. Run: node seedData.js\n');
    process.exit(1);
  }
}

diagnose();