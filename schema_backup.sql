SET FOREIGN_KEY_CHECKS = 0;

/*M!999999\- enable the sandbox mode */ 
-- MariaDB dump 10.19  Distrib 10.11.10-MariaDB, for Linux (x86_64)
--
-- Host: localhost    Database: notifynow_db
-- ------------------------------------------------------
-- Server version	10.11.10-MariaDB

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `affiliates`
--

DROP TABLE IF EXISTS `affiliates`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `affiliates` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) DEFAULT NULL,
  `name` varchar(255) NOT NULL,
  `email` varchar(255) NOT NULL,
  `referral_code` varchar(50) NOT NULL,
  `signups` int(11) DEFAULT 0,
  `active_clients` int(11) DEFAULT 0,
  `commission_earned` decimal(10,2) DEFAULT 0.00,
  `payout_status` enum('pending','processing','paid') DEFAULT 'pending',
  `status` varchar(255) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`),
  UNIQUE KEY `referral_code` (`referral_code`)
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `api_campaign_queue`
--

DROP TABLE IF EXISTS `api_campaign_queue`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `api_campaign_queue` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `campaign_id` varchar(100) NOT NULL,
  `user_id` int(11) NOT NULL,
  `mobile` varchar(20) NOT NULL,
  `status` varchar(255) DEFAULT NULL,
  `channel` varchar(255) DEFAULT NULL,
  `worker_id` varchar(100) DEFAULT NULL,
  `variables` longtext DEFAULT NULL CHECK (json_valid(`variables`)),
  `message_id` varchar(512) DEFAULT NULL,
  `error_message` mediumtext DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `processed_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_campaign_status` (`campaign_id`,`status`),
  KEY `idx_status_updated` (`status`,`updated_at`),
  KEY `idx_campaign_id` (`campaign_id`),
  KEY `idx_status` (`status`)
) ENGINE=InnoDB AUTO_INCREMENT=10659 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `api_campaigns`
--

DROP TABLE IF EXISTS `api_campaigns`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `api_campaigns` (
  `id` varchar(100) NOT NULL,
  `user_id` int(11) NOT NULL,
  `name` varchar(255) DEFAULT NULL,
  `channel` varchar(255) DEFAULT NULL,
  `template_id` varchar(100) DEFAULT NULL,
  `template_name` varchar(255) DEFAULT NULL,
  `template_type` varchar(255) DEFAULT NULL,
  `recipient_count` int(11) DEFAULT 0,
  `audience_count` int(11) DEFAULT 0,
  `sent_count` int(11) DEFAULT 0,
  `delivered_count` int(11) DEFAULT 0,
  `read_count` int(11) DEFAULT 0,
  `failed_count` int(11) DEFAULT 0,
  `credits_deducted` tinyint(1) DEFAULT 0,
  `status` varchar(255) DEFAULT NULL,
  `template_metadata` longtext DEFAULT NULL CHECK (json_valid(`template_metadata`)),
  `template_body` mediumtext DEFAULT NULL,
  `variable_mapping` longtext DEFAULT NULL CHECK (json_valid(`variable_mapping`)),
  `scheduled_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `next_run_at` timestamp NULL DEFAULT NULL,
  `last_run_at` timestamp NULL DEFAULT NULL,
  `frequency` varchar(50) DEFAULT 'once',
  `repeat_days` longtext DEFAULT NULL CHECK (json_valid(`repeat_days`)),
  `end_date` timestamp NULL DEFAULT NULL,
  `scheduling_mode` varchar(50) DEFAULT 'once',
  `sender` varchar(20) DEFAULT NULL,
  `pe_id` varchar(50) DEFAULT NULL,
  `hash_id` varchar(100) DEFAULT NULL,
  `rcs_config_id` int(11) DEFAULT NULL,
  `whatsapp_config_id` int(11) DEFAULT NULL,
  `ai_voice_config_id` int(11) DEFAULT NULL,
  `is_failover_enabled` tinyint(1) DEFAULT 0,
  `failover_sms_template` varchar(255) DEFAULT NULL,
  `schedule_type` enum('now','scheduled') DEFAULT 'now',
  PRIMARY KEY (`id`),
  KEY `idx_user_channel` (`user_id`,`channel`),
  KEY `idx_user_created` (`user_id`,`created_at`),
  KEY `idx_created_at` (`created_at`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_user_status` (`user_id`,`status`),
  KEY `idx_status_created` (`status`,`created_at`),
  KEY `idx_channel_created` (`channel`,`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `api_message_logs`
--

DROP TABLE IF EXISTS `api_message_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `api_message_logs` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `campaign_id` varchar(100) DEFAULT NULL,
  `campaign_name` varchar(255) DEFAULT NULL,
  `template_name` varchar(255) DEFAULT NULL,
  `message_id` varchar(512) DEFAULT NULL,
  `recipient` varchar(30) DEFAULT NULL,
  `status` varchar(255) DEFAULT NULL,
  `send_time` timestamp NULL DEFAULT NULL,
  `delivery_time` timestamp NULL DEFAULT NULL,
  `read_time` timestamp NULL DEFAULT NULL,
  `failure_reason` mediumtext DEFAULT NULL,
  `channel` varchar(255) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `message_content` mediumtext DEFAULT NULL,
  `error` mediumtext DEFAULT NULL,
  `is_failover_enabled` tinyint(1) DEFAULT 0,
  `failover_sms_template` varchar(255) DEFAULT NULL,
  `failover_triggered` tinyint(1) DEFAULT 0,
  `metadata` longtext DEFAULT NULL CHECK (json_valid(`metadata`)),
  PRIMARY KEY (`id`),
  KEY `idx_campaign` (`campaign_id`),
  KEY `idx_recipient` (`recipient`),
  KEY `idx_message` (`message_id`),
  KEY `idx_api_msg_id` (`message_id`),
  KEY `idx_api_camp_id` (`campaign_id`),
  KEY `idx_aml_msgid` (`message_id`(255)),
  KEY `idx_aml_campid` (`campaign_id`),
  KEY `idx_campaign_id` (`campaign_id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_api_message_logs_created` (`created_at`),
  KEY `idx_api_message_logs_user` (`user_id`),
  KEY `idx_api_message_logs_msg_id` (`message_id`),
  KEY `idx_api_message_logs_camp_id` (`campaign_id`),
  KEY `idx_api_message_logs_msg` (`message_id`),
  KEY `idx_camp_user` (`campaign_id`,`user_id`),
  KEY `idx_created_at` (`created_at`),
  KEY `idx_camp_rec_status` (`campaign_id`,`recipient`,`status`),
  KEY `idx_user_rec_sendtime` (`user_id`,`recipient`,`send_time`),
  KEY `idx_user_created` (`user_id`,`send_time`),
  KEY `idx_camp_status` (`campaign_id`,`status`)
) ENGINE=InnoDB AUTO_INCREMENT=11358 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `api_message_logs_archive`
--

DROP TABLE IF EXISTS `api_message_logs_archive`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `api_message_logs_archive` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `campaign_id` varchar(100) DEFAULT NULL,
  `campaign_name` varchar(255) DEFAULT NULL,
  `template_name` varchar(255) DEFAULT NULL,
  `message_id` varchar(512) DEFAULT NULL,
  `recipient` varchar(30) DEFAULT NULL,
  `status` varchar(255) DEFAULT NULL,
  `send_time` timestamp NULL DEFAULT NULL,
  `delivery_time` timestamp NULL DEFAULT NULL,
  `read_time` timestamp NULL DEFAULT NULL,
  `failure_reason` mediumtext DEFAULT NULL,
  `channel` varchar(255) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `message_content` mediumtext DEFAULT NULL,
  `error` mediumtext DEFAULT NULL,
  `is_failover_enabled` tinyint(1) DEFAULT 0,
  `failover_sms_template` varchar(255) DEFAULT NULL,
  `failover_triggered` tinyint(1) DEFAULT 0,
  `metadata` longtext DEFAULT NULL CHECK (json_valid(`metadata`)),
  PRIMARY KEY (`id`),
  KEY `idx_campaign` (`campaign_id`),
  KEY `idx_recipient` (`recipient`),
  KEY `idx_message` (`message_id`),
  KEY `idx_api_msg_id` (`message_id`),
  KEY `idx_api_camp_id` (`campaign_id`),
  KEY `idx_aml_msgid` (`message_id`(255)),
  KEY `idx_aml_campid` (`campaign_id`),
  KEY `idx_campaign_id` (`campaign_id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_api_message_logs_created` (`created_at`),
  KEY `idx_api_message_logs_user` (`user_id`),
  KEY `idx_api_message_logs_msg_id` (`message_id`),
  KEY `idx_api_message_logs_camp_id` (`campaign_id`),
  KEY `idx_api_message_logs_msg` (`message_id`),
  KEY `idx_camp_user` (`campaign_id`,`user_id`),
  KEY `idx_created_at` (`created_at`),
  KEY `idx_camp_rec_status` (`campaign_id`,`recipient`,`status`),
  KEY `idx_user_rec_sendtime` (`user_id`,`recipient`,`send_time`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `automations`
--

DROP TABLE IF EXISTS `automations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `automations` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `name` varchar(255) NOT NULL,
  `trigger_type` varchar(100) DEFAULT 'new_message',
  `channel` varchar(255) DEFAULT NULL,
  `status` varchar(255) DEFAULT NULL,
  `nodes` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL CHECK (json_valid(`nodes`)),
  `edges` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL CHECK (json_valid(`edges`)),
  `trigger_count` int(11) DEFAULT 0,
  `last_triggered` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `automations_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=14 DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `campaign_queue`
--

DROP TABLE IF EXISTS `campaign_queue`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `campaign_queue` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `campaign_id` varchar(255) DEFAULT NULL,
  `user_id` int(11) DEFAULT NULL,
  `mobile` varchar(20) DEFAULT NULL,
  `variables` longtext DEFAULT NULL CHECK (json_valid(`variables`)),
  `status` varchar(255) DEFAULT NULL,
  `channel` varchar(255) DEFAULT NULL,
  `worker_id` varchar(100) DEFAULT NULL,
  `message_id` varchar(512) DEFAULT NULL,
  `error_message` text DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `processed_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_campaign_status` (`campaign_id`,`status`),
  KEY `idx_status_updated` (`status`,`updated_at`),
  KEY `idx_campaign_id` (`campaign_id`),
  KEY `idx_status` (`status`)
) ENGINE=InnoDB AUTO_INCREMENT=1546426 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `campaigns`
--

DROP TABLE IF EXISTS `campaigns`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `campaigns` (
  `id` varchar(50) NOT NULL,
  `user_id` int(11) NOT NULL,
  `name` varchar(255) NOT NULL,
  `channel` varchar(255) DEFAULT NULL,
  `template_id` varchar(255) DEFAULT NULL,
  `template_name` varchar(255) DEFAULT NULL,
  `audience_id` varchar(36) DEFAULT NULL,
  `recipient_count` int(11) DEFAULT 0,
  `sent_count` int(11) DEFAULT 0,
  `failed_count` int(11) DEFAULT 0,
  `status` varchar(255) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `audience_count` int(11) DEFAULT 0,
  `delivered_count` int(11) DEFAULT 0,
  `clicked_count` int(11) DEFAULT 0,
  `cost` decimal(10,2) DEFAULT 0.00,
  `scheduled_at` timestamp NULL DEFAULT NULL,
  `read_count` int(11) DEFAULT 0,
  `credits_deducted` tinyint(1) DEFAULT 0,
  `template_type` varchar(255) DEFAULT NULL,
  `variable_mapping` longtext DEFAULT NULL CHECK (json_valid(`variable_mapping`)),
  `template_metadata` longtext DEFAULT NULL CHECK (json_valid(`template_metadata`)),
  `template_body` text DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `schedule_type` enum('now','scheduled') DEFAULT 'now',
  `scheduling_mode` enum('one-time','repeat') DEFAULT 'one-time',
  `frequency` enum('daily','weekly','monthly') DEFAULT NULL,
  `repeat_days` longtext DEFAULT NULL CHECK (json_valid(`repeat_days`)),
  `end_date` datetime DEFAULT NULL,
  `next_run_at` datetime DEFAULT NULL,
  `last_run_at` datetime DEFAULT NULL,
  `sender` varchar(20) DEFAULT NULL,
  `pe_id` varchar(50) DEFAULT NULL,
  `hash_id` varchar(100) DEFAULT NULL,
  `rcs_config_id` int(11) DEFAULT NULL,
  `whatsapp_config_id` int(11) DEFAULT NULL,
  `ai_voice_config_id` int(11) DEFAULT NULL,
  `is_failover_enabled` tinyint(1) DEFAULT 0,
  `failover_sms_template` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  KEY `idx_user_created` (`user_id`,`created_at`),
  KEY `idx_created_at` (`created_at`),
  KEY `idx_status` (`status`),
  KEY `idx_user_status` (`user_id`,`status`),
  KEY `idx_status_created` (`status`,`created_at`),
  KEY `idx_channel_created` (`channel`,`created_at`),
  CONSTRAINT `campaigns_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `chat_flows`
--

DROP TABLE IF EXISTS `chat_flows`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `chat_flows` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `name` varchar(255) NOT NULL,
  `category` varchar(100) DEFAULT NULL,
  `keywords` text DEFAULT NULL,
  `header_type` varchar(50) DEFAULT NULL,
  `header_value` text DEFAULT NULL,
  `body` text DEFAULT NULL,
  `track_url` tinyint(1) DEFAULT 0,
  `api_config` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`api_config`)),
  `footer_config` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`footer_config`)),
  `logic_config` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`logic_config`)),
  `status` varchar(255) DEFAULT NULL,
  `triggers` int(11) DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  KEY `status` (`status`)
) ENGINE=InnoDB AUTO_INCREMENT=35 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `chats`
--

