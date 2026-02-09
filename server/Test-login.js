// test-login.js - Test if login works
// Run: node test-login.js

require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

async function testLogin() {
  try {
    console.log('\n🔍 Testing Login Setup...\n');

    // 1. Check JWT Secret
    console.log('1. Checking JWT Secret:');
    if (process.env.JWTPRIVATEKEY) {
      console.log('   ✅ JWTPRIVATEKEY is set');
    } else {
      console.log('   ❌ JWTPRIVATEKEY is missing!');
      console.log('   Add to .env: JWTPRIVATEKEY=your-secret-key');
      process.exit(1);
    }

    // 2. Connect to database
    console.log('\n2. Connecting to database:');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/meetminutes');
    console.log('   ✅ Connected');

    // 3. Load User model
    console.log('\n3. Loading User model:');
    const { User } = require('./models/user');
    console.log('   ✅ User model loaded');

    // 4. Find admin user
    console.log('\n4. Finding admin user:');
    const user = await User.findOne({ email: 'admin@college.edu' });
    if (!user) {
      console.log('   ❌ Admin user not found!');
      console.log('   Run: node seedData.js');
      process.exit(1);
    }
    console.log('   ✅ Admin user found');
    console.log('   Email:', user.email);
    console.log('   Name:', user.firstName, user.lastName);

    // 5. Test password
    console.log('\n5. Testing password:');
    const isValid = await bcrypt.compare('Password@123', user.passwordHash);
    if (!isValid) {
      console.log('   ❌ Password incorrect!');
      console.log('   Run: node seedData.js');
      process.exit(1);
    }
    console.log('   ✅ Password is correct');

    // 6. Test token generation
    console.log('\n6. Testing token generation:');
    try {
      const token = user.generateAuthToken();
      console.log('   ✅ Token generated successfully');
      console.log('   Token:', token.substring(0, 50) + '...');
    } catch (err) {
      console.log('   ❌ Token generation failed!');
      console.log('   Error:', err.message);
      process.exit(1);
    }

    // 7. Test full login flow
    console.log('\n7. Testing complete login flow:');
    const testPassword = 'Password@123';
    const passwordValid = await bcrypt.compare(testPassword, user.passwordHash);
    
    if (!passwordValid) {
      throw new Error('Password validation failed');
    }
    
    const token = user.generateAuthToken();
    
    const response = {
      data: token,
      message: 'Logged in successfully',
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email
    };

    console.log('   ✅ Login flow works perfectly!');
    console.log('\n📝 Expected Response:');
    console.log(JSON.stringify(response, null, 2));

    console.log('\n✅ ALL TESTS PASSED!\n');
    console.log('You should be able to login with:');
    console.log('   Email: admin@college.edu');
    console.log('   Password: Password@123\n');

    process.exit(0);

  } catch (err) {
    console.error('\n❌ Test Failed:', err.message);
    console.error('\nFull error:', err);
    process.exit(1);
  }
}

testLogin();