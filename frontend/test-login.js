const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');

const prisma = new PrismaClient();

async function testLogin() {
  const email = 'rishabsainiupw165@gmail.com';
  const password = 'Rss@3112';
  
  console.log(`Checking for email: ${email}`);
  
  try {
    const profile = await prisma.profile.findUnique({
      where: { email: email.toLowerCase() },
    });
    
    if (!profile) {
      console.log('Profile not found for this email.');
      return;
    }
    console.log('Profile found:', profile.id, profile.email);
    
    if (!profile.passwordHash) {
      console.log('Profile has no passwordHash.');
      return;
    }
    
    const salt = profile.passwordHash.split(':')[0];
    const hash = crypto
      .pbkdf2Sync(password, salt, 10000, 64, 'sha512')
      .toString('hex');
      
    const isValid = hash === profile.passwordHash.split(':')[1];
    
    console.log('Password is valid?', isValid);
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testLogin();
