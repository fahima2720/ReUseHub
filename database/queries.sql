-- ReUseHub MySQL 8 teaching queries. Run on the local database, NEVER the hosted PostgreSQL DB.
USE reusehub;
SET @user_id='11111111-1111-4111-8111-111111111111';
SET @buyer_id='22222222-2222-4222-8222-222222222222';
SET @listing_id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1';
-- 01 Available listings, newest first
SELECT id,title,listing_type,price FROM listings WHERE status='available' ORDER BY created_at DESC,id LIMIT 12 OFFSET 0;
-- 02 Keyword search
SELECT id,title FROM listings WHERE title LIKE '%chair%' OR description LIKE '%chair%';
-- 03 Category filter (JOIN)
SELECT l.id,l.title,c.name FROM listings l JOIN categories c ON c.id=l.category_id WHERE c.slug='books' AND l.status='available';
-- 04 Free donations
SELECT id,title,price FROM listings WHERE listing_type='donation' AND status='available';
-- 05 Sale price filter and sorting
SELECT id,title,price FROM listings WHERE listing_type='sale' AND status='available' AND price BETWEEN 500 AND 3000 ORDER BY price ASC;
-- 06 A user's listings
SELECT id,title,status FROM listings WHERE owner_id=@user_id ORDER BY created_at DESC;
-- 07 Detail with seller and category
SELECT l.*,u.full_name,c.name AS category FROM listings l LEFT JOIN users u ON u.id=l.owner_id JOIN categories c ON c.id=l.category_id WHERE l.id=@listing_id;
-- 08 Images, ordered
SELECT image_url,sort_order FROM listing_images WHERE listing_id=@listing_id ORDER BY sort_order;
-- 09 Listing messages with sender and recipient
SELECT i.id,i.message,s.full_name AS sender,r.full_name AS recipient FROM inquiries i JOIN users s ON s.id=i.sender_id JOIN users r ON r.id=i.recipient_id WHERE i.listing_id=@listing_id AND (i.sender_id=@user_id OR i.recipient_id=@user_id) ORDER BY i.created_at;
-- 10 Received inbox
SELECT i.message,l.title FROM inquiries i JOIN listings l ON l.id=i.listing_id WHERE i.recipient_id=@user_id ORDER BY i.created_at DESC;
-- 11 Sent inbox
SELECT i.message,l.title FROM inquiries i JOIN listings l ON l.id=i.listing_id WHERE i.sender_id=@user_id ORDER BY i.created_at DESC;
-- 12 Category counts including empty categories (LEFT JOIN/GROUP BY)
SELECT c.id,c.name,COUNT(l.id) AS listing_count FROM categories c LEFT JOIN listings l ON l.category_id=c.id GROUP BY c.id,c.name ORDER BY listing_count DESC;
-- 13 Price aggregates
SELECT COUNT(*) AS sale_count,MIN(price) AS cheapest,MAX(price) AS highest,AVG(price) AS average_price,SUM(price) AS advertised_total FROM listings WHERE listing_type='sale' AND status='available';
-- 14 Admin statistics (future backend must check role before running)
SELECT (SELECT COUNT(*) FROM users) AS users,(SELECT COUNT(*) FROM listings) AS listings,(SELECT COUNT(*) FROM inquiries) AS messages,(SELECT COUNT(*) FROM reports WHERE status='pending') AS pending_reports;
-- 15 Users without listings (subquery)
SELECT id,full_name FROM users WHERE id NOT IN (SELECT owner_id FROM listings WHERE owner_id IS NOT NULL);
-- 16 Above-average sale prices (subquery)
SELECT title,price FROM listings WHERE listing_type='sale' AND price>(SELECT AVG(price) FROM listings WHERE listing_type='sale');
-- 17 Active donors with at least one donation (HAVING)
SELECT u.id,u.full_name,COUNT(l.id) AS donations FROM users u JOIN listings l ON l.owner_id=u.id WHERE l.listing_type='donation' GROUP BY u.id,u.full_name HAVING COUNT(l.id)>=1;
-- 18 Admin moderation queue
SELECT r.id,r.reason,l.title,u.full_name FROM reports r JOIN listings l ON l.id=r.listing_id JOIN users u ON u.id=r.reporter_id WHERE r.status='pending' ORDER BY r.created_at;
-- 19 Status distribution
SELECT status,COUNT(*) AS total FROM listings GROUP BY status;
-- 20 Create/view/edit/reserve/delete demonstration: transaction is rolled back.
START TRANSACTION;
SET @new_id=UUID();
INSERT INTO listings(id,owner_id,category_id,title,description,listing_type,price,item_condition,location) VALUES(@new_id,@user_id,1,'Demo study table','A sturdy table for a SQL CRUD demonstration.','sale',1500,'good','Dhaka');
SELECT * FROM listings WHERE id=@new_id;
UPDATE listings SET price=1400 WHERE id=@new_id AND owner_id=@user_id;
UPDATE listings SET status='reserved' WHERE id=@new_id AND owner_id=@user_id;
DELETE FROM listings WHERE id=@new_id AND owner_id=@user_id;
ROLLBACK;
-- 21 Create donation, opening inquiry, and reply: rolled back.
START TRANSACTION;
SET @donation_id=UUID(); SET @inquiry_id=UUID();
INSERT INTO listings(id,owner_id,category_id,title,description,listing_type,price,item_condition,location) VALUES(@donation_id,@user_id,2,'Free DBMS notes','Printed DBMS notes available for a student.','donation',NULL,'good','Dhaka');
INSERT INTO inquiries(id,listing_id,sender_id,recipient_id,message) VALUES(@inquiry_id,@donation_id,@buyer_id,@user_id,'Hello, may I collect these notes?');
INSERT INTO inquiries(id,listing_id,sender_id,recipient_id,reply_to_id,message) VALUES(UUID(),@donation_id,@user_id,@buyer_id,@inquiry_id,'Yes, collection is available tomorrow.');
ROLLBACK;
-- 22 Category CRUD: future backend must authorize admin; rolled back.
START TRANSACTION;
INSERT INTO categories(name,slug) VALUES('Demo category','demo-category');
SET @category_id=LAST_INSERT_ID();
UPDATE categories SET name='Updated demo category' WHERE id=@category_id;
SELECT * FROM categories WHERE id=@category_id;
DELETE FROM categories WHERE id=@category_id;
ROLLBACK;
-- 23 Own profile update and admin report review examples: rolled back.
START TRANSACTION;
UPDATE users SET location='Dhaka' WHERE id=@user_id;
UPDATE reports SET status='reviewed' WHERE id='cccccccc-cccc-4ccc-8ccc-ccccccccccc1';
ROLLBACK;
-- In application code replace @variables with bound ? parameters, never concatenated user input.
-- IDs must come from a verified session, NOT from a form or arbitrary request field.