DROP TABLE IF EXISTS `chats`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `chats` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `contact_phone` varchar(50) NOT NULL,
  `status` varchar(255) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_user_status` (`user_id`,`status`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `contact_tags`
--

DROP TABLE IF EXISTS `contact_tags`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `contact_tags` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `contact_phone` varchar(50) NOT NULL,
  `tag_name` varchar(100) NOT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `status` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_contact_tag` (`user_id`,`contact_phone`,`tag_name`),
  KEY `idx_user_phone` (`user_id`,`contact_phone`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `contacts`
--

DROP TABLE IF EXISTS `contacts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `contacts` (
  `id` varchar(36) NOT NULL,
  `user_id` int(11) NOT NULL,
  `name` varchar(255) NOT NULL,
  `phone` varchar(50) NOT NULL,
  `email` varchar(255) DEFAULT NULL,
  `category` enum('guest','lead','customer','vip') DEFAULT 'lead',
  `channel` varchar(255) DEFAULT NULL,
  `labels` text DEFAULT NULL,
  `starred` tinyint(1) DEFAULT 0,
  `status` varchar(255) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `assigned_agent` varchar(255) DEFAULT NULL,
  `auto_reply` tinyint(1) DEFAULT 1,
  PRIMARY KEY (`id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_phone` (`phone`),
  KEY `idx_email` (`email`),
  KEY `idx_user_phone` (`user_id`,`phone`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `dlt_templates`
--

DROP TABLE IF EXISTS `dlt_templates`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `dlt_templates` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `sender` varchar(50) NOT NULL,
  `template_text` text NOT NULL,
  `temp_id` varchar(50) NOT NULL,
  `temp_name` varchar(255) DEFAULT '',
  `body` text DEFAULT NULL,
  `status` varchar(255) DEFAULT NULL,
  `temp_type` varchar(100) DEFAULT 'Transactional',
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `pe_id` varchar(50) DEFAULT NULL,
  `hash_id` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_user_temp_id` (`user_id`,`temp_id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_sender` (`sender`),
  KEY `idx_temp_id` (`temp_id`)
) ENGINE=InnoDB AUTO_INCREMENT=139 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `email_configs`
--

DROP TABLE IF EXISTS `email_configs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `email_configs` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `name` varchar(100) NOT NULL,
  `host` varchar(255) NOT NULL,
  `port` int(11) NOT NULL,
  `secure` tinyint(1) DEFAULT 1,
  `user` varchar(255) NOT NULL,
  `pass` varchar(255) NOT NULL,
  `from_email` varchar(255) NOT NULL,
  `from_name` varchar(255) DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_user_active` (`user_id`,`is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `email_templates`
--

DROP TABLE IF EXISTS `email_templates`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `email_templates` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `name` varchar(255) NOT NULL,
  `subject` varchar(255) NOT NULL,
  `body_html` longtext DEFAULT NULL,
  `body_text` text DEFAULT NULL,
  `design_json` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`design_json`)),
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_user` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `feedbacks`
--

DROP TABLE IF EXISTS `feedbacks`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `feedbacks` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `designation` varchar(255) DEFAULT NULL,
  `company` varchar(255) DEFAULT NULL,
  `rating` int(11) NOT NULL DEFAULT 5,
  `message` text NOT NULL,
  `is_public` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=14 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `knowledge_articles`
--

DROP TABLE IF EXISTS `knowledge_articles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `knowledge_articles` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `category_id` int(11) NOT NULL,
  `title` varchar(255) NOT NULL,
  `slug` varchar(255) NOT NULL,
  `content` longtext NOT NULL,
  `summary` text DEFAULT NULL,
  `is_published` tinyint(1) DEFAULT 1,
  `view_count` int(11) DEFAULT 0,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `slug` (`slug`),
  KEY `category_id` (`category_id`),
  CONSTRAINT `knowledge_articles_ibfk_1` FOREIGN KEY (`category_id`) REFERENCES `knowledge_categories` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=12 DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `knowledge_categories`
--

DROP TABLE IF EXISTS `knowledge_categories`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `knowledge_categories` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `description` text DEFAULT NULL,
  `icon_name` varchar(50) DEFAULT 'HelpCircle',
  `display_order` int(11) DEFAULT 0,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `link_clicks`
--

DROP TABLE IF EXISTS `link_clicks`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `link_clicks` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `campaign_id` varchar(255) DEFAULT NULL,
  `mobile` varchar(20) DEFAULT NULL,
  `original_url` text DEFAULT NULL,
  `tracking_id` varchar(50) DEFAULT NULL,
  `click_count` int(11) DEFAULT 0,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `last_clicked_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `tracking_id` (`tracking_id`),
  KEY `idx_tracking` (`tracking_id`),
  KEY `idx_user` (`user_id`)
) ENGINE=InnoDB AUTO_INCREMENT=34 DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `message_logs`
--

DROP TABLE IF EXISTS `message_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `message_logs` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) DEFAULT NULL,
  `campaign_id` varchar(255) DEFAULT NULL,
  `template_name` varchar(255) DEFAULT NULL,
  `campaign_name` varchar(255) DEFAULT NULL,
  `message_id` varchar(512) DEFAULT NULL,
  `recipient` varchar(30) NOT NULL DEFAULT '',
  `status` varchar(255) DEFAULT NULL,
  `failure_reason` text DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `send_time` datetime DEFAULT current_timestamp(),
  `delivery_time` datetime DEFAULT NULL,
  `read_time` datetime DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `channel` varchar(255) DEFAULT NULL,
  `message_content` text DEFAULT NULL,
  `error` text DEFAULT NULL,
  `is_failover_enabled` tinyint(1) DEFAULT 0,
  `failover_sms_template` varchar(255) DEFAULT NULL,
  `failover_triggered` tinyint(1) DEFAULT 0,
  `metadata` longtext DEFAULT NULL CHECK (json_valid(`metadata`)),
  PRIMARY KEY (`id`),
  KEY `idx_campaign_id` (`campaign_id`),
  KEY `idx_message_id` (`message_id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_created_at` (`created_at` DESC),
  KEY `idx_msg_id` (`message_id`),
  KEY `idx_camp_id` (`campaign_id`),
  KEY `idx_ml_msgid` (`message_id`(255)),
  KEY `idx_ml_campid` (`campaign_id`),
  KEY `idx_ml_recip` (`recipient`),
  KEY `idx_recipient` (`recipient`),
  KEY `idx_message_logs_created` (`created_at`),
  KEY `idx_message_logs_user` (`user_id`),
  KEY `idx_message_logs_msg_id` (`message_id`),
  KEY `idx_message_logs_camp_id` (`campaign_id`),
  KEY `idx_message_logs_msg` (`message_id`),
  KEY `idx_camp_user` (`campaign_id`,`user_id`),
  KEY `idx_camp_rec_status` (`campaign_id`,`recipient`,`status`),
  KEY `idx_user_recipient_created` (`user_id`,`recipient`,`created_at`),
  KEY `idx_user_created` (`user_id`,`created_at`),
  KEY `idx_camp_status` (`campaign_id`,`status`)
) ENGINE=InnoDB AUTO_INCREMENT=1533128 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `message_logs_archive`
--

DROP TABLE IF EXISTS `message_logs_archive`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `message_logs_archive` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) DEFAULT NULL,
  `campaign_id` varchar(255) DEFAULT NULL,
  `template_name` varchar(255) DEFAULT NULL,
  `campaign_name` varchar(255) DEFAULT NULL,
  `message_id` varchar(512) DEFAULT NULL,
  `recipient` varchar(30) NOT NULL DEFAULT '',
  `status` varchar(255) DEFAULT NULL,
  `failure_reason` text DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `send_time` datetime DEFAULT current_timestamp(),
  `delivery_time` datetime DEFAULT NULL,
  `read_time` datetime DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `channel` varchar(255) DEFAULT NULL,
  `message_content` text DEFAULT NULL,
  `error` text DEFAULT NULL,
  `is_failover_enabled` tinyint(1) DEFAULT 0,
  `failover_sms_template` varchar(255) DEFAULT NULL,
  `failover_triggered` tinyint(1) DEFAULT 0,
  `metadata` longtext DEFAULT NULL CHECK (json_valid(`metadata`)),
  PRIMARY KEY (`id`),
  KEY `idx_campaign_id` (`campaign_id`),
  KEY `idx_message_id` (`message_id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_created_at` (`created_at` DESC),
  KEY `idx_msg_id` (`message_id`),
  KEY `idx_camp_id` (`campaign_id`),
  KEY `idx_ml_msgid` (`message_id`(255)),
  KEY `idx_ml_campid` (`campaign_id`),
  KEY `idx_ml_recip` (`recipient`),
  KEY `idx_recipient` (`recipient`),
  KEY `idx_message_logs_created` (`created_at`),
  KEY `idx_message_logs_user` (`user_id`),
  KEY `idx_message_logs_msg_id` (`message_id`),
  KEY `idx_message_logs_camp_id` (`campaign_id`),
  KEY `idx_message_logs_msg` (`message_id`),
  KEY `idx_camp_user` (`campaign_id`,`user_id`),
  KEY `idx_camp_rec_status` (`campaign_id`,`recipient`,`status`),
  KEY `idx_user_recipient_created` (`user_id`,`recipient`,`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `message_templates`
--

DROP TABLE IF EXISTS `message_templates`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `message_templates` (
  `id` varchar(50) NOT NULL,
  `user_id` int(11) NOT NULL,
  `whatsapp_config_id` int(11) DEFAULT NULL,
  `rcs_config_id` int(11) DEFAULT NULL,
  `name` varchar(255) NOT NULL,
  `language` varchar(10) DEFAULT 'en',
  `category` enum('Marketing','Utility','Authentication') DEFAULT 'Marketing',
  `channel` varchar(255) DEFAULT NULL,
  `template_type` varchar(255) DEFAULT NULL,
  `header_type` enum('none','text','image','video','document') DEFAULT 'none',
  `header_content` text DEFAULT NULL,
  `body` text NOT NULL,
  `footer` text DEFAULT NULL,
  `status` varchar(255) DEFAULT NULL,
  `metadata` longtext DEFAULT NULL CHECK (json_valid(`metadata`)),
  `rejection_reason` text DEFAULT NULL,
  `usage_count` int(11) DEFAULT 0,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `sender` varchar(20) DEFAULT NULL,
  `pe_id` varchar(50) DEFAULT NULL,
  `hash_id` varchar(100) DEFAULT NULL,
  `template_id` varchar(100) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  KEY `idx_user_channel` (`user_id`,`channel`),
  KEY `idx_name_user` (`name`,`user_id`),
  CONSTRAINT `message_templates_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `msisdns`
--

DROP TABLE IF EXISTS `msisdns`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `msisdns` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `msisdn` varchar(15) NOT NULL,
  `type` varchar(255) DEFAULT NULL,
  `user_id` int(11) DEFAULT NULL,
  `reason` text NOT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `msisdn` (`msisdn`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `msisdns_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `otp_verifications`
--

DROP TABLE IF EXISTS `otp_verifications`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `otp_verifications` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `mobile` varchar(20) NOT NULL,
  `otp_code` varchar(20) NOT NULL,
  `otp_session_id` varchar(100) NOT NULL,
  `expiry` timestamp NOT NULL,
  `status` varchar(255) DEFAULT NULL,
  `attempts` int(11) DEFAULT 0,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `otp_session_id` (`otp_session_id`),
  KEY `idx_mobile` (`mobile`),
  KEY `idx_session` (`otp_session_id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `otp_verifications_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `plans`
--

DROP TABLE IF EXISTS `plans`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `plans` (
  `id` varchar(36) NOT NULL,
  `name` varchar(100) NOT NULL,
  `price` decimal(15,4) DEFAULT 0.0000,
  `monthly_credits` int(11) NOT NULL DEFAULT 0,
  `client_count` int(11) NOT NULL DEFAULT 1,
  `channels_allowed` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL CHECK (json_valid(`channels_allowed`)),
  `automation_limit` int(11) NOT NULL DEFAULT -1,
  `campaign_limit` int(11) NOT NULL DEFAULT -1,
  `api_access` tinyint(1) NOT NULL DEFAULT 0,
  `permissions` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`permissions`)),
  `status` varchar(255) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `voice_price` decimal(10,4) DEFAULT 1.5000,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `quick_replies`
--

DROP TABLE IF EXISTS `quick_replies`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `quick_replies` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `title` varchar(100) NOT NULL,
  `content` text NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `quick_replies_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `rcs_bot_contacts`
--

DROP TABLE IF EXISTS `rcs_bot_contacts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
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
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `rcs_bot_master`
--

DROP TABLE IF EXISTS `rcs_bot_master`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
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
  `short_description` text DEFAULT NULL,
  `brand_color` varchar(20) DEFAULT '#000000',
  `bot_logo_url` varchar(255) DEFAULT NULL,
  `banner_image_url` varchar(255) DEFAULT NULL,
  `terms_url` varchar(255) DEFAULT NULL,
  `privacy_url` varchar(255) DEFAULT NULL,
  `development_platform` varchar(50) DEFAULT 'GSMA_API',
  `webhook_url` varchar(255) DEFAULT NULL,
  `callback_url` varchar(255) DEFAULT NULL,
  `languages_supported` varchar(255) DEFAULT 'English',
  `agree_all_carriers` tinyint(1) DEFAULT 0,
  `status` varchar(255) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `brand_address` text DEFAULT NULL,
  `brand_industry` varchar(100) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `rcs_bot_media`
--

DROP TABLE IF EXISTS `rcs_bot_media`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
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
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `rcs_bots`
--

DROP TABLE IF EXISTS `rcs_bots`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `rcs_bots` (
  `id` varchar(50) NOT NULL,
  `user_id` int(11) NOT NULL,
  `bot_name` varchar(100) NOT NULL,
  `brand_name` varchar(100) NOT NULL,
  `short_description` text DEFAULT NULL,
  `bot_type` enum('DOMESTIC','INTERNATIONAL') DEFAULT 'DOMESTIC',
  `route_type` enum('DOMESTIC','INTERNATIONAL') DEFAULT 'DOMESTIC',
  `development_platform` varchar(50) DEFAULT NULL,
  `message_type` enum('OTP','TRANSACTIONAL','PROMOTIONAL') DEFAULT NULL,
  `billing_category` varchar(50) DEFAULT NULL,
  `languages_supported` varchar(100) DEFAULT NULL,
  `bot_logo_url` longtext DEFAULT NULL,
  `banner_image_url` longtext DEFAULT NULL,
  `brand_color` varchar(7) DEFAULT NULL,
  `callback_url` varchar(255) DEFAULT NULL,
  `webhook_url` varchar(255) DEFAULT NULL,
  `privacy_url` varchar(255) DEFAULT NULL,
  `terms_url` varchar(255) DEFAULT NULL,
  `agree_all_carriers` tinyint(1) DEFAULT 0,
  `contacts` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`contacts`)),
  `status` varchar(255) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `rbm_bot_id` varchar(255) DEFAULT NULL,
  `approval_reason` text DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_status` (`status`),
  KEY `idx_created_at` (`created_at`),
  CONSTRAINT `rcs_bots_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `rcs_configs`
--

DROP TABLE IF EXISTS `rcs_configs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `rcs_configs` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) DEFAULT NULL,
  `name` varchar(100) NOT NULL,
  `provider` varchar(50) DEFAULT 'dotgo',
  `auth_url` varchar(255) NOT NULL,
  `api_base_url` varchar(255) NOT NULL,
  `client_id` varchar(255) NOT NULL,
  `client_secret` varchar(255) NOT NULL,
  `bot_id` varchar(255) NOT NULL,
  `extra_config` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`extra_config`)),
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `rcs_template_analytics`
--

DROP TABLE IF EXISTS `rcs_template_analytics`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `rcs_template_analytics` (
  `id` varchar(36) NOT NULL DEFAULT uuid(),
  `template_id` varchar(36) NOT NULL,
  `total_sent` int(11) DEFAULT 0,
  `total_read` int(11) DEFAULT 0,
  `total_clicked` int(11) DEFAULT 0,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `template_id` (`template_id`),
  CONSTRAINT `rcs_template_analytics_ibfk_1` FOREIGN KEY (`template_id`) REFERENCES `rcs_templates` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `rcs_template_approvals`
--

DROP TABLE IF EXISTS `rcs_template_approvals`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `rcs_template_approvals` (
  `id` varchar(36) NOT NULL DEFAULT uuid(),
  `template_id` varchar(36) NOT NULL,
  `status` varchar(255) DEFAULT NULL,
  `approved_by` varchar(255) DEFAULT NULL,
  `approved_at` timestamp NULL DEFAULT NULL,
  `rejected_by` varchar(255) DEFAULT NULL,
  `rejected_at` timestamp NULL DEFAULT NULL,
  `rejection_reason` varchar(500) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_template_id` (`template_id`),
  KEY `idx_status` (`status`),
  CONSTRAINT `rcs_template_approvals_ibfk_1` FOREIGN KEY (`template_id`) REFERENCES `rcs_templates` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `rcs_templates`
--

DROP TABLE IF EXISTS `rcs_templates`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `rcs_templates` (
  `id` varchar(36) NOT NULL DEFAULT uuid(),
  `name` varchar(255) NOT NULL,
  `language` varchar(20) DEFAULT 'en',
  `category` enum('Utility','Marketing','Authentication') DEFAULT 'Marketing',
  `template_type` varchar(255) DEFAULT NULL,
  `header_type` enum('none','text','image','video','document') DEFAULT 'none',
  `header_content` longtext DEFAULT NULL,
  `metadata` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`metadata`)),
  `body` longtext NOT NULL,
  `footer` longtext DEFAULT NULL,
  `status` varchar(255) DEFAULT NULL,
  `rejection_reason` text DEFAULT NULL,
  `created_by` varchar(255) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_status` (`status`),
  KEY `idx_category` (`category`),
  KEY `idx_created_by` (`created_by`),
  KEY `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `resellers`
