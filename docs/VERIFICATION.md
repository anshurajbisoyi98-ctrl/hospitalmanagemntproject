# Foundation verification

Checked locally on 10 October 2026 using Node 26.8.1 and npm 11.19.0.

- npm test: passed 2 foundation tests (configuration validation; API database-unavailable, CORS, unknown-route and malformed-JSON behavior).
- npm run build: passed production frontend compilation with Vite 8.3.4, 26 modules transformed.
- npm run start --workspace backend without local environment settings: exited with status 1 and a safe missing-variable message, as intended.
- git check-ignore backend/.env frontend/.env: both ignored.
- npm installation audit: reported zero vulnerabilities in installed dependencies.

Not verified: browser interaction, live Atlas connectivity, supported-LTS runtime compatibility, CRUD/authentication/borrowing features, deployed integration, remote reviews/merges and submission. These require the next issues and deployment configuration.

No feature tests, PRs or deployment results are implied by the foundation checks. No commit or remote action was performed.

## Coding-style adaptation

Converted the backend to CommonJS, extracted config/db.js and the health route/controller, and expanded frontend JSX and async effect code. After the change, npm test passed both existing behavior tests and npm run build passed. Live Atlas and browser verification remain pending. The health endpoint and response contract are unchanged.

## Second-reference integration

Reviewed the second MERN study guide and documented applicable middleware/model/frontend patterns. Added headers-sent delegation to centralized error handling and an HTTP test verifying that a rejected async controller produces a safe 500 response without private error details. npm test passed all three tests; npm run build passed. Live Atlas and browser feature verification remain pending.

## Publication verification

Before publication, npm test passed all three foundation tests and npm run build passed. The configured Atlas connection was verified locally by GET http://127.0.0.1:5001/api/health returning 200 with status ok and the expected frontend CORS origin. This verifies connectivity only, not CRUD, auth or borrowing functionality. Local environment credentials are excluded from Git.

An empty main baseline was created solely to enable PR review in the initially empty remote repository. Implementation is on feature/project-foundation. All sixteen planned issues are published; only the four lead-owned issues can currently be assigned. No feature issues are completed, no PR is merged, and no production deployment is claimed.

## API integration readiness

`docs/INTEGRATION-TEST-PLAN.md` maps issue #14 acceptance cases to dependencies and actual coverage. Auth, Book/search, and borrowing integration suites are pending their feature APIs; no tests are claimed for unimplemented routes. Existing foundation integration checks remain in `backend/test/foundation.test.js`.


## Issue #14 integration progress

Added `backend/test/mongo.integration.test.js`. With the configured Atlas `MONGO_URI`, it connects through Mongoose, starts the real Express app, and verifies the healthy `/api/health` response and CORS origin. It performs no database writes and is skipped if no real URI is configured. `npm test` passed all 20 tests (4 backend, 16 frontend), including the live Atlas check. This covers the implemented health/API foundation only; auth, Book/search and borrowing integration cases still require their feature APIs.


## Current release verification — 11 October 2026

The historical notes above describe earlier milestones. Current automated verification is recorded below.

- GitHub Actions passed on PR #32's latest code: backend tests, frontend utility tests, Vitest catalog tests, and the Vite production build. Backend integration tests use an isolated MongoDB replica set in CI.
- GitHub Actions passed on the deployment configuration branch before the submission audit update; CI is running again for the latest PR #33 commit.
- The latest merged main build repair is PR #31. It is a Copilot-authored fix and is excluded from student contribution counts.
- No Vercel or Render service has been deployed or checked. No production URL, live CORS result, deployed Atlas result, or fresh browser screenshot is claimed.
- Existing feature screenshots are in \`docs/screenshots/issue-7\`, \`docs/screenshots/issue-11\`, and \`docs/screenshots/issue-13\`; they are not screenshots of the current deployed release.
- Roll numbers for the four members remain pending.

Follow \`docs/DEPLOYMENT.md\` to complete hosted checks. Record actual URLs and fresh results here only after running those checks.
