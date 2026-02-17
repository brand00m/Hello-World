import { PrismaClient } from '@prisma/client';
import { importWorkbook } from '../src/services/xlsx-import';

const prisma = new PrismaClient();

async function main() {
  console.log('=== XLSX Import Seed ===');
  console.log(`Started at: ${new Date().toISOString()}`);
  const startTime = Date.now();

  // Clean existing data in reverse dependency order
  console.log('Clearing existing data...');
  await prisma.pointModelMapping.deleteMany();
  await prisma.controller.deleteMany();
  await prisma.pointType.deleteMany();
  await prisma.submittalItem.deleteMany();
  await prisma.submittalSection.deleteMany();
  await prisma.submittal.deleteMany();
  await prisma.bomItem.deleteMany();
  await prisma.partDocument.deleteMany();
  await prisma.part.deleteMany();
  await prisma.partCategory.deleteMany();
  await prisma.manufacturer.deleteMany();
  await prisma.vendor.deleteMany();
  console.log('Existing data cleared.');

  // Run the import
  await importWorkbook(prisma);

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\n=== Seed completed in ${elapsed}s ===`);
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