--

DROP TABLE IF EXISTS `resellers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `resellers` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `email` varchar(255) NOT NULL,
  `phone` varchar(50) DEFAULT NULL,
  `domain` varchar(255) DEFAULT NULL,
  `api_base_url` varchar(255) DEFAULT NULL,
  `commission_percent` decimal(5,2) DEFAULT 10.00,
  `status` varchar(255) DEFAULT NULL,
  `revenue_generated` decimal(15,2) DEFAULT 0.00,
  `clients_managed` int(11) DEFAULT 0,
  `payout_pending` decimal(15,2) DEFAULT 0.00,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `plan_id` varchar(255) DEFAULT NULL,
  `channels_enabled` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`channels_enabled`)),
  `permissions` text DEFAULT NULL,
  `logo_url` varchar(255) DEFAULT NULL,
  `brand_name` varchar(100) DEFAULT NULL,
  `favicon_url` varchar(255) DEFAULT NULL,
  `primary_color` varchar(20) DEFAULT '#3b82f6',
  `secondary_color` varchar(20) DEFAULT '#1d4ed8',
  `support_email` varchar(100) DEFAULT NULL,
  `support_phone` varchar(20) DEFAULT NULL,
  `payment_gateway_type` varchar(50) DEFAULT 'none',
  `ccavenue_merchant_id` varchar(255) DEFAULT NULL,
  `ccavenue_access_code` varchar(255) DEFAULT NULL,
  `ccavenue_working_key` varchar(255) DEFAULT NULL,
  `paypal_client_id` varchar(255) DEFAULT NULL,
  `paypal_secret_key` varchar(255) DEFAULT NULL,
  `paypal_mode` varchar(20) DEFAULT 'sandbox',
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`)
) ENGINE=InnoDB AUTO_INCREMENT=16 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `senders`
--

