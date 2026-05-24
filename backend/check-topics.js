const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
p.topic.findMany().then(t => {
  console.log(JSON.stringify(t.map(x => ({ id: x.id, name: x.name, isActive: x.isActive })), null, 2));
  return p.$disconnect();
});
