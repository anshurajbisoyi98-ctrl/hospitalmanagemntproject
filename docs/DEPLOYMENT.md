# Deployment and submission checklist

This repository includes deployment configuration for Vercel (React/Vite) and Render (Express API). No provider account, Atlas credential, or production URL is stored in Git.

## Vercel frontend

Create a Vercel project from this repository using the repository root as the project root. The root \`vercel.json\` installs workspace dependencies, runs the frontend production build, publishes \`frontend/dist\`, and rewrites client-side routes to \`index.html\`.

Set the build-time environment variable \`VITE_API_URL\` to the deployed API origin plus \`/api\`, for example \`https://<render-service>.onrender.com/api\`. This URL is public configuration; never put secrets in a \`VITE_*\` variable.

## Render API

Create a Render Blueprint from \`render.yaml\`. Supply \`MONGO_URI\`, a unique \`JWT_SECRET\` (at least 32 characters), and \`FRONTEND_URL\` for the deployed Vercel origin. The service uses \`/api/health\` as its health check and listens on Render's provided \`PORT\`.

For Atlas, use a dedicated least-privilege database user, allow the API host to connect, and use a dedicated database. Do not commit environment files or credentials. The API must connect to MongoDB before it starts listening.

## Release verification still required

After provider credentials and production URLs are available:

- Confirm Vercel and Render builds finish successfully and record their actual URLs.
- Confirm Atlas connection and \`GET /api/health\` returns HTTP 200.
- Verify the configured frontend origin is allowed by API CORS.
- Exercise register, login, logout, Admin/User access, book CRUD/search, borrow and return flows through the deployed browser.
- Reload direct links such as \`/books\`, \`/admin/loans\`, and \`/my-loans\`; check loading, empty, error, and narrow-screen views.
- Capture fresh screenshots from the deployed build. Existing screenshots under \`docs/screenshots\` are contribution evidence for earlier feature work and are not claimed as screenshots of this release.
- Add the team members' verified roll numbers and deployed URLs to the submission README after confirming them.

These provider-side checks cannot be represented as complete until the deployments exist and the deployed flows are exercised.
