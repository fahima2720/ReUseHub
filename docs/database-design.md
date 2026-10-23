# Database design and normalization

## What runs where
**Hosted application database: Supabase/PostgreSQL** (provided through Lovable Cloud).
**MySQL: DBMS schema and SQL materials prepared separately.**
The React/TypeScript/TanStack Start app still uses its original Cloud integration. `database/*.sql` is a local MySQL 8.0.16+ exercise, not a connected backend. There is no Express/MySQL API in this delivery.

## Mapping
| Hosted PostgreSQL | MySQL presentation | Meaning |
|---|---|---|
| auth.users + profiles | users | Identity + public/private profile teaching fields |
| user_roles | user_roles | Protected user/admin memberships |
| categories | categories | Unique named categories |
| listings.image_url + storage files | listing_images | Image normalization extension; live app has one image |
| listings | listings | Owner/category/type/price/condition/status/location |
| inquiries | inquiries | Opening messages and received-message replies |
| reports | reports | Moderation records |

## Normalization
1NF: each column holds a single value; there are no image1/image2/image3 columns or comma-separated message lists. Each image/message is a row.
2NF: non-key values depend on the complete primary key. Surrogate primary keys make this clear; unique compound rules prevent repeated memberships/images/reports.
3NF: seller names and category names are not copied into every listing. A listing stores foreign keys, so renaming a category updates one row. Message rows reference users rather than repeating their names. Roles are separate to prevent profile edits changing privilege.

These choices reduce update anomalies (inconsistent copied names), insert anomalies (needing a listing to create a category), and delete anomalies (losing a category when removing its last listing).

## Constraints and indexes
Primary keys guarantee row identity. Foreign keys prevent orphan rows. Email, category names/slugs, user-role pairs and report pairs are unique. Required details use NOT NULL. CHECK enforces sale price > 0 (and not NULL), donation price NULL, field lengths and no self-message. ENUM restricts allowed types/conditions/statuses/roles. MySQL before 8.0.16 must not be used because CHECK enforcement differs.

Browse indexes cover status/date, category/status and type/price. Inbox indexes cover recipient/date and sender/date. FK columns are indexed by InnoDB. Ordinary indexes do not speed arbitrary leading-wildcard LIKE searches; a future full-text index can improve larger datasets.

## Security boundary
Hosted RLS enforces own listing creation, owner/admin edits/deletes, participant-only inbox reads and protected role writes. The inquiry trigger derives the recipient rather than trusting the form and rejects unavailable/sample/self contact. Replies reference a received message on the same available listing. Sold means sold for sale listings and given away for donations.

The MySQL schema enforces relational rules but has no app session or row-level authorization. A future local backend MUST authenticate users, verify admin from protected roles, bind `?` parameters, derive actor IDs from a verified session, check affected rows, and use an owner predicate for updates/deletes. Never give students' browsers database credentials.

## Safe first admin (not performed automatically)
There is no public admin signup or self-promotion button. First create and confirm an ordinary account. A trusted project owner must verify that exact account and grant the admin membership through privileged backend administration; do not promote an arbitrary first signup. Hosted pattern, for a verified UUID only:
```sql
-- Run only through trusted project-owner backend administration, not browser code.
INSERT INTO public.user_roles(user_id, role)
VALUES ('<verified-account-uuid>', 'admin') ON CONFLICT (user_id, role) DO NOTHING;
```
Local MySQL equivalent (verified local user only):
```sql
INSERT INTO user_roles(user_id,role) VALUES('<verified-local-user-uuid>','admin');
```
No usable passwords or admins are seeded. If local login is built later, hash passwords with a proven password-hashing library; never plaintext. Remove a role to revoke admin access. No managed auth tables should be edited manually.