DROP TABLE IF EXISTS `senders`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `senders` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `sender_id` varchar(6) NOT NULL,
  `type` varchar(255) DEFAULT NULL,
  `user_id` int(11) DEFAULT NULL,
  `status` varchar(255) DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `sender_id` (`sender_id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `senders_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `sms_gateways`
--

DROP TABLE IF EXISTS `sms_gateways`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `sms_gateways` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `primary_url` text NOT NULL,
  `secondary_url` text DEFAULT NULL,
  `status` varchar(255) DEFAULT NULL,
  `routing` enum('national','international','both') DEFAULT 'national',
  `priority` enum('non-otp','otp','both') DEFAULT 'both',
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `sender_id` varchar(20) DEFAULT 'NOTIFY',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `social_accounts`
--

DROP TABLE IF EXISTS `social_accounts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `social_accounts` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `platform` enum('facebook','instagram','linkedin','twitter') NOT NULL,
  `platform_account_id` varchar(255) DEFAULT NULL,
  `account_name` varchar(255) DEFAULT NULL,
  `access_token` text DEFAULT NULL,
  `status` varchar(255) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `social_accounts_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `social_posts`
--

DROP TABLE IF EXISTS `social_posts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `social_posts` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `content` text DEFAULT NULL,
  `media_url` text DEFAULT NULL,
  `platforms` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`platforms`)),
  `scheduled_at` datetime DEFAULT NULL,
  `status` varchar(255) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `social_posts_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `system_logs`
--

DROP TABLE IF EXISTS `system_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `system_logs` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `type` varchar(255) DEFAULT NULL,
  `action` varchar(255) NOT NULL,
  `details` text DEFAULT NULL,
  `user_id` int(11) DEFAULT NULL,
  `user_name` varchar(255) DEFAULT NULL,
  `client_name` varchar(255) DEFAULT NULL,
  `ip_address` varchar(45) DEFAULT NULL,
  `severity` varchar(20) DEFAULT 'info',
  `device_info` text DEFAULT NULL,
  `location` varchar(255) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_type` (`type`),
  KEY `idx_severity` (`severity`),
  KEY `idx_created_at` (`created_at`)
) ENGINE=InnoDB AUTO_INCREMENT=2655 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `template_buttons`
--

