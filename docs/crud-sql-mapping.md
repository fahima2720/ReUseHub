# CRUD-to-SQL mapping

CRUD means Create, Read, Update, Delete. The browser uses the existing Cloud client, which applies database permissions. The SQL below describes the separate MySQL model, not literal queries executed by the hosted frontend.

| Feature | Operation | MySQL table / query examples |
|---|---|---|
| Create listing | INSERT | listings; queries.sql 20/21 |
| View/list/search/filter listing | SELECT | listings + users + categories; 01–07 |
| Edit own listing | UPDATE | listings WHERE id=? AND owner_id=?; 20 |
| Reserve/sell/give away | UPDATE | listings.status; 20 |
| Delete own listing | DELETE | listings WHERE id=? AND owner_id=?; 20 |
| Add/view image | INSERT/SELECT | listing_images; 08 and seed.sql |
| Signup | INSERT | users then user_roles='user', in a transaction; hosted signup is managed auth |
| View/edit own profile | SELECT/UPDATE | users WHERE id=?; 23; hosted get_my_profile + profile policy |
| Delete user (admin) | DELETE | users, cascading dependent rows; hosted checked admin_delete_user RPC |
| Add/read/rename/delete category (admin writes) | INSERT/SELECT/UPDATE/DELETE | categories; 03/12/22 |
| Contact owner/reply | INSERT | inquiries; 21; recipient derived by trigger |
| Received/sent/listing messages | SELECT | inquiries; 09–11 |
| Edit/delete message | Not exposed | Neither is supported by the hosted app |
| Submit/view report | INSERT/SELECT | reports; seed.sql / 18 |
| Review/dismiss report (admin) | UPDATE | reports.status; 23 |
| Delete report | Not exposed | Cascades when related user/listing is removed |
| View/set roles | SELECT/privileged INSERT | user_roles; no normal-user write path |

## Parameterized SQL pattern for a future MySQL server
```js
// Illustration only; NOT a bundled or connected MySQL backend.
// actor.id comes from verified authentication, not request.body.
const [result] = await connection.execute(
  'UPDATE listings SET title=?, description=? WHERE id=? AND owner_id=?',
  [title, description, listingId, actor.id]
);
if (result.affectedRows !== 1) throw new Error('Not found or not authorized');
```
Bind values to placeholders; never concatenate names/searches/IDs into SQL. Allow-list sorting columns, since column names cannot be value placeholders. Authorize admin before running category/report/user management. Transactions keep multi-step writes consistent. The example does not establish that MySQL is integrated.
