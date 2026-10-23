# Presentation outline (12 slides)

1. **ReUseHub / DBMS 28561:** Your real name and student ID; second-hand + free-donation marketplace.
2. **Problem:** Useful goods go unused; informal posts are difficult to search and track.
3. **Objectives and scope:** Search/filter, ownership, availability, messages, moderation; no online payments.
4. **Architecture:** Existing React + TypeScript + TanStack Start; hosted Lovable Cloud/PostgreSQL. Separate MySQL materials for the DBMS exercise.
5. **Live browsing demo:** Home → Browse → keyword/category/type/sort → item detail.
6. **Live user demo:** Sign in → create/edit listing → change availability → confirmed deletion. Use your own account and temporary listing.
7. **Messages and moderation:** Opening inquiries and received-message replies; user/admin permissions. Do not demonstrate an untested admin account as working.
8. **ER diagram:** Users/roles/categories/listings/images/inquiries/reports and cardinalities.
9. **Relational constraints:** PK/FK/UNIQUE/CHECK; sale price >0; donation NULL; no self-message; category delete restriction.
10. **Normalization and SQL:** 1NF/2NF/3NF; JOIN, GROUP BY, aggregates and one parameterized CRUD pattern.
11. **Testing and limitations:** Show actual passed checks separately from Not tested; no claim of live MySQL integration.
12. **Conclusion and future work:** Reuse benefits, relational learning, next steps; questions.

## Suggested 5-minute live demonstration
Open Browse, search an existing title, filter free items, open a detail page. Sign in as yourself and create a temporary listing with a real photo. Edit it, reserve it, then delete with confirmation. If a second confirmed account is available, contact it and demonstrate inbox/reply. Only open Admin if a trusted owner has explicitly granted your account that role. Keep docs and SQL open as a backup if network or email confirmation is unavailable.

## Beginner-friendly viva Q&A
1. **What is a DBMS?** Software that stores, queries and controls access to organized data.
2. **What database does the website use?** Hosted Lovable Cloud uses PostgreSQL. MySQL scripts are separate college materials, not its live connection.
3. **What is a primary key?** A unique, non-null identifier for one row, such as listings.id.
4. **What is a foreign key?** A column linking to a valid parent row, such as listings.category_id → categories.id.
5. **What is a relationship?** A link between entities. One user can own many listings.
6. **Why separate categories?** A category name is stored once; every listing references it instead of repeating the name.
7. **What is normalization?** Organizing tables to reduce duplication and insertion/update/deletion anomalies.
8. **What is 1NF?** Atomic fields and no repeating groups; images and messages are separate rows.
9. **What is 2NF?** Non-key attributes depend on the whole key, not just part of a compound key.
10. **What is 3NF?** Non-key attributes do not depend on another non-key attribute; category names belong in categories.
11. **What is CRUD?** Create/Read/Update/Delete, represented by INSERT/SELECT/UPDATE/DELETE.
12. **What is a JOIN?** Combining related rows, e.g. listing details with category and seller.
13. **What is LEFT JOIN?** Keeps all left rows even without a matching right row; useful to include empty categories.
14. **Why COUNT(l.id), not COUNT(*) after LEFT JOIN?** COUNT(l.id) counts actual listings, so an empty category gives zero.
15. **What does GROUP BY do?** Groups rows for aggregates, e.g. listing count per category.
16. **What is an index?** A lookup structure that speeds suitable reads but costs storage and write work.
17. **How are donations represented?** listing_type='donation', price=NULL; the website displays FREE. NULL means no price, not the number zero.
18. **How are bad sale prices stopped?** Form validation and a database CHECK require a positive non-null price.
19. **How is SQL injection prevented?** Bound parameters separate values from SQL, with allow-listed sort columns and server-side validation.
20. **How are permissions enforced?** Hosted database policies restrict user writes and protected admin functions check roles. Hidden buttons alone are not security.
21. **Can a normal user become admin by editing a profile?** No; role memberships are separate and ordinary clients have no role-write permission.
22. **Why is a reply a new row?** It preserves history; reply_to_id links the received parent, and a trigger derives the other participant.
23. **Can unavailable items receive contact?** Opening messages and replies are rejected when a listing is reserved/sold; existing messages remain readable by participants.
24. **What is a transaction?** A group of operations committed together or rolled back together to avoid partial changes.
25. **What is ON DELETE CASCADE?** Dependent rows are removed with their parent, such as images when a listing is deleted.
26. **Why restrict category deletion?** Prevent deleting a category still used by listings; move/remove its listings first.
27. **Are seed accounts real users?** No. MySQL seeds are fictional, have no usable passwords and no admin membership.
28. **Is MySQL's schema alone a secure web backend?** No. A future backend must authenticate users, check roles and bind queries; it is not bundled here.
29. **What did you actually test?** Read the test-cases.md evidence; be honest about every Not tested row.
30. **What would you improve?** Multi-image hosted support, more multi-user/admin tests and an authenticated local MySQL API.
