const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');

const prisma = new PrismaClient();

async function resetPassword() {
  const email = 'rishabsainiupw165@gmail.com';
  const newPassword = 'Rss@3112';
  
  try {
    const profile = await prisma.profile.findUnique({
      where: { email: email.toLowerCase() },
    });
    
    if (!profile) {
      console.log('Profile not found.');
      return;
    }
    
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto
      .pbkdf2Sync(newPassword, salt, 10000, 64, 'sha512')
      .toString('hex');
    const storedHash = `${salt}:${hash}`;
    
    await prisma.profile.update({
      where: { id: profile.id },
      data: { passwordHash: storedHash },
    });
    
    console.log('Password successfully reset in the database for ' + email);
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

resetPassword();
