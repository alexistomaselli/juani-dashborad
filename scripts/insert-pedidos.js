const Database = require('better-sqlite3');
const { randomBytes } = require('crypto');
const path = require('path');

const dbPath = path.join(__dirname, '../prisma/dev.db');
const db = new Database(dbPath);

const PRODUCT_ID = 'cmovuewdf00009kan4k3itd6i'; // Prepizzetas (x6)
const PRODUCT_NAME = 'Prepizzetas (x6)';

// Pedidos del archivo pedidos.md — ordenados desde el #21
const pedidos = [
  { name: 'Leticia Martinez',   wa: '3388455686', qty: 2, paid: false },
  { name: 'Angie Mepiace',      wa: '',           qty: 2, paid: false },
  { name: 'Mama Delfi',         wa: '',           qty: 2, paid: false },
  { name: 'Julian Perez',       wa: '',           qty: 3, paid: false },
  { name: 'Meli Avalos',        wa: '3388437027', qty: 2, paid: false },
  { name: 'Estefania Gorosito', wa: '3388415078', qty: 5, paid: false },
  { name: 'Ivana Mepiace',      wa: '',           qty: 2, paid: false },
  { name: 'Mia Ortellado',      wa: '',           qty: 2, paid: false },
  { name: 'Carina Rasse',       wa: '3388416178', qty: 3, paid: false },
  { name: 'Abril Berenguer',    wa: '',           qty: 1, paid: false },
  { name: 'Xiomara Anania',     wa: '3382576622', qty: 3, paid: false },
  { name: 'Laura Tomaselli',    wa: '3388676498', qty: 2, paid: false },
  { name: 'Breda Alessio',      wa: '3388414219', qty: 2, paid: false },
  { name: 'Aldana Coronel',     wa: '3388672303', qty: 2, paid: false },
  { name: 'Florencia Sanchez',  wa: '',           qty: 2, paid: false },
  { name: 'Anita Perfumo',      wa: '3388465919', qty: 2, paid: false },
  { name: 'Vanesa Rolfo',       wa: '3388670074', qty: 2, paid: false },
  { name: 'Valeria Guardia',    wa: '3388410266', qty: 3, paid: false },
  { name: 'Norla Lafuente',     wa: '3388673148', qty: 2, paid: false },
  { name: 'Candela Vilar',      wa: '3388676955', qty: 1, paid: true  },
  { name: 'Maria Giles',        wa: '3388533530', qty: 2, paid: true  },
  { name: 'Antonella Passetti', wa: '',           qty: 1, paid: false },
  { name: 'Andreina',           wa: '2915771856', qty: 2, paid: false },
  { name: 'Valentina Sotelo',   wa: '3388416000', qty: 3, paid: false },
];

const START_ORDER_NUMBER = 21;

function cuid() {
  return 'c' + randomBytes(11).toString('hex');
}

const insert = db.prepare(`
  INSERT INTO "Order" (id, customerName, whatsapp, quantity, product, productId, status, isPaid, createdAt, updatedAt, orderNumber)
  VALUES (@id, @customerName, @whatsapp, @quantity, @product, @productId, @status, @isPaid, @createdAt, @updatedAt, @orderNumber)
`);

const insertMany = db.transaction((orders) => {
  for (const o of orders) {
    insert.run(o);
  }
});

const now = new Date().toISOString();
const rows = pedidos.map((p, i) => ({
  id:           cuid(),
  customerName: p.name,
  whatsapp:     p.wa,
  quantity:     p.qty,
  product:      PRODUCT_NAME,
  productId:    PRODUCT_ID,
  status:       'PENDING',
  isPaid:       p.paid ? 1 : 0,
  createdAt:    now,
  updatedAt:    now,
  orderNumber:  START_ORDER_NUMBER + i,
}));

insertMany(rows);

console.log(`✅ ${rows.length} pedidos insertados (#${START_ORDER_NUMBER} al #${START_ORDER_NUMBER + rows.length - 1})`);
rows.forEach(r => console.log(`  #${r.orderNumber} ${r.customerName} x${r.quantity} ${r.isPaid ? '💰 pagado' : ''}`));

db.close();