DROP TABLE IF EXISTS `template_buttons`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `template_buttons` (
  `id` varchar(50) NOT NULL,
  `template_id` varchar(50) NOT NULL,
  `type` varchar(255) DEFAULT NULL,
  `label` varchar(255) NOT NULL,
  `value` varchar(255) DEFAULT NULL,
  `position` int(11) DEFAULT 0,
  PRIMARY KEY (`id`),
  KEY `template_id` (`template_id`),
  CONSTRAINT `fk_template_id` FOREIGN KEY (`template_id`) REFERENCES `message_templates` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ticket_attachments`
--

DROP TABLE IF EXISTS `ticket_attachments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `ticket_attachments` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `ticket_id` int(11) NOT NULL,
  `reply_id` int(11) DEFAULT NULL,
  `file_url` varchar(255) NOT NULL,
  `file_type` varchar(50) DEFAULT NULL,
  `file_name` varchar(255) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_ticket_attach` (`ticket_id`)
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ticket_replies`
--

DROP TABLE IF EXISTS `ticket_replies`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `ticket_replies` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `ticket_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `message` text NOT NULL,
  `is_admin_reply` tinyint(1) DEFAULT 0,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_ticket` (`ticket_id`)
) ENGINE=InnoDB AUTO_INCREMENT=10 DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tickets`
--

DROP TABLE IF EXISTS `tickets`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `tickets` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `subject` varchar(255) NOT NULL,
  `category` varchar(100) NOT NULL,
  `description` text DEFAULT NULL,
  `status` varchar(255) DEFAULT NULL,
  `priority` enum('low','medium','high','urgent') DEFAULT 'medium',
  `assigned_to` int(11) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_user` (`user_id`),
  KEY `idx_status` (`status`),
  KEY `idx_assigned` (`assigned_to`)
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `transactions`
--

