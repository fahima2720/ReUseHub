# ReUseHub — College DBMS (28561)

Existing second-hand marketplace and free-donation application. The original design, working integration and sample data are preserved.

**Hosted application database: Supabase/PostgreSQL** (managed through Lovable Cloud).
**MySQL: DBMS schema and SQL materials prepared separately.**

## Local website source setup
Install Bun, extract the source ZIP, open the ReUseHub directory, then:
```sh
bun install
cp .env.example .env
bun run dev
```
Configure your own compatible backend's URL and publishable key in `.env` (client VITE values and matching server values). Never place a service key in a VITE variable. The ZIP excludes private settings, live account/data exports and Cloud storage files. Starting the source does not provision a fresh hosted backend; migrations document its PostgreSQL structure and managed auth/storage must also be configured. The development command prints the local URL.

```sh
bun run test
bun run lint
bun run build
```
Build is a command for your own local setup; it was not manually run here. Preview compilation was checked through the automated harness. Current lint has pre-existing formatting failures; see test-cases.md. Development tooling regenerates routing code.

## Separate MySQL setup (not connected to website)
Install a genuine MySQL server **8.0.16 or later** and client. From the project folder, on a fresh local database:
```sh
mysql --version
mysql -u root -p < database/schema.sql
mysql -u root -p reusehub < database/seed.sql
mysql -u root -p reusehub < database/queries.sql
```
`-p` prompts for your local password; do not paste credentials in source files. Schema creates `reusehub`; run schema/seed once in a fresh database, not over existing data. Query examples 20–23 use transactions and rollback their demonstrations. Earlier SELECT examples don't modify data. MySQL files were authored/reviewed but not executed here: no MySQL server/client was available. MariaDB is not a substitute verification target.

Fictional seed users have NULL password hashes and no admin privileges. The scripts are schema/data/query materials, **not an Express/MySQL login or CRUD API**. MySQL constraints do not implement per-user web authorization. A future backend must authenticate, bind parameters, derive actor IDs, check roles and owner predicates. See docs/database-design.md.

## Deliverable structure
- `database/schema.sql`: users, protected user_roles, categories, listings, listing_images, inquiries with replies, reports; PK/FK/ENUM/CHECK/indexes and validation triggers.
- `database/seed.sql`: fictional users, 8 categories/listings, image references, inquiry/reply, report.
- `database/queries.sql`: 23 numbered SQL examples covering CRUD, filters, joins, grouping, aggregates, subqueries and statistics.
- `docs/er-diagram.md`: editable Mermaid diagram and key relationships.
- `docs/database-design.md`: environment mapping, normalization, permissions and safe first-admin instructions.
- `docs/crud-sql-mapping.md`: feature/SQL mapping and parameterized pattern.
- `docs/test-cases.md`: actual executed evidence versus Not tested cases.
- `docs/report-outline.md`: beginner-friendly report outline.
- `docs/presentation-and-viva.md`: 12-slide outline and 30 viva answers.

## Changed files
Added `database/*.sql`, all six `docs/*.md`, `src/lib/validation.ts`, `src/test/business-rules.test.ts`, `roadmap.md` and export setup example.
Updated README, AGENTS, listing-form, listings helper, route test, all content routes (leaf sharing metadata), inbox replies, dashboard/edit error handling, browse price-input synchronization and item error/not-found handling.
Added PostgreSQL migration `0001_safe_inquiry_replies.sql`; generated database types refreshed automatically. No design/style files changed.

## Final checklist
### DONE
- Preserved the existing website/design/integration and sample records.
- Verified public browsing/search/category/free/sale filtering, ascending price sort and detail navigation.
- Verified own sale creation with image loading, edit, reserve/sold readback, cancel/confirm delete, managed-session dashboard and logout.
- Verified ordinary user denied role promotion, admin statistics and sample listing edits/deletes; self-contact and zero sale price rejected by database.
- Added safe received-message reply support; database rejects replies on unavailable listings.
- Prepared separate MySQL scripts, ER/normalization/CRUD/report/presentation/viva and honest test record.
- Twelve focused tests passed; latest automated preview compilation reported build OK.
### PARTIALLY DONE
- Complete demo coverage: single-user own-listing and public flows verified; multi-user contact/reply and admin CRUD need additional accounts/authorization.
- Lint was run but fails on existing formatting violations.
### NOT DONE
- MySQL connection/API for the hosted application (intentionally outside this request; hosted PostgreSQL retained).
- Automatic first-admin promotion (intentionally not performed); safe verified-owner instructions provided.
### NOT TESTED
- Signup confirmation, password login, duplicate email, multi-user inbox delivery/reply, unavailable contact as another account, admin CRUD/report handling, invalid uploads, full pagination and MySQL execution.

See `docs/test-cases.md` for exact statuses and remaining prerequisites. Hosted app still supports one image per listing; MySQL listing_images is a normalized teaching extension, not a live gallery. Temporary uploaded QA images may remain in storage after their listing rows were deleted.
