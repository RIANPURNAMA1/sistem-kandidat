-- AlterTable
ALTER TABLE `candidates` MODIFY `birthPlace` VARCHAR(191) NULL,
    MODIFY `birthDate` DATETIME(3) NULL,
    MODIFY `gender` ENUM('LAKI_LAKI', 'PEREMPUAN') NULL,
    MODIFY `maritalStatus` ENUM('BELUM_MENIKAH', 'MENIKAH', 'CERAI') NULL,
    MODIFY `address` TEXT NULL,
    MODIFY `kecamatan` VARCHAR(191) NULL,
    MODIFY `kabupaten` VARCHAR(191) NULL,
    MODIFY `provinsi` VARCHAR(191) NULL,
    MODIFY `lastEducation` VARCHAR(191) NULL,
    MODIFY `phone` VARCHAR(191) NULL;
