const { PrismaClient } = require('@prisma/client');
const { decrypt } = require('./dist/crypto');
const axios = require('axios');

const p = new PrismaClient();

async function main() {
  const topic = await p.topic.findFirst({
    where: { name: 'Новости для тг' },
    include: { socialAccount: true },
  });
  if (!topic) { console.log('Topic not found'); return; }

  const creds = JSON.parse(decrypt(topic.socialAccount.encryptedCreds));
  console.log('Chat ID:', creds.chatId);
  console.log('Bot token (first 10):', creds.botToken?.slice(0, 10) + '...');

  try {
    const res = await axios.post(`https://api.telegram.org/bot${creds.botToken}/sendMessage`, {
      chat_id: creds.chatId,
      text: 'Тест от Content Factory',
    });
    console.log('Success:', res.data);
  } catch (e) {
    console.log('Error status:', e.response?.status);
    console.log('Error body:', JSON.stringify(e.response?.data, null, 2));
  }

  await p.$disconnect();
}
main();
