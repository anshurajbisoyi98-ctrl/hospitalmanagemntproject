# Library Management System

College Assignment-4: a React client and Express REST API for a library. The current implementation is a foundation only. Book CRUD, authentication, search, and borrowing remain planned.

## Team

| Member | GitHub | Roll number | Proposed feature ownership |
| --- | --- | --- | --- |
| Anshu Raj Bisoyi (Team Lead) | [anshurajbisoyi98-ctrl](https://github.com/anshurajbisoyi98-ctrl) | Pending | Foundation, integration testing, deployment and submission; issues, reviews and merges |
| Harsh Surana | [Harshsurana-hub](https://github.com/Harshsurana-hub) | Pending | Authentication, borrowing API |
| Dhruv Tomar | [dhruvtomar2006-debug](https://github.com/dhruvtomar2006-debug) | Pending | Book CRUD API, catalog/search interface |
| Kiran Sinha | [KiranSinha872](https://github.com/KiranSinha872) | Pending | Login/Admin book interface, borrowing interface and integration |

Four members are confirmed, including team lead Anshu Raj Bisoyi. All roll numbers are pending. Sixteen issues are published; Anshu’s four are assigned, while contributor assignments await collaborator access. Anshu will manage the repository, issues, reviews, merges and submission regardless of the proposed feature split.

## Stack and structure

React + Vite, JavaScript/JSX, React Router, Fetch, Node.js, Express, MongoDB Atlas + Mongoose, dotenv and CORS. frontend/src contains pages/components/services; backend/src contains configuration, middleware and server; docs contains the proposed API contract and issue roadmap. Models/routes/controllers are added with their features.

## Setup

Use a currently supported Node.js LTS runtime with npm. Development checks were run using the available Node 26 runtime; deployment on LTS still needs checking.

```sh
npm ci
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

Set real local values in backend/.env. MONGO_URI is your Atlas connection string; JWT_SECRET must be a unique random secret of at least 32 characters; FRONTEND_URL is the frontend origin without a trailing slash; PORT defaults to 5000. VITE_API_URL is the public API base URL, ending in /api; frontend environment variables are public, so never put secrets there. Restrict Atlas access to the backend's required network and use a dedicated database user. Never commit .env.

Run in two terminals:

```sh
npm run dev:backend
npm run dev:frontend
```

The backend connects to MongoDB before listening. The homepage checks GET /api/health. Missing environment configuration or failed database connection stops startup. Database connection failures use safe messages without printing credentials.

```sh
npm test
npm run build
```

Foundation tests need no live database and verify configuration failures and safe API errors. They do not establish Atlas integration or feature correctness.

## Coding conventions

The backend follows CommonJS and explicit route/controller/database modules demonstrated in the reference CRUD guide. The React frontend uses ES modules, readable arrow components and async/await. Both supplied study guides inform the route/middleware/controller structure and validation/error-handling conventions. See [coding conventions](docs/CODING-CONVENTIONS.md) for reference examples and implementation rules.

## API and planned features

Implemented: GET /api/health (200 with connected database; 503 otherwise), safe JSON errors and unknown-route handling. Planned: five Book CRUD endpoints, register/login, role middleware, search, and Admin-controlled issue/return. See [API contract](docs/API-CONTRACT.md) and [published issue roadmap](docs/ISSUE-ROADMAP.md).

## Collaboration

Team lead creates the remote repository and reviewed issues; contributors use feature branches and linked PRs. Do not push directly to main. Each member must have at least two meaningful merged PRs. Keep author identity accurate and do not split trivial edits to manufacture contributions. The foundation is published on feature/project-foundation for review into main; feature implementation remains pending.

Suggested protection: require a PR and one approval, passing agreed checks, and block force pushes/deletion on main. Verify settings supported by your repository plan; configure them in repository Settings → Rules/Branches. Another member should review the lead's PRs; the lead reviews and merges contributor PRs. The assignment minimum is eight meaningful merged PRs in total, at least two per member. The team target is now sixteen: four per member, planned in the issue roadmap. Each issue should result in one substantive reviewed and merged PR.

## Deployment and submission

Not deployed. Frontend: Vercel root frontend, build npm run build, output dist; configure VITE_API_URL with the deployed backend /api URL. The included rewrite supports React Router deep links. Backend: Node hosting, root backend, install npm ci from the workspace root where supported, start npm start --workspace backend from root (or npm start from backend); configure PORT, MONGO_URI, JWT_SECRET and FRONTEND_URL. Check hosting workspace support before deploying. Rebuild the frontend after changing its environment values.

Screenshots: pending functioning feature implementation.
GitHub repository: [hospitalmanagemntproject](https://github.com/anshurajbisoyi98-ctrl/hospitalmanagemntproject).
Frontend deployment URL: pending.
Backend deployment URL: pending.

Deadline: 12 October 2026, 9:00 AM (Asia/Kolkata).
Before submission, supply team name, project name, lead/member names and roll numbers, repository URL, backend URL and Vercel URL. Verify deployed feature flows, collect actual screenshots, and confirm contribution history.

Local macOS setup uses API port 5001 because AirPlay occupies port 5000. If needed, set PORT=5001 in backend/.env and VITE_API_URL=http://127.0.0.1:5001/api in frontend/.env. Set FRONTEND_URL to the exact browser origin (currently http://127.0.0.1:5173). These local files stay untracked.

## Authentication UI

Implemented in `feature/auth-ui` (issue #5). Frontend only; the backend auth endpoints (`POST /api/auth/register` and `POST /api/auth/login`) must be supplied by the backend feature branch before end-to-end flows work.

### Routes

| Path | Access | Description |
| --- | --- | --- |
| `/login` | Public | Sign-in form; redirects authenticated users home |
| `/register` | Public | Registration form; redirects authenticated users home |
| `/` | Authenticated | Home page; unauthenticated users redirected to `/login` |

### Session storage

The session is persisted to `localStorage` under the key `lms_session` as `{ token, user }`. On every page load the token's `exp` claim is decoded client-side; an expired token is discarded silently and the user is treated as logged out. Corrupted JSON is caught and discarded. Never put secrets in the frontend environment or `localStorage`.

### 401 / expired-token flow

When any API request that sent a `Bearer` token receives a 401 response, the session is cleared, the user is redirected to `/login` with `{ state: { expired: true } }`, and the login page displays "Your session has expired. Please sign in again." To test this manually, open DevTools → Application → Local Storage, change any character of the stored token, then visit a protected page.

### Password rule

Minimum 8 characters. This must match the backend bcrypt rule when the auth endpoints are implemented. Update the `MIN_PASSWORD` constant in `Login.jsx` and `Register.jsx` if the backend team decides on a different minimum.

## Book catalog

Implemented for issue #7. Provides the book list and book detail views with live inventory availability.

### Routes

| Path | Access | Description |
| --- | --- | --- |
| `/books` | Public (temporary) | Book catalog listing with live stock badges |
| `/books/:id` | Public (temporary) | Book detail page with inventory breakdown and metadata |

*Note: The routes are currently accessible directly without route guards, and will be wrapped in `ProtectedRoute` once issue #5 integration is finalized.*

### States

- **Loading:** Polite live region (`aria-live="polite"`) indicating ongoing data fetch.
- **Error:** Alert banner (`role="alert"`) with a Retry button allowing users to recover from network or server errors without leaving a blank page.
- **Empty:** Displays "No books in the catalog yet." when the collection has no records.
- **Missing book / Invalid ID:** 404 or invalid ID errors display a dedicated "Book not found" view with a link back to the catalog.
- **Active listing / details:** Responsive grid of book cards with textual availability badges and comprehensive metadata.

### Endpoints called

- `GET /api/books`: Retrieves the catalog book list. Supports optional search and filter parameters `?q=` (searches title, author, ISBN, category) and `?category=` (filters by category).
- `GET /api/books/:id`: Retrieves individual book record and copy counts by ID.

## Borrowing and returns

Implemented for issue #13. Provides the administrator loan management interface and user personal loans tracking with live catalog inventory synchronization.
### Catalog search and filtering (Issue #12)

- Controlled search input with debounced querying (300 ms) and immediate submission on Enter.
- Category filter dropdown populated dynamically from catalog data and stabilized during active queries.
- URL search parameters (`q` and `category`) synchronized with React Router as the source of truth for bookmarking and navigation history.
- Stale response protection via request sequencing and `AbortController`.
- Query-specific empty states with a "Clear filters" action and error states with a "Retry" button.
- Accessible live region announcing loading, search counts, and empty states.
- Frontend test suite runnable via `npm test` (root runs backend tests, node tests, and frontend Vitest component tests) or `npm run test --workspace frontend`.
## Book management

Implemented for issue #11. Provides librarian forms for adding, updating, and deleting books with validation and conflict handling.

### Routes

| Path | Access | Description |
| --- | --- | --- |
| `/admin/loans` | Admin | Issue loans, list active/returned loans, and return books |
| `/my-loans` | Authenticated (User & Admin) | View personal borrowing records and due dates |

### Role rules

- **Admin:** May select borrowers and available books to issue new loans, view all system loans, filter by status (All, Active, Overdue, Returned), and mark loans as returned.
- **User:** May view only their own borrowing records. The User code path never invokes the all-loans endpoint. Unprivileged access to `/admin/loans` displays an access-denied screen.
- Note: Hiding Admin controls in the UI is for user experience only; the backend strictly enforces role checks and user ownership isolation.

### Error cases

- **400 Bad Request:** Field validation errors mapped under borrower, book, or due date inputs.
- **403 Forbidden:** Displayed when an unprivileged account attempts an administrative loan operation.
- **404 Not Found:** Displayed when a book, borrower, or loan record is missing or deleted.
- **409 Conflict (Unavailable Book):** "No copies of this book are available." Automatically triggers a book catalog refresh to reflect current stock.
- **409 Conflict (Duplicate Return):** "This loan has already been returned." Automatically triggers a loan list refresh.
- **401 Unauthorized:** Handled via the central session-expiry redirect flow.
- **Network / 5xx Server Errors:** Safe, human-friendly fallbacks without leaking server internals.

### Endpoints called

- `POST /api/borrowings`: Issues a new loan with borrower ID, book ID, and due date (Admin).
- `GET /api/borrowings`: Fetches all loans (Admin) or personal loans (scoped to the authenticated user).
- `PATCH /api/borrowings/:id/return`: Marks an active loan as returned and increments available copies (Admin).
- `GET /api/users`: Fetches minimal borrower selection list (Admin).
- `GET /api/books`: Refetches catalog records following loan issue or return for live stock synchronization.

| `/admin/books/new` | Admin only | Form to create a new book with client validation |
| `/admin/books/:id/edit` | Admin only | Form to edit metadata and total copies of an existing book |

### Role rule

Book management routes and controls require the `Admin` role (`user.role === "Admin"`). Non-admin signed-in users attempting to access `/admin/books/*` directly encounter the existing access-denied screen via `ProtectedRoute`, while unauthenticated visitors are redirected to `/login`. Admin controls ("Add book" on the catalog page, "Edit" and "Delete" on the book detail page) are rendered only for users with the `Admin` role as a UX convenience (all mutations are enforced by backend role checks).

### Error cases

- **400 (Validation errors):** Field-level errors displayed directly beneath corresponding inputs.
- **409 (Duplicate ISBN):** Conflicts on book creation or edit are highlighted on the ISBN input field.
- **409 (Active loan deletion conflict):** Deletion rejected due to active borrowings displays "This book has active loans and cannot be deleted. Return all copies first." within the confirmation dialog.
- **403 (Forbidden):** Permission denied errors display "You do not have permission to do this."
- **404 (Not found):** Missing records display "This book no longer exists." or a dedicated not-found view with catalog return link.
- **Network / 5xx:** Connection failures and server errors show safe messages without stack traces.
- **401 (Unauthorized):** Credentialed requests receiving 401 trigger the session expiration flow.

### Endpoints called

- `POST /api/books`: Create a new book record.
- `PUT /api/books/:id`: Update book metadata and total copies.
- `DELETE /api/books/:id`: Remove a book from the catalog if no active loans exist.

