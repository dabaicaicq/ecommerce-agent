CREATE TABLE `conversations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`title` varchar(255) NOT NULL,
	`status` enum('active','closed') NOT NULL DEFAULT 'active',
	`autoInterceptedCount` int NOT NULL DEFAULT 0,
	`ticketCreatedCount` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `conversations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `knowledge_base` (
	`id` int AUTO_INCREMENT NOT NULL,
	`category` varchar(100) NOT NULL,
	`question` varchar(255) NOT NULL,
	`answer` text NOT NULL,
	`keywords` json,
	`isActive` int NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `knowledge_base_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `logistics` (
	`id` int AUTO_INCREMENT NOT NULL,
	`orderId` int NOT NULL,
	`trackingNumber` varchar(100) NOT NULL,
	`carrier` varchar(50) NOT NULL,
	`status` enum('pending','in_transit','out_for_delivery','delivered','exception') NOT NULL DEFAULT 'pending',
	`currentLocation` varchar(255),
	`estimatedDelivery` timestamp,
	`trackingHistory` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `logistics_id` PRIMARY KEY(`id`),
	CONSTRAINT `logistics_trackingNumber_unique` UNIQUE(`trackingNumber`)
);
--> statement-breakpoint
CREATE TABLE `messages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`conversationId` int NOT NULL,
	`role` enum('user','assistant') NOT NULL,
	`content` text NOT NULL,
	`intent` varchar(50),
	`reasoningSteps` json,
	`ticketId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `messages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `orders` (
	`id` int AUTO_INCREMENT NOT NULL,
	`orderNumber` varchar(50) NOT NULL,
	`userId` int NOT NULL,
	`productName` varchar(255) NOT NULL,
	`amount` decimal(10,2) NOT NULL,
	`status` enum('pending','shipped','delivered','cancelled','refunded') NOT NULL DEFAULT 'pending',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `orders_id` PRIMARY KEY(`id`),
	CONSTRAINT `orders_orderNumber_unique` UNIQUE(`orderNumber`)
);
--> statement-breakpoint
CREATE TABLE `reasoning_steps` (
	`id` int AUTO_INCREMENT NOT NULL,
	`messageId` int NOT NULL,
	`stepNumber` int NOT NULL,
	`stepType` varchar(50) NOT NULL,
	`stepDescription` varchar(255) NOT NULL,
	`stepResult` json,
	`duration` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `reasoning_steps_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `statistics` (
	`id` int AUTO_INCREMENT NOT NULL,
	`date` timestamp NOT NULL,
	`totalConversations` int NOT NULL DEFAULT 0,
	`autoInterceptedCount` int NOT NULL DEFAULT 0,
	`autoInterceptRate` decimal(5,2) NOT NULL DEFAULT '0',
	`ticketCreatedCount` int NOT NULL DEFAULT 0,
	`ticketResolvedCount` int NOT NULL DEFAULT 0,
	`averageResponseTime` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `statistics_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `tickets` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ticketNumber` varchar(50) NOT NULL,
	`conversationId` int NOT NULL,
	`userId` int NOT NULL,
	`assignedTo` int,
	`title` varchar(255) NOT NULL,
	`description` text NOT NULL,
	`status` enum('待处理','处理中','已解决') NOT NULL DEFAULT '待处理',
	`priority` enum('low','medium','high','urgent') NOT NULL DEFAULT 'medium',
	`context` json,
	`resolution` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`resolvedAt` timestamp,
	CONSTRAINT `tickets_id` PRIMARY KEY(`id`),
	CONSTRAINT `tickets_ticketNumber_unique` UNIQUE(`ticketNumber`)
);
