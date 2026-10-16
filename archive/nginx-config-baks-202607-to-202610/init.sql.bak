-- AI三千问 - MySQL 初始化脚本（Docker 首次启动自动执行）
-- MySQL 容器会在首次启动时自动执行 /docker-entrypoint-initdb.d/ 下的 SQL

CREATE TABLE IF NOT EXISTS `ai3000`.`users` (
  `phone` varchar(16) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `username` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '',
  `password_hash` varchar(256) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '',
  `nick_name` varchar(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '',
  `ai_count` int NOT NULL DEFAULT '0',
  `token_used` bigint NOT NULL DEFAULT '0',
  `tier` int NOT NULL DEFAULT '0',
  `created_at` bigint NOT NULL,
  `last_active` bigint NOT NULL,
  PRIMARY KEY (`phone`),
  KEY `idx_created` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `ai3000`.`charts` (
  `id` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `user_id` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '',
  `name` varchar(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '未命名',
  `gender` varchar(8) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'male',
  `birth_year` int NOT NULL,
  `birth_month` int NOT NULL,
  `birth_day` int NOT NULL,
  `birth_hour` int NOT NULL DEFAULT '12',
  `birth_minute` int NOT NULL DEFAULT '0',
  `calendar` varchar(16) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'gregorian',
  `true_solar` tinyint(1) NOT NULL DEFAULT '0',
  `birthplace` varchar(256) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '',
  `latitude` decimal(10,6) DEFAULT NULL,
  `longitude` decimal(10,6) DEFAULT NULL,
  `bazi` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '',
  `lunar_year` int DEFAULT NULL,
  `lunar_month` int DEFAULT NULL,
  `lunar_day` int DEFAULT NULL,
  `created_at` bigint NOT NULL,
  `updated_at` bigint NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_user` (`user_id`),
  KEY `idx_created` (`created_at` DESC),
  KEY `idx_user_created` (`user_id`,`created_at`),
  KEY `idx_bazi` (`bazi`(32))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `ai3000`.`mhys_records` (
  `id` varchar(64) NOT NULL,
  `user_id` varchar(64) DEFAULT NULL,
  `topic` varchar(200) DEFAULT NULL,
  `method` varchar(20) NOT NULL,
  `result_data` longtext NOT NULL,
  `ai_analysis` longtext,
  `created_at` bigint NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `ai3000`.`liuyao_records` (
  `id` varchar(64) NOT NULL,
  `user_id` varchar(64) DEFAULT NULL,
  `topic` varchar(200) DEFAULT NULL,
  `method` varchar(20) NOT NULL,
  `result_data` longtext NOT NULL,
  `ai_analysis` longtext,
  `created_at` bigint NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `ai3000`.`reference_books` (
  `id` int NOT NULL AUTO_INCREMENT,
  `title` varchar(255) NOT NULL COMMENT '书名',
  `category` varchar(50) NOT NULL COMMENT '分类 slug',
  `folder` varchar(100) DEFAULT '' COMMENT '文件夹分类',
  `author` varchar(255) DEFAULT '' COMMENT '作者',
  `description` text COMMENT '简介',
  `content` longtext COMMENT '全文内容',
  `status` varchar(20) DEFAULT 'pending' COMMENT 'pending/ingested/error',
  `chunks_count` int DEFAULT '0' COMMENT '分块数',
  `created_at` bigint NOT NULL COMMENT '创建时间戳',
  `updated_at` bigint NOT NULL COMMENT '更新时间戳',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='参考书籍';

CREATE TABLE IF NOT EXISTS `ai3000`.`chat_history` (
  `user_id` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `messages` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` bigint NOT NULL,
  `updated_at` bigint NOT NULL,
  PRIMARY KEY (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `ai3000`.`suggestions` (
  `id` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `user_id` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `username` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `overall_rating` tinyint DEFAULT '0',
  `ui_rating` tinyint DEFAULT '0',
  `feature_rating` tinyint DEFAULT '0',
  `ai_rating` tinyint DEFAULT '0',
  `response_speed_rating` tinyint DEFAULT '0',
  `accuracy_rating` tinyint DEFAULT '0',
  `content` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `created_at` bigint NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
