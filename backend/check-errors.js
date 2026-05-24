const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
p.post.findMany({ where: { status: 'failed' }, select: { id: true, sourceTitle: true, error: true } })
  .then(posts => {
    posts.forEach(post => console.log(`\n"${post.sourceTitle}"\nError: ${post.error}`));
    return p.$disconnect();
  });