DROP TABLE IF EXISTS `transactions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `transactions` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `type` varchar(255) DEFAULT NULL,
  `amount` decimal(15,4) DEFAULT 0.0000,
  `credits` decimal(15,4) DEFAULT 0.0000,
  `description` text DEFAULT NULL,
  `status` varchar(255) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  KEY `idx_user_created` (`user_id`,`created_at`),
  KEY `idx_created_at` (`created_at`),
  KEY `idx_type` (`type`),
  KEY `idx_user_type_created` (`user_id`,`type`,`created_at`),
  KEY `idx_type_created` (`type`,`created_at`),
  CONSTRAINT `transactions_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=342506 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `users` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `reseller_id` int(11) DEFAULT NULL,
  `name` varchar(255) NOT NULL,
  `company_name` varchar(255) DEFAULT NULL,
  `contact_phone` varchar(20) DEFAULT NULL,
  `email` varchar(255) NOT NULL,
  `api_key` varchar(100) DEFAULT NULL,
  `password` varchar(255) DEFAULT NULL,
  `company` varchar(255) DEFAULT NULL,
  `role` enum('user','admin','reseller') DEFAULT 'user',
  `department` varchar(100) DEFAULT 'Support',
  `plan_id` varchar(50) DEFAULT NULL,
  `credits_available` decimal(15,4) DEFAULT 0.0000,
  `wallet_balance` decimal(15,4) DEFAULT 0.0000,
  `credits_used` decimal(15,4) DEFAULT 0.0000,
  `channels_enabled` text DEFAULT NULL,
  `status` varchar(255) DEFAULT NULL,
  `provider` varchar(50) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `full_name` varchar(255) DEFAULT NULL,
  `otp` varchar(10) DEFAULT NULL,
  `otp_expiry` datetime DEFAULT NULL,
  `is_verified` tinyint(1) DEFAULT 0,
  `permissions` text DEFAULT NULL,
  `parent_reseller_id` int(11) DEFAULT NULL,
  `created_by` int(11) DEFAULT NULL,
  `rcs_config_id` int(11) DEFAULT NULL,
  `email_config_id` int(11) DEFAULT NULL,
  `rcs_text_price` decimal(15,4) DEFAULT 0.0000,
  `rcs_rich_card_price` decimal(15,4) DEFAULT 0.0000,
  `rcs_carousel_price` decimal(15,4) DEFAULT 0.0000,
  `wa_marketing_price` decimal(15,4) DEFAULT 0.0000,
  `wa_utility_price` decimal(15,4) DEFAULT 0.0000,
  `wa_authentication_price` decimal(15,4) DEFAULT 0.0000,
  `whatsapp_config_id` int(11) DEFAULT NULL,
  `api_password` varchar(255) DEFAULT NULL,
  `sms_gateway_id` int(11) DEFAULT NULL,
  `is_read` tinyint(1) DEFAULT 0,
  `is_social_signup` tinyint(1) DEFAULT 0,
  `sms_transactional_price` decimal(15,4) DEFAULT 0.0000,
  `sms_promotional_price` decimal(15,4) DEFAULT 0.0000,
  `sms_service_price` decimal(15,4) DEFAULT 0.0000,
  `sms_pe_id` varchar(50) DEFAULT NULL,
  `sms_default_sender` varchar(20) DEFAULT NULL,
  `pe_id` varchar(50) DEFAULT NULL,
  `hash_id` varchar(255) DEFAULT NULL,
  `voice_price` decimal(10,4) DEFAULT 1.5000,
  `ai_voice_config_id` int(11) DEFAULT NULL,
  `rcs_limit` decimal(15,4) DEFAULT NULL,
  `wa_limit` decimal(15,4) DEFAULT NULL,
  `sms_limit` decimal(15,4) DEFAULT NULL,
  `voice_limit` decimal(15,4) DEFAULT NULL,
  `is_api_allowed` tinyint(1) DEFAULT 0,
  `is_proero_enabled` tinyint(1) DEFAULT 0,
  `is_smm_enabled` tinyint(1) DEFAULT 0,
  `dlr_webhook_url` varchar(255) DEFAULT NULL,
  `wa_unofficial_webhook_enabled` tinyint(1) DEFAULT 0,
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`),
  UNIQUE KEY `api_key` (`api_key`),
  KEY `fk_rcs_config` (`rcs_config_id`),
  KEY `fk_whatsapp_config` (`whatsapp_config_id`),
  KEY `idx_role_status` (`role`,`status`),
  KEY `idx_reseller_id` (`reseller_id`),
  CONSTRAINT `fk_rcs_config` FOREIGN KEY (`rcs_config_id`) REFERENCES `rcs_configs` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_whatsapp_config` FOREIGN KEY (`whatsapp_config_id`) REFERENCES `whatsapp_configs` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=80 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `vendor_user_mappings`
