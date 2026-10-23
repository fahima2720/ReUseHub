-- ReUseHub educational MySQL schema, MySQL 8.0.16+ (CHECK enforced).
-- Separate from the hosted PostgreSQL app. Run against a NEW local database.
CREATE DATABASE IF NOT EXISTS reusehub CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE reusehub;

CREATE TABLE users (
 id CHAR(36) PRIMARY KEY,
 full_name VARCHAR(80) NOT NULL,
 email VARCHAR(255) NOT NULL UNIQUE,
 phone VARCHAR(20) NOT NULL,
 location VARCHAR(80) NULL,
 password_hash VARCHAR(255) NULL COMMENT 'NULL seed users cannot log in; never store plaintext passwords',
 created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
 CONSTRAINT users_name CHECK (CHAR_LENGTH(TRIM(full_name)) BETWEEN 2 AND 80)
) ENGINE=InnoDB;
-- Roles are deliberately separate, like the hosted model. Protect role writes in any future server.
CREATE TABLE user_roles (
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 user_id CHAR(36) NOT NULL,
 role ENUM('user','admin') NOT NULL DEFAULT 'user',
 UNIQUE KEY user_role_unique(user_id,role),
 CONSTRAINT roles_user FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;
CREATE TABLE categories (
 id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 name VARCHAR(40) NOT NULL UNIQUE,
 slug VARCHAR(80) NOT NULL UNIQUE,
 created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT category_name CHECK (CHAR_LENGTH(TRIM(name)) BETWEEN 2 AND 40)
) ENGINE=InnoDB;
CREATE TABLE listings (
 id CHAR(36) PRIMARY KEY,
 owner_id CHAR(36) NULL COMMENT 'NULL only for non-contactable sample listings',
 category_id INT UNSIGNED NOT NULL,
 title VARCHAR(100) NOT NULL,
 description TEXT NOT NULL,
 listing_type ENUM('sale','donation') NOT NULL,
 price DECIMAL(12,2) NULL,
 item_condition ENUM('new','like_new','good','fair') NOT NULL,
 status ENUM('available','reserved','sold') NOT NULL DEFAULT 'available',
 location VARCHAR(80) NOT NULL,
 created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
 CONSTRAINT listing_owner FOREIGN KEY(owner_id) REFERENCES users(id) ON DELETE CASCADE,
 CONSTRAINT listing_category FOREIGN KEY(category_id) REFERENCES categories(id) ON DELETE RESTRICT,
 CONSTRAINT price_matches_type CHECK ((listing_type='sale' AND price IS NOT NULL AND price>0 AND price<=10000000) OR (listing_type='donation' AND price IS NULL)),
 CONSTRAINT listing_title CHECK (CHAR_LENGTH(TRIM(title)) BETWEEN 3 AND 100),
 CONSTRAINT listing_description CHECK (CHAR_LENGTH(TRIM(description)) BETWEEN 10 AND 2000),
 CONSTRAINT listing_location CHECK (CHAR_LENGTH(TRIM(location)) BETWEEN 2 AND 80),
 INDEX browse_status_created(status,created_at),
 INDEX browse_category(category_id,status),
 INDEX browse_type_price(listing_type,price),
 INDEX owner_created(owner_id,created_at)
) ENGINE=InnoDB;
CREATE TABLE listing_images (
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 listing_id CHAR(36) NOT NULL,
 image_url VARCHAR(2048) NOT NULL,
 sort_order INT UNSIGNED NOT NULL DEFAULT 0,
 created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 UNIQUE KEY listing_image_position(listing_id,sort_order),
 CONSTRAINT image_listing FOREIGN KEY(listing_id) REFERENCES listings(id) ON DELETE CASCADE
) ENGINE=InnoDB;
CREATE TABLE inquiries (
 id CHAR(36) PRIMARY KEY,
 listing_id CHAR(36) NOT NULL,
 sender_id CHAR(36) NOT NULL,
 recipient_id CHAR(36) NOT NULL,
 reply_to_id CHAR(36) NULL,
 message TEXT NOT NULL,
 created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT inquiry_listing FOREIGN KEY(listing_id) REFERENCES listings(id) ON DELETE CASCADE,
 CONSTRAINT inquiry_sender FOREIGN KEY(sender_id) REFERENCES users(id) ON DELETE CASCADE,
 CONSTRAINT inquiry_recipient FOREIGN KEY(recipient_id) REFERENCES users(id) ON DELETE CASCADE,
 CONSTRAINT inquiry_reply FOREIGN KEY(reply_to_id) REFERENCES inquiries(id) ON DELETE CASCADE,
 CONSTRAINT no_self_message CHECK (sender_id<>recipient_id),
 CONSTRAINT message_length CHECK (CHAR_LENGTH(TRIM(message)) BETWEEN 5 AND 1000),
 INDEX inbox_received(recipient_id,created_at),
 INDEX inbox_sent(sender_id,created_at),
 INDEX inquiry_listing_date(listing_id,created_at)
) ENGINE=InnoDB;
CREATE TABLE reports (
 id CHAR(36) PRIMARY KEY,
 listing_id CHAR(36) NOT NULL,
 reporter_id CHAR(36) NOT NULL,
 reason VARCHAR(500) NOT NULL,
 status ENUM('pending','reviewed','dismissed') NOT NULL DEFAULT 'pending',
 created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT report_listing FOREIGN KEY(listing_id) REFERENCES listings(id) ON DELETE CASCADE,
 CONSTRAINT report_user FOREIGN KEY(reporter_id) REFERENCES users(id) ON DELETE CASCADE,
 UNIQUE KEY one_report_per_user(listing_id,reporter_id),
 CONSTRAINT reason_length CHECK (CHAR_LENGTH(TRIM(reason)) BETWEEN 5 AND 500),
 INDEX moderation_queue(status,created_at)
) ENGINE=InnoDB;

DELIMITER $$
CREATE TRIGGER listings_owner_immutable BEFORE UPDATE ON listings FOR EACH ROW
BEGIN
 IF NOT (NEW.owner_id <=> OLD.owner_id) THEN
  SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Listing owner cannot be changed';
 END IF;
END$$
CREATE TRIGGER inquiries_prepare BEFORE INSERT ON inquiries FOR EACH ROW
BEGIN
 DECLARE listing_owner CHAR(36);
 DECLARE listing_state VARCHAR(20);
 DECLARE parent_sender CHAR(36);
 DECLARE parent_recipient CHAR(36);
 DECLARE parent_listing CHAR(36);
 SELECT owner_id,status INTO listing_owner,listing_state FROM listings WHERE id=NEW.listing_id;
 IF listing_owner IS NULL OR listing_state IS NULL OR listing_state<>'available' THEN
  SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Only available, user-owned listings accept contact';
 END IF;
 IF NEW.reply_to_id IS NULL THEN
  IF NEW.sender_id=listing_owner THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Cannot contact your own listing'; END IF;
  SET NEW.recipient_id=listing_owner;
 ELSE
  SELECT sender_id,recipient_id,listing_id INTO parent_sender,parent_recipient,parent_listing FROM inquiries WHERE id=NEW.reply_to_id;
  IF parent_recipient IS NULL OR parent_recipient<>NEW.sender_id OR parent_listing<>NEW.listing_id THEN
   SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Reply must reference a received message on this listing';
  END IF;
  SET NEW.recipient_id=parent_sender;
 END IF;
 SET NEW.message=TRIM(NEW.message);
END$$
DELIMITER ;
-- These constraints are not application authorization: MySQL has no equivalent auth.uid() here.
-- A future backend must authenticate the caller, derive sender/owner IDs, check protected roles,
-- and use bound parameters with owner-scoped UPDATE/DELETE; this folder is NOT that backend.
