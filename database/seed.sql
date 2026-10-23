-- Fictional teaching data only; not live account/database export. Run ONCE after schema.sql.
USE reusehub;
START TRANSACTION;
INSERT INTO users(id,full_name,email,phone,location,password_hash) VALUES
('11111111-1111-4111-8111-111111111111','Demo Seller','seller@example.invalid','00000000001','Dhaka',NULL),
('22222222-2222-4222-8222-222222222222','Demo Buyer','buyer@example.invalid','00000000002','Dhaka',NULL),
('33333333-3333-4333-8333-333333333333','Demo Donor','donor@example.invalid','00000000003','Rajshahi',NULL);
INSERT INTO user_roles(user_id,role) SELECT id,'user' FROM users;
INSERT INTO categories(id,name,slug) VALUES
(1,'Furniture','furniture'),(2,'Books','books'),(3,'Electronics','electronics'),(4,'Clothing','clothing'),
(5,'Home & Kitchen','home-kitchen'),(6,'Sports & Outdoors','sports-outdoors'),(7,'Garden','garden'),(8,'Other','other');
INSERT INTO listings(id,owner_id,category_id,title,description,listing_type,price,item_condition,status,location) VALUES
('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1','11111111-1111-4111-8111-111111111111',1,'Pre-owned armchair','Comfortable armchair in good condition. Pickup available.','sale',2500,'good','available','Dhaka'),
('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2','33333333-3333-4333-8333-333333333333',2,'Diploma textbooks','DBMS and programming textbooks free for a student.','donation',NULL,'fair','available','Rajshahi'),
('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3','11111111-1111-4111-8111-111111111111',3,'USB keyboard','Working USB keyboard with all keys tested.','sale',650,'good','available','Dhaka'),
('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa4','33333333-3333-4333-8333-333333333333',6,'Kids bicycle','Sixteen inch bicycle, suitable for a young child.','donation',NULL,'good','available','Sylhet'),
('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa5','11111111-1111-4111-8111-111111111111',5,'Dinnerware set','Six plates and bowls, clean and ready for pickup.','sale',1200,'like_new','available','Dhaka'),
('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa6','33333333-3333-4333-8333-333333333333',7,'Plant pots','Three spare plant pots for someone who gardens.','donation',NULL,'good','available','Rajshahi'),
('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa7','11111111-1111-4111-8111-111111111111',4,'Winter coat','Warm winter coat, lightly worn and freshly washed.','sale',900,'good','reserved','Dhaka'),
('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa8','33333333-3333-4333-8333-333333333333',5,'Desk lamp','Working desk lamp with adjustable head.','donation',NULL,'good','sold','Rajshahi');
INSERT INTO listing_images(listing_id,image_url,sort_order) VALUES
('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1','/images/seed/armchair.jpg',0),
('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2','/images/seed/books.jpg',0),
('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3','/images/seed/keyboard.jpg',0),
('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa4','/images/seed/bicycle.jpg',0),
('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa5','/images/seed/dinnerware.jpg',0),
('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa6','/images/seed/planters.jpg',0),
('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa7','/images/seed/coat.jpg',0),
('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa8','/images/seed/lamp.jpg',0);
INSERT INTO inquiries(id,listing_id,sender_id,recipient_id,message) VALUES
('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1','22222222-2222-4222-8222-222222222222','11111111-1111-4111-8111-111111111111','Hello, is this chair still available?');
INSERT INTO inquiries(id,listing_id,sender_id,recipient_id,reply_to_id,message) VALUES
('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1','11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-222222222222','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1','Yes, you can collect it tomorrow.');
INSERT INTO reports(id,listing_id,reporter_id,reason) VALUES
('cccccccc-cccc-4ccc-8ccc-ccccccccccc1','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3','22222222-2222-4222-8222-222222222222','Please check the accuracy of the description.');
COMMIT;
-- No pre-created admin and no usable passwords. Images are local app paths, not SQL binaries.
