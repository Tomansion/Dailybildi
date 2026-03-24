-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "username" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "firstLoginAt" DATETIME,
    "receivedInitialBlocks" BOOLEAN NOT NULL DEFAULT false
);

-- CreateTable
CREATE TABLE "BlockCatalog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "blockId" TEXT NOT NULL,
    "layer" INTEGER NOT NULL,
    "rarity" INTEGER NOT NULL,
    "universeId" TEXT NOT NULL,
    "imagePath" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "DailyBlockSelection" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "date" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "UserInventory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "UserInventory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "InventoryBlock" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "inventoryId" TEXT NOT NULL,
    "blockCatalogId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "acquiredDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "InventoryBlock_inventoryId_fkey" FOREIGN KEY ("inventoryId") REFERENCES "UserInventory" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "InventoryBlock_blockCatalogId_fkey" FOREIGN KEY ("blockCatalogId") REFERENCES "BlockCatalog" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "World" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "universeId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "likeCount" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "World_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PlacedBlock" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "worldId" TEXT NOT NULL,
    "blockCatalogId" TEXT NOT NULL,
    "gridX" INTEGER NOT NULL,
    "gridY" INTEGER NOT NULL,
    "rotation" INTEGER NOT NULL DEFAULT 0,
    "flipX" BOOLEAN NOT NULL DEFAULT false,
    "flipY" BOOLEAN NOT NULL DEFAULT false,
    "zOrder" INTEGER NOT NULL,
    "placedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PlacedBlock_worldId_fkey" FOREIGN KEY ("worldId") REFERENCES "World" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PlacedBlock_blockCatalogId_fkey" FOREIGN KEY ("blockCatalogId") REFERENCES "BlockCatalog" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Like" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "worldId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Like_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Like_worldId_fkey" FOREIGN KEY ("worldId") REFERENCES "World" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "_SelectedBlocks" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,
    CONSTRAINT "_SelectedBlocks_A_fkey" FOREIGN KEY ("A") REFERENCES "BlockCatalog" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "_SelectedBlocks_B_fkey" FOREIGN KEY ("B") REFERENCES "DailyBlockSelection" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "BlockCatalog_blockId_universeId_key" ON "BlockCatalog"("blockId", "universeId");

-- CreateIndex
CREATE UNIQUE INDEX "DailyBlockSelection_date_key" ON "DailyBlockSelection"("date");

-- CreateIndex
CREATE UNIQUE INDEX "UserInventory_userId_key" ON "UserInventory"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "InventoryBlock_inventoryId_blockCatalogId_key" ON "InventoryBlock"("inventoryId", "blockCatalogId");

-- CreateIndex
CREATE UNIQUE INDEX "Like_userId_worldId_key" ON "Like"("userId", "worldId");

-- CreateIndex
CREATE UNIQUE INDEX "_SelectedBlocks_AB_unique" ON "_SelectedBlocks"("A", "B");

-- CreateIndex
CREATE INDEX "_SelectedBlocks_B_index" ON "_SelectedBlocks"("B");
