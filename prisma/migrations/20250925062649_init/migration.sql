-- CreateTable
CREATE TABLE `User` (
    `id` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `password` VARCHAR(191) NOT NULL,
    `phoneNumber` VARCHAR(191) NULL,
    `profilePicture` VARCHAR(191) NULL,
    `role` ENUM('TOURIST', 'GUIDE', 'SITE_ADMIN', 'SUPER_ADMIN') NOT NULL DEFAULT 'TOURIST',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `User_email_key`(`email`),
    INDEX `User_email_idx`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `TouristGuide` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `bio` TEXT NULL,
    `languages` JSON NOT NULL,
    `pricePerHour` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `rating` DOUBLE NOT NULL DEFAULT 0,
    `numberOfReviews` INTEGER NOT NULL DEFAULT 0,
    `availability` JSON NOT NULL,

    UNIQUE INDEX `TouristGuide_userId_key`(`userId`),
    INDEX `TouristGuide_userId_idx`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `TouristicSiteAdmin` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `siteId` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `TouristicSiteAdmin_userId_key`(`userId`),
    UNIQUE INDEX `TouristicSiteAdmin_siteId_key`(`siteId`),
    INDEX `TouristicSiteAdmin_userId_idx`(`userId`),
    INDEX `TouristicSiteAdmin_siteId_idx`(`siteId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `TouristicSite` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` TEXT NOT NULL,
    `location` VARCHAR(191) NOT NULL,
    `latitude` DOUBLE NULL,
    `longitude` DOUBLE NULL,
    `category` VARCHAR(191) NULL,
    `openingHours` VARCHAR(191) NULL,
    `entryFee` DECIMAL(10, 2) NULL,

    INDEX `TouristicSite_location_idx`(`location`),
    FULLTEXT INDEX `TouristicSite_name_description_idx`(`name`, `description`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `TouristicSiteImage` (
    `id` VARCHAR(191) NOT NULL,
    `url` VARCHAR(191) NOT NULL,
    `touristicSiteId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `TouristicSiteImage_touristicSiteId_idx`(`touristicSiteId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Favorite` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `touristicSiteId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `Favorite_userId_idx`(`userId`),
    INDEX `Favorite_touristicSiteId_idx`(`touristicSiteId`),
    INDEX `Favorite_createdAt_idx`(`createdAt`),
    UNIQUE INDEX `Favorite_userId_touristicSiteId_key`(`userId`, `touristicSiteId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Event` (
    `id` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `description` TEXT NOT NULL,
    `price` DECIMAL(10, 2) NOT NULL,
    `duration` INTEGER NOT NULL,
    `maxGroupSize` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `guideId` VARCHAR(191) NULL,
    `siteAdminId` VARCHAR(191) NULL,
    `touristicSiteId` VARCHAR(191) NOT NULL,

    INDEX `Event_touristicSiteId_idx`(`touristicSiteId`),
    INDEX `Event_guideId_idx`(`guideId`),
    INDEX `Event_siteAdminId_idx`(`siteAdminId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `EventImage` (
    `id` VARCHAR(191) NOT NULL,
    `url` VARCHAR(191) NOT NULL,
    `eventId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `EventImage_eventId_idx`(`eventId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Booking` (
    `id` VARCHAR(191) NOT NULL,
    `touristId` VARCHAR(191) NOT NULL,
    `eventId` VARCHAR(191) NOT NULL,
    `guideId` VARCHAR(191) NOT NULL,
    `bookingDate` DATETIME(3) NOT NULL,
    `numberOfPeople` INTEGER NOT NULL,
    `status` ENUM('PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELED') NOT NULL DEFAULT 'PENDING',
    `totalPrice` DECIMAL(10, 2) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `Booking_touristId_idx`(`touristId`),
    INDEX `Booking_eventId_idx`(`eventId`),
    INDEX `Booking_guideId_idx`(`guideId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Review` (
    `id` VARCHAR(191) NOT NULL,
    `rating` INTEGER NOT NULL,
    `comment` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `touristId` VARCHAR(191) NOT NULL,
    `bookingId` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `Review_bookingId_key`(`bookingId`),
    INDEX `Review_touristId_idx`(`touristId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Payment` (
    `id` VARCHAR(191) NOT NULL,
    `bookingId` VARCHAR(191) NOT NULL,
    `amount` DECIMAL(10, 2) NOT NULL,
    `currency` VARCHAR(191) NOT NULL,
    `method` VARCHAR(191) NULL,
    `transactionId` VARCHAR(191) NULL,
    `status` ENUM('PENDING', 'COMPLETED', 'FAILED', 'REFUNDED', 'PARTIALLY_REFUNDED') NOT NULL DEFAULT 'PENDING',
    `paymentDate` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Payment_bookingId_key`(`bookingId`),
    UNIQUE INDEX `Payment_transactionId_key`(`transactionId`),
    INDEX `Payment_bookingId_idx`(`bookingId`),
    INDEX `Payment_transactionId_idx`(`transactionId`),
    INDEX `Payment_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Conversation` (
    `id` VARCHAR(191) NOT NULL,
    `touristId` VARCHAR(191) NOT NULL,
    `guideId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Conversation_touristId_guideId_key`(`touristId`, `guideId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Message` (
    `id` VARCHAR(191) NOT NULL,
    `text` TEXT NOT NULL,
    `senderId` VARCHAR(191) NOT NULL,
    `conversationId` VARCHAR(191) NOT NULL,
    `sentAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `isRead` BOOLEAN NOT NULL DEFAULT false,

    INDEX `Message_conversationId_idx`(`conversationId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `TouristGuide` ADD CONSTRAINT `TouristGuide_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TouristicSiteAdmin` ADD CONSTRAINT `TouristicSiteAdmin_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TouristicSiteAdmin` ADD CONSTRAINT `TouristicSiteAdmin_siteId_fkey` FOREIGN KEY (`siteId`) REFERENCES `TouristicSite`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TouristicSiteImage` ADD CONSTRAINT `TouristicSiteImage_touristicSiteId_fkey` FOREIGN KEY (`touristicSiteId`) REFERENCES `TouristicSite`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Favorite` ADD CONSTRAINT `Favorite_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Favorite` ADD CONSTRAINT `Favorite_touristicSiteId_fkey` FOREIGN KEY (`touristicSiteId`) REFERENCES `TouristicSite`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Event` ADD CONSTRAINT `Event_guideId_fkey` FOREIGN KEY (`guideId`) REFERENCES `TouristGuide`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Event` ADD CONSTRAINT `Event_siteAdminId_fkey` FOREIGN KEY (`siteAdminId`) REFERENCES `TouristicSiteAdmin`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Event` ADD CONSTRAINT `Event_touristicSiteId_fkey` FOREIGN KEY (`touristicSiteId`) REFERENCES `TouristicSite`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `EventImage` ADD CONSTRAINT `EventImage_eventId_fkey` FOREIGN KEY (`eventId`) REFERENCES `Event`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Booking` ADD CONSTRAINT `Booking_touristId_fkey` FOREIGN KEY (`touristId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Booking` ADD CONSTRAINT `Booking_eventId_fkey` FOREIGN KEY (`eventId`) REFERENCES `Event`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Booking` ADD CONSTRAINT `Booking_guideId_fkey` FOREIGN KEY (`guideId`) REFERENCES `TouristGuide`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Review` ADD CONSTRAINT `Review_touristId_fkey` FOREIGN KEY (`touristId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Review` ADD CONSTRAINT `Review_bookingId_fkey` FOREIGN KEY (`bookingId`) REFERENCES `Booking`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Payment` ADD CONSTRAINT `Payment_bookingId_fkey` FOREIGN KEY (`bookingId`) REFERENCES `Booking`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Conversation` ADD CONSTRAINT `Conversation_touristId_fkey` FOREIGN KEY (`touristId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Conversation` ADD CONSTRAINT `Conversation_guideId_fkey` FOREIGN KEY (`guideId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Message` ADD CONSTRAINT `Message_senderId_fkey` FOREIGN KEY (`senderId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Message` ADD CONSTRAINT `Message_conversationId_fkey` FOREIGN KEY (`conversationId`) REFERENCES `Conversation`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
