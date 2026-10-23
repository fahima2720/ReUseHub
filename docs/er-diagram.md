# ReUseHub ER diagram (editable Mermaid source)

Paste/edit this Mermaid block in a Mermaid-compatible editor. It is the separate MySQL presentation model.

```mermaid
erDiagram
 USERS ||--o{ USER_ROLES : has
 USERS o|--o{ LISTINGS : owns
 CATEGORIES ||--o{ LISTINGS : classifies
 LISTINGS ||--o{ LISTING_IMAGES : has
 LISTINGS ||--o{ INQUIRIES : receives
 USERS ||--o{ INQUIRIES : sends
 USERS ||--o{ INQUIRIES : receives
 INQUIRIES o|--o{ INQUIRIES : replies_to
 LISTINGS ||--o{ REPORTS : has
 USERS ||--o{ REPORTS : files
 USERS {
  char36 id PK
  varchar email UK
  varchar full_name
  varchar password_hash
 }
 USER_ROLES {
  bigint id PK
  char36 user_id FK
  enum role
 }
 CATEGORIES {
  int id PK
  varchar name UK
  varchar slug UK
 }
 LISTINGS {
  char36 id PK
  char36 owner_id FK
  int category_id FK
  enum listing_type
  decimal price
  enum status
 }
 LISTING_IMAGES {
  bigint id PK
  char36 listing_id FK
  varchar image_url
  int sort_order
 }
 INQUIRIES {
  char36 id PK
  char36 listing_id FK
  char36 sender_id FK
  char36 recipient_id FK
  char36 reply_to_id FK
  text message
 }
 REPORTS {
  char36 id PK
  char36 listing_id FK
  char36 reporter_id FK
  enum status
 }
```

## Keys and relationships
- Every `id` is a primary key: it identifies exactly one row. UUID-style IDs use CHAR(36); category/image/role IDs are numeric.
- `user_roles.user_id` references users. `(user_id, role)` is unique, allowing protected role membership without a role field on a user-editable profile.
- `listings.owner_id` references users (nullable only for non-contactable samples); `category_id` references categories.
- `listing_images.listing_id` references listings; `(listing_id, sort_order)` is unique.
- `inquiries.listing_id`, `sender_id`, `recipient_id` reference listing/user/user respectively. `reply_to_id` optionally references a received inquiry.
- `reports.listing_id` and `reporter_id` reference listing/user. Each user can report a particular listing once.
- A user owns many listings; a category classifies many listings; each listing has many possible images/messages/reports.
- Deleting a user cascades to their listings, roles and messages/reports; deleting a listing cascades to its images/messages/reports. Deleting a category with listings is restricted.

## Hosted model difference
Hosted identities are `auth.users`, public details are `profiles`, roles are `user_roles`. The app currently stores one image URL on each listing and files in Cloud storage. The separate MySQL model combines auth/profile teaching fields in `users` and normalizes images into `listing_images`; this is a documented extension, NOT a live multi-image feature.
