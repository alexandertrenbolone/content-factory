const { PrismaClient } = require('@prisma/client');
const { decrypt } = require('./dist/crypto');

const p = new PrismaClient();
p.topic.findFirst({
  where: { name: 'Новости для тг' },
  include: { socialAccount: true },
}).then(topic => {
  const creds = JSON.parse(decrypt(topic.socialAccount.encryptedCreds));
  console.log('Creds keys:', Object.keys(creds));
  console.log('Creds:', JSON.stringify(creds, null, 2));
  return p.$disconnect();
});