--

DROP TABLE IF EXISTS `vendor_user_mappings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `vendor_user_mappings` (
  `id` varchar(36) NOT NULL,
  `vendor_id` varchar(36) NOT NULL,
  `user_id` int(11) NOT NULL,
  `priority` int(11) DEFAULT 1,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_vendor_id` (`vendor_id`),
  KEY `idx_user_id` (`user_id`),
  CONSTRAINT `fk_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_vendor` FOREIGN KEY (`vendor_id`) REFERENCES `vendors` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `vendors`
--

DROP TABLE IF EXISTS `vendors`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `vendors` (
  `id` varchar(36) NOT NULL,
  `name` varchar(100) NOT NULL,
  `type` varchar(255) DEFAULT NULL,
  `api_url` varchar(255) NOT NULL,
  `api_key` varchar(255) DEFAULT NULL,
  `priority` int(11) DEFAULT 1,
  `status` varchar(255) DEFAULT NULL,
  `channels` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL CHECK (json_valid(`channels`)),
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_vendor_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `vmn_reports`
--

DROP TABLE IF EXISTS `vmn_reports`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `vmn_reports` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `vmn_id` int(11) NOT NULL,
  `received` int(11) NOT NULL DEFAULT 0,
  `date` date NOT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_vmn_date` (`vmn_id`,`date`),
  CONSTRAINT `vmn_reports_ibfk_1` FOREIGN KEY (`vmn_id`) REFERENCES `vmns` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `vmns`
--

DROP TABLE IF EXISTS `vmns`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `vmns` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `number` varchar(15) NOT NULL,
  `type` varchar(255) DEFAULT NULL,
  `user_id` int(11) DEFAULT NULL,
  `status` varchar(255) DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `number` (`number`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `vmns_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `voice_configs`
--

DROP TABLE IF EXISTS `voice_configs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `voice_configs` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) DEFAULT NULL,
  `name` varchar(100) NOT NULL,
  `api_user` varchar(100) NOT NULL,
  `api_password` varchar(100) NOT NULL,
  `status` varchar(255) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `wallet_ledger`
--

DROP TABLE IF EXISTS `wallet_ledger`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `wallet_ledger` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `owner_user_id` int(11) NOT NULL,
  `type` varchar(255) DEFAULT NULL,
  `amount` bigint(20) NOT NULL,
  `direction` enum('IN','OUT') NOT NULL,
  `balance_before` bigint(20) NOT NULL,
  `balance_after` bigint(20) NOT NULL,
  `performed_by` int(11) NOT NULL,
  `related_user_id` int(11) DEFAULT NULL,
  `reference_type` varchar(50) DEFAULT NULL,
  `reference_id` varchar(255) DEFAULT NULL,
  `reason` text DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_owner` (`owner_user_id`),
  KEY `idx_type` (`type`),
  KEY `idx_reference` (`reference_type`,`reference_id`)
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `wallets`
--

DROP TABLE IF EXISTS `wallets`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `wallets` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `owner_user_id` int(11) NOT NULL,
  `total_credit` bigint(20) DEFAULT 0,
  `available_credit` bigint(20) DEFAULT 0,
  `spent_credit` bigint(20) DEFAULT 0,
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_owner` (`owner_user_id`),
  CONSTRAINT `fk_wallet_user` FOREIGN KEY (`owner_user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `webhook_logs`
--

DROP TABLE IF EXISTS `webhook_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `webhook_logs` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) DEFAULT NULL,
  `sender` varchar(100) DEFAULT NULL,
  `received_time` varchar(100) DEFAULT NULL,
  `recipient` varchar(100) DEFAULT NULL,
  `message_content` text DEFAULT NULL,
  `media_url` text DEFAULT NULL,
  `message_id` varchar(100) DEFAULT NULL,
  `subscription` varchar(100) DEFAULT NULL,
  `message_data` text DEFAULT NULL,
  `product` varchar(50) DEFAULT NULL,
  `business_id` varchar(100) DEFAULT NULL,
  `type` varchar(255) DEFAULT NULL,
  `project_number` varchar(100) DEFAULT NULL,
  `event_type` varchar(50) DEFAULT NULL,
  `message_id_envelope` varchar(100) DEFAULT NULL,
  `publish_time` varchar(100) DEFAULT NULL,
  `raw_payload` longtext DEFAULT NULL CHECK (json_valid(`raw_payload`)),
  `status` varchar(255) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `campaign_id` varchar(255) DEFAULT NULL,
  `campaign_name` varchar(255) DEFAULT NULL,
  `template_name` varchar(255) DEFAULT NULL,
  `channel` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_created_at` (`created_at` DESC),
  KEY `idx_phones` (`sender`,`recipient`),
  KEY `idx_message_id` (`message_id`),
  KEY `idx_webhook_logs_created` (`created_at`),
  KEY `idx_webhook_logs_user` (`user_id`),
  KEY `idx_webhook_logs_msg_id` (`message_id`),
  KEY `idx_webhook_logs_msg` (`message_id`),
  KEY `idx_user_recipient` (`user_id`,`recipient`),
  KEY `idx_type_status` (`type`,`status`),
  KEY `idx_user_type_status` (`user_id`,`type`,`status`),
  KEY `idx_status` (`status`),
  KEY `idx_status_type` (`status`,`type`),
  KEY `idx_user_status_type` (`user_id`,`status`,`type`),
  KEY `idx_campaign_id` (`campaign_id`)
) ENGINE=InnoDB AUTO_INCREMENT=3038022 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `webhook_logs_archive`
--

