# ReUseHub verification record

Executed against the existing local preview and real hosted Cloud data on 23–24 October 2026. A managed session for the requesting user's ordinary account was restored; this tests signed-in functionality, NOT password login or email confirmation. Only temporary QA listings were created/deleted. Existing sample data/design were preserved. Temporary uploaded test images may remain in storage (listing deletion does not remove stored files).

| ID | Feature | Steps | Expected result | Actual result | Status |
|---|---|---|---|---|---|
| T01 | Home | Open / | Home and listings render | Home title and data rendered; no page errors | Passed |
| T02 | Browse | Open /browse | Real listings visible | Existing records and links rendered | Passed |
| T03 | Search | Search textbooks | Matching record | One matching result | Passed |
| T04 | Category | Select Books | Books only | One Books record | Passed |
| T05 | Sale/free | Select each type | Correct rows and price labels | Five priced sale rows / three FREE donations | Passed |
| T06 | Sort | Sale, low-to-high | Ascending prices | 850, 1900, 2200, 2800, 3500 | Passed |
| T07 | Pagination | Next/previous with >12 available rows | Distinct pages, filters retained | Existing dataset has 8 rows; not exercised | Not tested |
| T08 | Item navigation | Click Browse item | Correct detail page | Textbook detail loaded, photo/description visible | Passed |
| T09 | Signed-in dashboard | Restore managed account session | Own listings screen | Dashboard rendered | Passed |
| T10 | Signup | New email → confirmation → activate | Account/profile created | Email flow not executed | Not tested |
| T11 | Password login | Valid password through form | Session and redirect | Managed session used; password flow not executed | Not tested |
| T12 | Duplicate email | Signup existing email | Clear safe rejection | Not submitted | Not tested |
| T13 | Logout | Click Log out | Public header restored | Log in visible, signed-out page | Passed |
| T14 | Create/upload | Create QA sale + PNG | Detail displays saved values/photo | Price 1234 read back; image complete/naturalWidth >0 | Passed |
| T15 | Sale validation | Publish price 0 | Reject | Field error shown | Passed |
| T16 | Edit own | Rename QA listing, reload | Updated title persists | Updated title in dashboard | Passed |
| T17 | Reserve/sold | Select statuses, reload | Status persists | reserved and sold read back | Passed |
| T18 | Confirm delete | Cancel, reload; then confirm, reload | Cancel keeps row; confirm removes | Both checked successfully | Passed |
| T19 | Donation storage | Insert own QA donation via authenticated data API | NULL price | price=NULL returned; temporary row deleted | Passed (API) |
| T20 | Inbox tabs | Open Inbox → Sent | Both views render | Received/sent screens render; no conversation exercised | Passed (navigation only) |
| T21 | Contact owner | Two distinct accounts, available owned item | Recipient is real owner, received inbox reads message | No second account session available | Not tested |
| T22 | Reply | Received message → Reply → recipient readback | Safe new reply row | Implemented UI/trigger and column verified; no received fixture | Not tested |
| T23 | Unavailable contact/reply | Contact reserved/sold owned listing as another user | Database rejects | Trigger inspected, not multi-user exercised | Not tested |
| T24 | Other listing edit/delete | Normal account attempts write to ownerless sample via API | No affected rows | Both operations affected zero rows; sample preserved | Passed (API; sample row) |
| T25 | Self admin promotion | Authenticated insert admin membership | Rejected | Role write denied | Passed (API) |
| T26 | Admin restrictions | Ordinary user /admin and admin_stats RPC | Denied | Admins only; RPC rejected | Passed |
| T27 | Self contact | Insert inquiry for own QA listing | Rejected | Database rejected | Passed (API) |
| T28 | Database sale rule | Update QA donation to sale price 0 | Rejected | Database rejected | Passed (API) |
| T29 | Admin CRUD | Admin user/listing/category/report tabs | Manage authorized records | No admin session; not promoted automatically | Not tested |
| T30 | Report flow | Report, duplicate, admin review | Correct ownership/moderation | Not exercised | Not tested |
| T31 | Missing image | Create item without image | Placeholder, no crash | Not specifically visually verified | Not tested |
| T32 | Invalid upload | Executable renamed / >5MB | Rejected | Validation inspected; not uploaded | Not tested |
| T33 | Mobile width | 390×844: Home/Browse/Auth/Detail | No document horizontal overflow | scrollWidth=clientWidth on all four | Passed |
| T34 | Routes | Vitest existing leaf route matching | Match all existing pages | Nine route tests passed (no loaders) | Passed |
| T35 | Input rules | Vitest sale/donation/message rules | Concrete bounds enforced | Three tests passed | Passed |
| T36 | Preview compilation | Inspect harness log after edits | No compilation errors | Latest entry build OK | Passed |
| T37 | Lint | bun run lint | No warnings/errors | Fails on existing formatting violations; no non-format errors found in review | Failed |
| T38 | MySQL import | Execute schema, seed, queries on MySQL 8.0.16+ | SQL executes correctly | No MySQL server/client installed; scripts not executed | Not tested |
| T39 | Price URL synchronization | Back/forward after min/max changes | Inputs match URL | Sync fix implemented, not explicitly browser exercised | Not tested |
| T40 | Role spoof / third-party replies | Other sender/recipient IDs | Rejected by trigger/RLS | Code inspected only; no unrelated account fixture | Not tested |

## Commands actually run
`bunx vitest run src/test/app-routing.test.tsx src/test/business-rules.test.ts`: 12 tests passed.
`bun run lint`: failed (formatting violations); not presented as passing.
Browser tests exercised Home/Browse/detail, signed-in own listing CRUD/upload/status/delete/logout and ordinary-account API permission checks. Harness automatically compiled the application; no manual build was run.

## Remaining demo prerequisites
Use your confirmed account for password sign-in. For messages/replies, create/confirm a second legitimate account and an available owned listing, then verify both inboxes. Admin demonstration requires explicit role assignment by a trusted owner, never arbitrary automatic promotion. Local MySQL import must be run on a real MySQL 8 server before claiming its SQL tests pass.
