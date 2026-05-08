const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function main() {
  console.log('Starting data merge...');

  // 1. Read files
  const backupFile = path.join(__dirname, 'backup_data.txt');
  const localFile = path.join(__dirname, 'local_data.txt');

  const backupData = fs.readFileSync(backupFile, 'utf8').split('\n').filter(line => line.trim());
  const localData = fs.readFileSync(localFile, 'utf8').split('\n').filter(line => line.trim());

  console.log(`Read ${backupData.length} backup records and ${localData.length} local records.`);

  // 2. Parse backup records into a searchable map
  // Key strategy: combine name start + product + quantity to match
  const backupMap = new Map();
  backupData.forEach(line => {
    const [fullName, whatsapp, product, quantity, createdAt] = line.split('|');
    if (!fullName) return;

    // Use first word of name + product + quantity as matching key
    const firstName = fullName.split(' ')[0].toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const key = `${firstName}_${product.toLowerCase()}_${quantity}`;
    
    backupMap.set(key, { fullName, whatsapp });
  });

  // 3. Process local records and update if match found
  let updatedCount = 0;
  for (const line of localData) {
    const [id, localName, localWhatsapp, product, quantity, createdAt] = line.split('|');
    
    const firstName = localName.split(' ')[0].toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const key = `${firstName}_${product.toLowerCase()}_${quantity}`;

    const match = backupMap.get(key);
    
    if (match) {
      console.log(`Updating "${localName}" -> "${match.fullName}" [ID: ${id}]`);
      
      await prisma.order.update({
        where: { id: id },
        data: {
          customerName: match.fullName,
          whatsapp: match.whatsapp || localWhatsapp
        }
      });
      updatedCount++;
    } else {
      // Try fuzzy match just by name start if previous failed and name is longer than 3 chars
      if (firstName.length >= 3) {
        // Find any entry in backupMap that starts with this firstName
        const possibleKey = Array.from(backupMap.keys()).find(k => k.startsWith(firstName));
        if (possibleKey) {
          const fuzzyMatch = backupMap.get(possibleKey);
          console.log(`Fuzzy Updating "${localName}" -> "${fuzzyMatch.fullName}" [ID: ${id}]`);
          await prisma.order.update({
            where: { id: id },
            data: {
              customerName: fuzzyMatch.fullName,
              whatsapp: fuzzyMatch.whatsapp || localWhatsapp
            }
          });
          updatedCount++;
        }
      }
    }
  }

  console.log(`\nSuccess! Updated ${updatedCount} records.`);
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
