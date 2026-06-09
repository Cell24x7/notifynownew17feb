SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS `api_campaign_queue`;
CREATE TABLE `api_campaign_queue` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `campaign_id` varchar(100) NOT NULL,
  `user_id` int(11) NOT NULL,
  `mobile` varchar(20) NOT NULL,
  `status` varchar(50) DEFAULT 'pending',
  `variables` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`variables`)),
  `message_id` varchar(255) DEFAULT NULL,
  `error_message` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_campaign_status` (`campaign_id`,`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

DROP TABLE IF EXISTS `api_campaigns`;
CREATE TABLE `api_campaigns` (
  `id` varchar(100) NOT NULL,
  `user_id` int(11) NOT NULL,
  `name` varchar(255) DEFAULT NULL,
  `channel` varchar(50) DEFAULT NULL,
  `template_id` varchar(100) DEFAULT NULL,
  `template_name` varchar(255) DEFAULT NULL,
  `template_type` varchar(50) DEFAULT NULL,
  `recipient_count` int(11) DEFAULT 0,
  `audience_count` int(11) DEFAULT 0,
  `sent_count` int(11) DEFAULT 0,
  `delivered_count` int(11) DEFAULT 0,
  `read_count` int(11) DEFAULT 0,
  `failed_count` int(11) DEFAULT 0,
  `credits_deducted` tinyint(1) DEFAULT 0,
  `status` varchar(50) DEFAULT 'pending',
  `template_metadata` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`template_metadata`)),
  `template_body` text DEFAULT NULL,
  `variable_mapping` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`variable_mapping`)),
  `scheduled_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_user_channel` (`user_id`,`channel`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

DROP TABLE IF EXISTS `api_message_logs`;
CREATE TABLE `api_message_logs` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `campaign_id` varchar(100) DEFAULT NULL,
  `campaign_name` varchar(255) DEFAULT NULL,
  `template_name` varchar(255) DEFAULT NULL,
  `message_id` varchar(255) DEFAULT NULL,
  `recipient` varchar(20) NOT NULL,
  `status` varchar(50) DEFAULT NULL,
  `send_time` timestamp NULL DEFAULT NULL,
  `delivery_time` timestamp NULL DEFAULT NULL,
  `read_time` timestamp NULL DEFAULT NULL,
  `failure_reason` text DEFAULT NULL,
  `channel` varchar(50) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_campaign` (`campaign_id`),
  KEY `idx_recipient` (`recipient`),
  KEY `idx_message` (`message_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

DROP TABLE IF EXISTS `campaign_queue`;
CREATE TABLE `campaign_queue` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `campaign_id` varchar(255) DEFAULT NULL,
  `mobile` varchar(20) DEFAULT NULL,
  `status` enum('pending','processing','sent','failed') DEFAULT 'pending',
  `message_id` varchar(255) DEFAULT NULL,
  `error_message` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_campaign_status` (`campaign_id`,`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

DROP TABLE IF EXISTS `chats`;
CREATE TABLE `chats` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `contact_phone` varchar(50) NOT NULL,
  `status` varchar(50) DEFAULT 'open',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_user_status` (`user_id`,`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

DROP TABLE IF EXISTS `contact_tags`;
CREATE TABLE `contact_tags` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `contact_phone` varchar(50) NOT NULL,
  `tag_name` varchar(100) NOT NULL,
  `status` varchar(20) DEFAULT 'active',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_contact_tag` (`user_id`,`contact_phone`,`tag_name`),
  KEY `idx_user_phone` (`user_id`,`contact_phone`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

DROP TABLE IF EXISTS `contacts`;
CREATE TABLE `contacts` (
  `id` varchar(50) NOT NULL,
  `user_id` int(11) NOT NULL,
  `name` varchar(255) NOT NULL,
  `phone` varchar(50) NOT NULL,
  `email` varchar(255) DEFAULT NULL,
  `category` varchar(50) DEFAULT 'lead',
  `channel` varchar(50) DEFAULT 'whatsapp',
  `labels` text DEFAULT NULL,
  `starred` tinyint(1) DEFAULT 0,
  `status` varchar(50) DEFAULT 'active',
  `assigned_agent` varchar(255) DEFAULT NULL,
  `auto_reply` tinyint(1) DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_user_phone` (`user_id`,`phone`),
  KEY `idx_user_phone` (`user_id`,`phone`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `dlt_templates`;
CREATE TABLE `dlt_templates` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `temp_id` varchar(50) NOT NULL,
  `pe_id` varchar(50) DEFAULT NULL,
  `hash_id` varchar(250) DEFAULT NULL,
  `temp_name` varchar(255) DEFAULT NULL,
  `body` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `temp_id` (`temp_id`),
  KEY `idx_temp_id` (`temp_id`),
  KEY `idx_temp_name` (`temp_name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

DROP TABLE IF EXISTS `knowledge_articles`;
CREATE TABLE `knowledge_articles` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `category_id` int(11) NOT NULL,
  `title` varchar(255) NOT NULL,
  `slug` varchar(255) NOT NULL,
  `content` longtext NOT NULL,
  `summary` text DEFAULT NULL,
  `is_published` tinyint(1) DEFAULT 1,
  `view_count` int(11) DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `slug` (`slug`),
  KEY `category_id` (`category_id`),
  CONSTRAINT `knowledge_articles_ibfk_1` FOREIGN KEY (`category_id`) REFERENCES `knowledge_categories` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=12 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

DROP TABLE IF EXISTS `knowledge_categories`;
CREATE TABLE `knowledge_categories` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `description` text DEFAULT NULL,
  `icon_name` varchar(50) DEFAULT 'HelpCircle',
  `display_order` int(11) DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

DROP TABLE IF EXISTS `message_logs`;
CREATE TABLE `message_logs` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `campaign_id` varchar(255) DEFAULT NULL,
  `message_id` varchar(255) DEFAULT NULL,
  `recipient` varchar(20) DEFAULT NULL,
  `status` varchar(50) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_campaign_id` (`campaign_id`),
  KEY `idx_message_id` (`message_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

DROP TABLE IF EXISTS `otp_verifications`;
CREATE TABLE `otp_verifications` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `mobile` varchar(20) NOT NULL,
  `otp_code` varchar(20) NOT NULL,
  `otp_session_id` varchar(100) NOT NULL,
  `expiry` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `status` enum('pending','verified','expired') DEFAULT 'pending',
  `attempts` int(11) DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `otp_session_id` (`otp_session_id`),
  KEY `idx_mobile` (`mobile`),
  KEY `idx_session` (`otp_session_id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `otp_verifications_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

DROP TABLE IF EXISTS `rcs_bot_contacts`;
CREATE TABLE `rcs_bot_contacts` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `bot_id` bigint(20) NOT NULL,
  `contact_type` enum('PHONE','EMAIL','WEBSITE') NOT NULL,
  `contact_value` varchar(255) NOT NULL,
  `label` varchar(25) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `bot_id` (`bot_id`),
  CONSTRAINT `rcs_bot_contacts_ibfk_1` FOREIGN KEY (`bot_id`) REFERENCES `rcs_bot_master` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `rcs_bot_master`;
CREATE TABLE `rcs_bot_master` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) DEFAULT NULL,
  `bot_id` varchar(100) DEFAULT NULL,
  `brand_id` varchar(100) DEFAULT NULL,
  `route_type` varchar(50) DEFAULT 'DOMESTIC',
  `bot_type` varchar(50) DEFAULT 'DOMESTIC',
  `message_type` varchar(50) DEFAULT 'Promotional',
  `billing_category` varchar(50) DEFAULT 'Non_Conversational',
  `bot_name` varchar(100) NOT NULL,
  `brand_name` varchar(100) NOT NULL,
  `brand_address` text DEFAULT NULL,
  `brand_industry` varchar(100) DEFAULT NULL,
  `short_description` text DEFAULT NULL,
  `brand_color` varchar(20) DEFAULT '#000000',
  `bot_logo_url` varchar(255) DEFAULT NULL,
  `banner_image_url` varchar(255) DEFAULT NULL,
  `terms_url` varchar(255) DEFAULT NULL,
  `privacy_url` varchar(255) DEFAULT NULL,
  `rcs_api` varchar(100) DEFAULT 'Google API',
  `development_platform` varchar(50) DEFAULT 'GSMA_API',
  `webhook_url` varchar(255) DEFAULT NULL,
  `callback_url` varchar(255) DEFAULT NULL,
  `languages_supported` varchar(255) DEFAULT 'English',
  `agree_all_carriers` tinyint(1) DEFAULT 0,
  `status` varchar(50) DEFAULT 'DRAFT',
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `rcs_bot_media`;
CREATE TABLE `rcs_bot_media` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `bot_id` bigint(20) NOT NULL,
  `media_type` enum('LOGO','BANNER') NOT NULL,
  `media_url` varchar(255) NOT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `bot_id` (`bot_id`),
  CONSTRAINT `rcs_bot_media_ibfk_1` FOREIGN KEY (`bot_id`) REFERENCES `rcs_bot_master` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `resellers`;
CREATE TABLE `resellers` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `email` varchar(255) NOT NULL,
  `phone` varchar(50) DEFAULT NULL,
  `domain` varchar(255) DEFAULT NULL,
  `api_base_url` varchar(255) DEFAULT NULL,
  `commission_percent` decimal(5,2) DEFAULT 10.00,
  `status` enum('active','inactive','pending') DEFAULT 'active',
  `revenue_generated` decimal(15,2) DEFAULT 0.00,
  `clients_managed` int(11) DEFAULT 0,
  `payout_pending` decimal(15,2) DEFAULT 0.00,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `plan_id` varchar(255) DEFAULT NULL,
  `channels_enabled` longtext DEFAULT NULL,
  `permissions` text DEFAULT NULL,
  `brand_name` varchar(100) DEFAULT NULL,
  `logo_url` varchar(255) DEFAULT NULL,
  `favicon_url` varchar(255) DEFAULT NULL,
  `primary_color` varchar(20) DEFAULT NULL,
  `secondary_color` varchar(20) DEFAULT NULL,
  `support_email` varchar(255) DEFAULT NULL,
  `support_phone` varchar(20) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `sms_gateways`;
CREATE TABLE `sms_gateways` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `primary_url` text NOT NULL,
  `secondary_url` text DEFAULT NULL,
  `status` enum('active','inactive') DEFAULT 'active',
  `routing` enum('national','international','both') DEFAULT 'national',
  `priority` enum('non-otp','otp','both') DEFAULT 'both',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

DROP TABLE IF EXISTS `social_accounts`;
CREATE TABLE `social_accounts` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `platform` enum('facebook','instagram','linkedin','twitter') NOT NULL,
  `platform_account_id` varchar(255) DEFAULT NULL,
  `account_name` varchar(255) DEFAULT NULL,
  `access_token` text DEFAULT NULL,
  `status` enum('active','expired','disconnected') DEFAULT 'active',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `social_accounts_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

DROP TABLE IF EXISTS `social_posts`;
CREATE TABLE `social_posts` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `content` text DEFAULT NULL,
  `media_url` text DEFAULT NULL,
  `platforms` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`platforms`)),
  `scheduled_at` datetime DEFAULT NULL,
  `status` enum('draft','scheduled','published','failed') DEFAULT 'draft',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `social_posts_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

DROP TABLE IF EXISTS `ticket_attachments`;
CREATE TABLE `ticket_attachments` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `ticket_id` int(11) NOT NULL,
  `reply_id` int(11) DEFAULT NULL,
  `file_url` varchar(255) NOT NULL,
  `file_type` varchar(50) DEFAULT NULL,
  `file_name` varchar(255) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_ticket_attach` (`ticket_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

DROP TABLE IF EXISTS `ticket_replies`;
CREATE TABLE `ticket_replies` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `ticket_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `message` text NOT NULL,
  `is_admin_reply` tinyint(1) DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_ticket` (`ticket_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

DROP TABLE IF EXISTS `tickets`;
CREATE TABLE `tickets` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `subject` varchar(255) NOT NULL,
  `category` varchar(100) NOT NULL,
  `description` text DEFAULT NULL,
  `status` enum('open','pending','resolved','closed') DEFAULT 'open',
  `priority` enum('low','medium','high','urgent') DEFAULT 'medium',
  `assigned_to` int(11) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_user` (`user_id`),
  KEY `idx_status` (`status`),
  KEY `idx_assigned` (`assigned_to`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

DROP TABLE IF EXISTS `users`;
CREATE TABLE `users` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `company_name` varchar(255) DEFAULT NULL,
  `contact_phone` varchar(20) DEFAULT NULL,
  `email` varchar(255) NOT NULL,
  `password` varchar(255) DEFAULT NULL,
  `api_password` varchar(255) DEFAULT NULL,
  `api_key` varchar(100) DEFAULT NULL,
  `company` varchar(255) DEFAULT NULL,
  `role` enum('user','admin','reseller') DEFAULT 'user',
  `plan_id` varchar(50) DEFAULT NULL,
  `reseller_id` int(11) DEFAULT NULL,
  `credits_available` int(11) DEFAULT 0,
  `wallet_balance` decimal(15,2) DEFAULT 0.00,
  `credits_used` int(11) DEFAULT 0,
  `channels_enabled` longtext DEFAULT NULL,
  `status` enum('active','suspended') DEFAULT 'active',
  `provider` varchar(50) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `full_name` varchar(255) DEFAULT NULL,
  `otp` varchar(10) DEFAULT NULL,
  `otp_expiry` datetime DEFAULT NULL,
  `is_verified` tinyint(1) DEFAULT 0,
  `permissions` text DEFAULT NULL,
  `parent_reseller_id` int(11) DEFAULT NULL,
  `created_by` int(11) DEFAULT NULL,
  `rcs_config_id` int(11) DEFAULT NULL,
  `whatsapp_config_id` int(11) DEFAULT NULL,
  `rcs_text_price` decimal(10,2) DEFAULT 0.10,
  `rcs_rich_card_price` decimal(10,2) DEFAULT 0.15,
  `rcs_carousel_price` decimal(10,2) DEFAULT 0.20,
  `department` varchar(100) DEFAULT NULL,
  `is_api_allowed` tinyint(1) DEFAULT 0,
  `pe_id` varchar(50) DEFAULT NULL,
  `hash_id` varchar(100) DEFAULT NULL,
  `rcs_limit` int(11) DEFAULT 0,
  `wa_limit` int(11) DEFAULT 0,
  `sms_limit` int(11) DEFAULT 0,
  `voice_limit` int(11) DEFAULT 0,
  `is_proero_enabled` tinyint(1) DEFAULT 0,
  `is_smm_enabled` tinyint(1) DEFAULT 0,
  `is_social_signup` tinyint(1) DEFAULT 0,
  `dlr_webhook_url` varchar(255) DEFAULT NULL,
  `wa_unofficial_webhook_enabled` tinyint(1) DEFAULT 0,
  `sms_gateway_id` int(11) DEFAULT NULL,
  `voice_price` decimal(10,4) DEFAULT 1.5000,
  `ai_voice_config_id` int(11) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`),
  UNIQUE KEY `api_key` (`api_key`)
) ENGINE=InnoDB AUTO_INCREMENT=35 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `users` (`id`, `name`, `company_name`, `contact_phone`, `email`, `password`, `api_password`, `api_key`, `company`, `role`, `plan_id`, `reseller_id`, `credits_available`, `wallet_balance`, `credits_used`, `channels_enabled`, `status`, `provider`, `created_at`, `updated_at`, `full_name`, `otp`, `otp_expiry`, `is_verified`, `permissions`, `parent_reseller_id`, `created_by`, `rcs_config_id`, `whatsapp_config_id`, `rcs_text_price`, `rcs_rich_card_price`, `rcs_carousel_price`, `department`, `is_api_allowed`, `pe_id`, `hash_id`, `rcs_limit`, `wa_limit`, `sms_limit`, `voice_limit`, `is_proero_enabled`, `is_smm_enabled`, `is_social_signup`, `dlr_webhook_url`, `wa_unofficial_webhook_enabled`, `sms_gateway_id`, `voice_price`, `ai_voice_config_id`) VALUES (34, 'Sandeep', NULL, NULL, 'sandeep@gmail.com', '$2a$10$IrbMEsiQAZmJZDdVt3stCOi8jZrD2WuXOz5NZP75jUEkS65W/46ni', NULL, NULL, NULL, 'admin', NULL, NULL, 999999, '999999.00', 0, '[\"whatsapp\", \"rcs\", \"sms\", \"email\"]', 'active', NULL, '2026-06-09 06:31:56', '2026-06-09 06:32:38', NULL, NULL, NULL, 1, NULL, NULL, NULL, NULL, 1, '0.10', '0.15', '0.20', NULL, 0, NULL, NULL, 0, 0, 0, 0, 0, 0, 0, NULL, 0, NULL, '1.5000', NULL);

DROP TABLE IF EXISTS `voice_configs`;
CREATE TABLE `voice_configs` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) DEFAULT NULL,
  `name` varchar(100) NOT NULL,
  `api_user` varchar(100) NOT NULL,
  `api_password` varchar(100) NOT NULL,
  `status` enum('active','inactive') DEFAULT 'active',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

