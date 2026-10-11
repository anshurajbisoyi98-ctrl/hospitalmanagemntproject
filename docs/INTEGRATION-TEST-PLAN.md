# API integration test plan

Issue #14 covers integration checks for authentication, roles, Books/search, and borrowing/inventory consistency. This plan maps the agreed API contract to executable tests and records the feature dependencies. Do not mark an unimplemented endpoint as passing. Test MongoDB transactions on Atlas or a replica set.

Run the current baseline from the repository root. The Atlas health integration check runs when `backend/.env` contains a real test or Atlas `MONGO_URI`; it is reported as skipped when no usable URI is configured:

```sh
npm ci
npm test
npm run build
```

For authenticated API tests, provision an isolated test database and Admin through the planned bootstrap utility. Set test-only `MONGO_URI` and `JWT_SECRET` in the test process; never load production credentials from a developer's `.env` in CI. Clear test collections before and after each suite. Tests should start the exported Express app on an ephemeral port and close the HTTP server and database connection during teardown.

## Executable coverage status

| Area | Scenario | Expected result | Current coverage |
| --- | --- | --- | --- |
| Configuration | Missing/invalid required environment values | Startup rejected with safe message | Foundation test |
| API foundation | Health with disconnected database | 503 safe JSON; expected CORS origin | Foundation integration test |
| MongoDB integration | Real Mongoose connection and healthy API response | 200 safe JSON; expected CORS origin; no database writes | `backend/test/mongo.integration.test.js` (passes with configured URI) |
| API foundation | Unknown route and malformed JSON | 404 and 400 safe JSON | Foundation integration test |
| API foundation | Async handler rejects | Central handler sends safe 500 without internals | Foundation integration test |
| Token parser | Valid/expired/malformed/exp-less token and malformed stored session | Invalid sessions rejected | Frontend unit tests |
| Auth API | Register, login, duplicate email, invalid credentials, role escalation | 201/401/409; new account always User; no hash in response | Blocked on issue #2 |
| Authorization | Public, authenticated User and Admin access | 401/403 as appropriate; Admin-only calls denied to User | Blocked on issue #4 |
| Book API | Create/list/detail/edit/delete, validation, duplicate ISBN, invalid ID | Agreed JSON shape and 400/404/409 errors | Blocked on issues #3 and #6 |
| Search API | Title, author, ISBN, category, combined filters, no matches | Correct matching list, empty list for no results | Blocked on issue #8 |
| Issue API | Available/unavailable book, missing user/book, bad due date, duplicate active loan | Correct issue record and stock decrement, or safe rejection | Blocked on issue #9 |
| Concurrency | Two borrowers contend for last copy | Exactly one issue succeeds; available copies never negative | Blocked on issue #9 and replica-set test database |
| Return API | First return, repeated return, missing loan | Exactly one stock restoration; duplicate rejected | Blocked on issue #10 |
| Concurrency/rollback | Concurrent return and injected transaction failure | One restoration; failed transaction leaves records and stock unchanged | Blocked on issue #10 and replica-set test database |
| Inventory edits | Change total copies/delete while active loans exist or issue races | Active loans retained; no negative/inconsistent stock; unsafe delete rejected | Blocked on issue #6 and issue #9 |
| Ownership | User reads own vs another user's borrowing record | Own records only; no cross-user access | Blocked on issue #10 |

## Required test structure after APIs merge

1. `backend/test/auth.integration.test.js`: register, login, password hash omission, duplicate email, invalid credentials, attempts to select Admin during registration, missing and expired bearer tokens, User/Admin access.
2. `backend/test/books.integration.test.js`: Book CRUD, ISBN uniqueness race, field boundaries, unknown and malformed IDs, role checks, active-loan deletion/edit behavior, and search query combinations.
3. `backend/test/borrowings.integration.test.js`: issue/return, missing references, due dates, duplicate active loans and returns, ownership checks, unavailable books, last-copy concurrency, transactional rollback, and inventory races.
4. `backend/test/app.integration.test.js`: retain health, CORS, error, and unknown-route smoke checks; add a healthy connected-database response test.

Use real Mongoose models and isolated replica-set MongoDB for these suites so model validation, unique indexes, transaction behavior, and concurrent requests are exercised. Assert both HTTP responses and persisted database state. Ensure teardown runs after failures. Add a package script only when it points to an actual suite. Never weaken an expected assertion just to get green CI.

## Current blocker and next step

At the time this plan was prepared, no open feature PRs are present. Auth API/middleware (#2, #4), Book API (#3, #6), search (#8), and borrowing APIs (#9, #10) have not been implemented. The existing foundation checks are already covered by `backend/test/foundation.test.js`; duplicating them would not satisfy issue #14. Implement and run the feature integration suites as their API dependencies merge, then update this table with exact test results.
