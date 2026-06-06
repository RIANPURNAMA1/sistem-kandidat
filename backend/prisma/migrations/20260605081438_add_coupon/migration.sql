-- CreateTable
CREATE TABLE `coupons` (
    `id` VARCHAR(191) NOT NULL,
    `code` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `discountType` VARCHAR(191) NOT NULL DEFAULT 'PERCENTAGE',
    `discountValue` DECIMAL(15, 2) NOT NULL,
    `programId` VARCHAR(191) NULL,
    `maxUses` INTEGER NOT NULL DEFAULT 0,
    `usedCount` INTEGER NOT NULL DEFAULT 0,
    `minPayment` DECIMAL(15, 2) NOT NULL DEFAULT 0,
    `maxDiscount` DECIMAL(15, 2) NULL,
    `expiresAt` DATETIME(3) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `coupons_code_key`(`code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AlterTable
ALTER TABLE `payments` ADD COLUMN `couponCode` VARCHAR(191) NULL,
    ADD COLUMN `discountAmount` DECIMAL(15, 2) NOT NULL DEFAULT 0,
    ADD COLUMN `originalAmount` DECIMAL(15, 2) NULL;

-- AddForeignKey
ALTER TABLE `coupons` ADD CONSTRAINT `coupons_programId_fkey` FOREIGN KEY (`programId`) REFERENCES `programs`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
