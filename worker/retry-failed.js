const { PrismaClient } = require('@prisma/client');
const { Queue } = require('bullmq');
const { redisConnection } = require('./dist/redis');

const p = new PrismaClient();
const publishQueue = new Queue('publishPost', { connection: redisConnection });

async function main() {
  const posts = await p.post.findMany({ where: { status: { in: ['failed', 'pending'] } } });
  console.log(`Found ${posts.length} failed posts`);
  for (const post of posts) {
    await p.post.update({ where: { id: post.id }, data: { status: 'pending', error: null } });
    await publishQueue.add('publishPost', { postId: post.id });
    console.log(`Re-queued: ${post.id}`);
  }
  await p.$disconnect();
  process.exit();
}
main();
