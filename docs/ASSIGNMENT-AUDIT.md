# Assignment audit and delivery plan

## Inspected evidence

Read the supplied Assignment-4 HTML and the separate project request on 10 October 2026. The HTML is assignment evidence; its scripts were not executed. The original workspace was empty, with no Git metadata, remotes, source, README, dependencies or tests. No existing changes needed preservation. No repository-specific instructions were found in the workspace or ancestor directories.

Local foundation now exists on feature/project-foundation. No commits, remote repository, issues, PRs, reviews, merges or deployments exist from this work. Available runtimes: Node 26.8.1, npm 11.19.0, Git 2.52.0, Python 3.13. Secrets were not read or printed.

## Compliance checklist

| Requirement | Current state |
| --- | --- |
| React + Vite, JSX, reusable component structure | Foundation implemented; feature components pending |
| useState/useEffect, Fetch, React Router | Used in connection-status page and routing |
| Controlled inputs and validation | Pending feature work |
| Node + Express, REST, CORS, error handling | Foundation implemented; CRUD routes pending |
| MongoDB Atlas + Mongoose | Connection code implemented; Atlas connection unverified |
| Environment variables and .gitignore | Examples, validation and ignore rules implemented |
| Book add/view/update/delete/search | Planned; no feature implementation |
| Issue/return | Planned; Admin/Librarian manages both per assignment |
| Register/login and Admin/User authorization | Planned; no protected feature routes yet |
| README required sections | Draft present; actual identities/screenshots/URLs pending |
| Branches + reviewed PR workflow | Local feature branch only; remote workflow pending |
| At least two meaningful merged PRs per member | Pending genuine collaboration |
| Repository, Vercel frontend, backend submission URLs | Pending |

The assignment permits generated CSS but does not state a mandatory development-tool disclosure requirement. No submission was performed. Search fields, password security and inventory consistency are additional explicit project-request requirements.

## Architecture and minimum scope

React pages → Fetch service → Express route → authentication/role middleware → controller → Mongoose model → Atlas. Responses update React state; controlled forms collect validated input. Browser role checks control visible actions; backend middleware enforces permissions.

Minimum scope: authentication; book catalog/search/details; Admin book CRUD; Admin issue/return; own loan listing for users; validation and loading/error/empty states. No fines, reservations, email, analytics or extra infrastructure.

See API-CONTRACT.md for route contracts and inventory invariants, and ISSUE-ROADMAP.md for GitHub-ready descriptions with scope, dependencies, acceptance criteria, testing and completion criteria. Those are proposed issues, not remote resources.

## Responsibilities and deadline order

Deadline: 12 October 2026, 9:00 AM, Asia/Kolkata. Work backwards from that time; reserve the final hours for verification, not new scope.

- 10 October: lead creates remote repository and issues, all four review API contract; Anshu handles foundation and integration planning; Harsh works on authentication, Dhruv on the Book API, and Kiran on frontend auth/form structure against agreed contracts (proposed ownership).
- 11 October morning: Dhruv builds catalog/search; Kiran builds login and Admin CRUD forms. Review and merge completed PRs promptly.
- 11 October afternoon: Harsh implements transactional borrowing API; Kiran integrates borrowing forms and tests; Dhruv verifies catalog/API integration. Each of the four members needs at least two meaningful merged PRs; track progress without crediting unmerged work.
- 11 October evening: deploy, verify real Atlas and deployed flows, add screenshots and final README links. Fix defects in focused PRs.
- 12 October before 9:00 AM: validate submission URLs, contribution history and team details; submit with buffer.

Blockers: all four roll numbers, remote repository authorization/setup, Atlas credentials configured privately, hosting access, contributor availability, and review/implementation of remaining features. No credentials are needed in chat: configure ignored local .env and hosting settings.

## Testing and submission gates

Foundation: npm test; npm run build; startup must fail safely without required environment variables; .env paths must be ignored. See VERIFICATION.md for actual results.

Feature gates: CRUD success/failure; invalid IDs/fields; duplicate ISBN; authentication and role escalation; empty search; API loading/error states; issue last available copy; concurrent issues and returns; duplicate return; rollback; total-copy edits/deletion during active loans; user ownership isolation. Run borrowing tests on Atlas or a replica set, not a standalone database.

Deployment gates: frontend/backend integration with real Atlas; production CORS; HTTPS API URL; direct React route reload; Admin/User flows; credentials absent from tracked files and logs. Capture actual screenshots and verification evidence.