DROP TABLE IF EXISTS `webhook_logs_archive`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `webhook_logs_archive` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) DEFAULT NULL,
  `sender` varchar(100) DEFAULT NULL,
  `received_time` varchar(100) DEFAULT NULL,
  `recipient` varchar(100) DEFAULT NULL,
  `message_content` text DEFAULT NULL,
  `media_url` text DEFAULT NULL,
  `message_id` varchar(100) DEFAULT NULL,
  `subscription` varchar(100) DEFAULT NULL,
  `message_data` text DEFAULT NULL,
  `product` varchar(50) DEFAULT NULL,
  `business_id` varchar(100) DEFAULT NULL,
  `type` varchar(255) DEFAULT NULL,
  `project_number` varchar(100) DEFAULT NULL,
  `event_type` varchar(50) DEFAULT NULL,
  `message_id_envelope` varchar(100) DEFAULT NULL,
  `publish_time` varchar(100) DEFAULT NULL,
  `raw_payload` longtext DEFAULT NULL CHECK (json_valid(`raw_payload`)),
  `status` varchar(255) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `campaign_id` varchar(255) DEFAULT NULL,
  `campaign_name` varchar(255) DEFAULT NULL,
  `template_name` varchar(255) DEFAULT NULL,
  `channel` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_created_at` (`created_at` DESC),
  KEY `idx_phones` (`sender`,`recipient`),
  KEY `idx_message_id` (`message_id`),
  KEY `idx_webhook_logs_created` (`created_at`),
  KEY `idx_webhook_logs_user` (`user_id`),
  KEY `idx_webhook_logs_msg_id` (`message_id`),
  KEY `idx_webhook_logs_msg` (`message_id`),
  KEY `idx_user_recipient` (`user_id`,`recipient`),
  KEY `idx_type_status` (`type`,`status`),
  KEY `idx_user_type_status` (`user_id`,`type`,`status`),
  KEY `idx_status` (`status`),
  KEY `idx_status_type` (`status`,`type`),
  KEY `idx_user_status_type` (`user_id`,`status`,`type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `whatsapp_configs`
--

DROP TABLE IF EXISTS `whatsapp_configs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `whatsapp_configs` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `chatbot_name` varchar(100) NOT NULL,
  `provider` varchar(50) DEFAULT 'vendor1',
  `wanumber` varchar(50) DEFAULT NULL,
  `domain` varchar(255) DEFAULT NULL,
  `customer_id` varchar(100) DEFAULT NULL,
  `wa_token` text NOT NULL,
  `api_key` text DEFAULT NULL,
  `ph_no_id` varchar(255) NOT NULL,
  `wa_biz_accnt_id` varchar(255) NOT NULL,
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `whatsapp_proero_channels`
--

DROP TABLE IF EXISTS `whatsapp_proero_channels`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `whatsapp_proero_channels` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `name` varchar(100) NOT NULL,
  `phone_number` varchar(20) DEFAULT NULL,
  `provider` varchar(50) DEFAULT 'Proero',
  `status` varchar(255) DEFAULT NULL,
  `session_data` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`session_data`)),
  `instance_id` varchar(100) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `whatsapp_proero_channels_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=40 DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-06-09 15:41:38


SET FOREIGN_KEY_CHECKS = 1;


-- Seeding admin user
INSERT INTO `users` (id, name, email, password, role, is_verified, status, wallet_balance, credits_available, channels_enabled) VALUES (34, 'Sandeep', 'sandeep@gmail.com', '$2a$10$IrbMEsiQAZmJZDdVt3stCOi8jZrD2WuXOz5NZP75jUEkS65W/46ni', 'admin', 1, 'active', 999999.00, 999999, '["whatsapp", "rcs", "sms", "email"]') ON DUPLICATE KEY UPDATE id=id;
