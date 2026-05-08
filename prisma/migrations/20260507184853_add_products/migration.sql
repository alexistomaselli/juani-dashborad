-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "unitsPerPackage" INTEGER NOT NULL DEFAULT 1,
    "price" REAL NOT NULL,
    "cost" REAL NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Order" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "customerName" TEXT NOT NULL,
    "whatsapp" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "product" TEXT NOT NULL,
    "productId" TEXT,
    "unitPrice" REAL,
    "unitCost" REAL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "totalAmount" REAL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Order_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Order" ("createdAt", "customerName", "id", "product", "quantity", "status", "totalAmount", "updatedAt", "whatsapp") SELECT "createdAt", "customerName", "id", "product", "quantity", "status", "totalAmount", "updatedAt", "whatsapp" FROM "Order";
DROP TABLE "Order";
ALTER TABLE "new_Order" RENAME TO "Order";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