DROP TABLE IF EXISTS `webhook_logs`;
CREATE TABLE `webhook_logs` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `sender` varchar(100) DEFAULT NULL,
  `recipient` varchar(50) NOT NULL,
  `message_content` text DEFAULT NULL,
  `status` varchar(50) DEFAULT NULL,
  `type` varchar(50) DEFAULT NULL,
  `campaign_id` varchar(100) DEFAULT NULL,
  `campaign_name` varchar(100) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_user_recipient` (`user_id`,`recipient`)
) ENGINE=InnoDB AUTO_INCREMENT=13 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

DROP TABLE IF EXISTS `whatsapp_configs`;
CREATE TABLE `whatsapp_configs` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `chatbot_name` varchar(100) NOT NULL,
  `domain` varchar(255) DEFAULT NULL,
  `customer_id` varchar(100) DEFAULT NULL,
  `wa_token` text NOT NULL,
  `ph_no_id` varchar(255) NOT NULL,
  `wa_biz_accnt_id` varchar(255) NOT NULL,
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

DROP TABLE IF EXISTS `whatsapp_proero_channels`;
CREATE TABLE `whatsapp_proero_channels` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `name` varchar(100) NOT NULL,
  `phone_number` varchar(20) DEFAULT NULL,
  `provider` varchar(50) DEFAULT 'Proero',
  `status` enum('connected','disconnected','pairing') DEFAULT 'disconnected',
  `session_data` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`session_data`)),
  `instance_id` varchar(100) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `whatsapp_proero_channels_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

SET FOREIGN_KEY_CHECKS = 1;
