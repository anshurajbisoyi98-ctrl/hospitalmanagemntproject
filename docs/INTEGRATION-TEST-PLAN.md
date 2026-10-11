# Integration and release verification

Use an isolated MongoDB database whose name contains \`test\`. CI creates a MongoDB 7 replica set and sets \`TEST_MONGO_URI\`; the test suites refuse a non-test database. Never point these tests at production data.

Run from the repository root:

\`\`\`sh
npm ci
npm test
npm run build
\`\`\`

## Coverage

- \`backend/test/foundation.test.js\`: config validation, disconnected health response, CORS, malformed JSON, unknown routes, and safe error handling.
- \`backend/test/api.integration.test.js\`: real Mongo-backed registration/login, role escalation rejection, duplicate registration, Admin-only book creation, duplicate ISBN, search, detail read, inventory edits, and active-loan edit/delete protection.
- \`backend/test/borrowing.integration.test.js\`: real Mongo-backed issue/return, last-copy contention, duplicate active-loan race, return race, rollback, and user ownership isolation. Requires a replica set for transactions.
- \`backend/test/auth.test.js\`, \`bookRead.test.js\`, \`bookMutation.test.js\`, and \`bookSearch.test.js\`: focused HTTP/model behavior tests; dependencies are mocked for non-database cases.
- \`frontend/src/test/SearchFilter.test.jsx\` and \`Books.integration.test.jsx\`: accessible search controls and catalog route/query, success, empty, and error rendering. Service calls are mocked in UI tests; the separate backend suites exercise the real API.
- \`frontend/src/utils/*.test.js\`: session, search, book form, and loan utility behavior.

The database suites use \`TEST_MONGO_URI\` and clean up only records created with unique test IDs. The read-only health integration test uses a configured \`MONGO_URI\` and performs no writes.

## Remaining manual release checks

CI does not prove production CORS, Vercel deep-link routing, real browser responsiveness, or user flows against production Atlas. Follow \`docs/DEPLOYMENT.md\`, then record the deployed URLs, live health response, browser checks, and fresh screenshots in \`docs/VERIFICATION.md\`. Do not record a check as passed unless it was actually performed.