Submission: team name; project name; lead and member names/roll numbers; verified repository/backend/Vercel URLs; two meaningful merged PRs per person; complete README. Never claim deployment or merges without evidence.

## Evaluation preparation

Explain React state as the current UI data, effects as synchronization with the API, routes as page selection, middleware as the permission gate, models as database validation, and transactions as keeping loan/stock updates together. During review, inspect both successful behavior and backend rejection cases. An evaluator may ask why hiding a button is insufficient, how duplicate returns are prevented, why environment secrets stay off the frontend, and how each team member contributed.

## Team update history

Harsh Surana (Harshsurana-hub), Dhruv Tomar (dhruvtomar2006-debug), and Kiran Sinha (KiranSinha872) are the three team members supplied by the user. This initially superseded the two-person plan; the subsequent lead clarification below establishes four members. Roll numbers remain pending. The revised issue ownership is proposed only; no GitHub assignments or messages were sent.

Anshu Raj Bisoyi (anshurajbisoyi98-ctrl) subsequently confirmed that he is the team lead. The team therefore has four members: Anshu, Harsh, Dhruv and Kiran. Anshu owns repository maintenance, foundation, integration/testing and submission coordination; the three contributors retain their proposed feature pairs. Minimum contribution target: eight meaningful merged PRs, at least two per person. All roll numbers remain pending. No remote assignments or messages were sent.

## Expanded contribution target

The team lead requested four issues per member that can each become a meaningful merged PR. ISSUE-ROADMAP.md now contains sixteen proposed issues: Anshu 1/14/15/16; Harsh 2/4/9/10; Dhruv 3/6/8/12; Kiran 5/7/11/13. This is a team target beyond the assignment minimum of two meaningful merged PRs per member. No remote issues or PRs have been created. The deadline and feature scope are unchanged.

## Publication update

The team lead authorized publishing to anshurajbisoyi98-ctrl/hospitalmanagemntproject. Sixteen issues were created and an empty main baseline established for PR review; the foundation is on feature/project-foundation. Four lead issues are assigned; the twelve contributor assignments await collaborator access. Prior statements of no remote resources describe the earlier audit state. Atlas connectivity was subsequently verified locally; feature integration and production deployments remain pending.


## Verified repository status — 11 October 2026

This status supersedes earlier planning snapshots in this file. The remote repository is \`anshurajbisoyi98-ctrl/hospitalmanagemntproject\`, with \`main\` as the default branch. It contains the four-person implementation and merged feature work. The pull-request CI check is passing for the current main baseline.

### Contribution audit

Count only merged, student-authored feature or foundation PRs. PR #31 was authored by Copilot and is excluded. PR #32 and #33 are open and are not counted until merged.

| Member | GitHub | Merged PRs audited | Count / target |
| --- | --- | --- | --- |
| Anshu Raj Bisoyi (lead) | \`anshurajbisoyi98-ctrl\` | #17 foundation, #19 API integration tests | 2 / 4 |
| Harsh Surana | \`Harshsurana-hub\` | #20 auth API, #21 auth middleware, #22 issue API, #24 return API | 4 / 4 |
| Dhruv Tomar | \`dhruvtomar2006-debug\` | #26 catalog search UI, #27 book model/read API, #28 book mutations, #29 search API | 4 / 4 |
| Kiran Sinha | \`KiranSinha872\` | #18 auth UI, #23 catalog/detail UI, #25 librarian forms, #30 borrowing UI | 4 / 4 |

Anshu's two additional PRs (#32 test coverage and #33 deployment configuration) are pending review and must not be credited until they are merged. Roll numbers for all four members remain unknown and must be added by the team.

### Remaining submission evidence

- PR #32 adds Mongo-backed auth/catalog regression tests and catalog UI tests. CI passed on its latest head. It addresses issue #14; the issue remains open until the PR is merged.
- PR #33 adds Vercel/Render configuration and deployment instructions. CI passed. No deployment or production URL has been verified, so issue #16 remains open.
- Issue #15 still needs deployed Admin/User browser workflows, deep-link reloads, responsive checks, and current screenshots. Existing feature screenshots are stored under \`docs/screenshots/issue-7\`, \`issue-11\`, and \`issue-13\`; they are not evidence of the current deployed release.
- The deployment URLs and provider-side Atlas/CORS checks remain pending. Keep credentials in provider environment settings and ignored local \`.env\` files only.

The repository changes are reviewable, but the submission is not deployment-verified until the missing hosting details and fresh live evidence are recorded.
