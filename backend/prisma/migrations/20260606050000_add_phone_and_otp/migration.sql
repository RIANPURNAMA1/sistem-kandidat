-- AlterTable: Add phone to users
ALTER TABLE `users` ADD COLUMN `phone` VARCHAR(191) NULL;
CREATE UNIQUE INDEX `users_phone_key` ON `users`(`phone`);

-- CreateTable: OTP codes
CREATE TABLE `otp_codes` (
    `id` VARCHAR(191) NOT NULL,
    `phone` VARCHAR(191) NOT NULL,
    `code` VARCHAR(191) NOT NULL,
    `expiresAt` DATETIME(3) NOT NULL,
    `usedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
