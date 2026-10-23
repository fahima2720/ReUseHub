# College DBMS (28561) report outline

1. **Cover page:** ReUseHub — Second-hand Marketplace and Free Donation System; student name/ID, department, course 28561, institution, submission date (fill in real details).
2. **Introduction:** Useful items are often discarded while other people need affordable goods.
3. **Problem statement:** Informal sales/donations are difficult to search, track, contact and moderate reliably.
4. **Objectives:** Browse and filter items; distinguish sale/free; manage ownership and availability; support messages; enforce permissions; demonstrate relational design and SQL.
5. **Scope:** Local item exchange, user listings, inquiries/replies, categories and moderation. No payments, shipping or order fulfillment.
6. **Existing problem:** Unstructured social posts repeat details and lose availability/message context.
7. **Proposed solution:** ReUseHub stores related records and provides a simple existing web interface.
8. **System features:** Home/Browse/Detail/Auth/Sell/Dashboard/Inbox/Admin. Explain ownerless samples cannot be contacted.
9. **Database design:** Explain two environments honestly: hosted Cloud PostgreSQL; separate MySQL 8 presentation model. Include schema mapping and normalization.
10. **ER explanation:** Copy editable diagram from er-diagram.md. Describe keys, one-to-many links and self-referencing replies.
11. **Relational schema:** List users, user_roles, categories, listings, listing_images, inquiries, reports; identify PKs/FKs/unique/check rules.
12. **CRUD operations:** Include table from crud-sql-mapping.md and owner-scoped example statements.
13. **SQL queries:** Present representative SELECT/JOIN/LEFT JOIN/GROUP BY/aggregate/subquery and transactional CRUD examples from queries.sql.
14. **Implementation:** React/TypeScript/TanStack Start + Cloud client; managed hosted auth/storage; separate local MySQL scripts. No claim of a MySQL web backend.
15. **Testing:** Include actual evidence and statuses from test-cases.md. Do not change Not tested to Passed without executing it.
16. **Limitations:** One image in the hosted app, ownerless demo rows, no payments; auth email and admin/multi-user flows may remain unverified; MySQL requires a local server and is not connected.
17. **Future improvements:** Multi-image hosted support, richer thread views, local authenticated MySQL API, saved favorites, full-text search, additional permission tests.
18. **Conclusion:** The project demonstrates relational modeling and a working hosted marketplace while clearly separating the MySQL teaching materials.
19. **Appendices:** Setup commands, full schema/seed/queries, screenshots taken from actual runs, test evidence, references.
