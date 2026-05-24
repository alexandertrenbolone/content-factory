const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
p.topic.updateMany({
  where: { id: { in: ['cmpfu9x1b0003fiu90tcbpewa', 'cmpfv04b4000194hh8rw8wmj1'] } },
  data: { isActive: false }
}).then(r => {
  console.log('Deactivated:', r.count, 'topics');
  return p.$disconnect();
});
