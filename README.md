# Portfolio frontend (+ Admin Panel)

```
frontend/
├── index.html            public site
├── css/style.css
├── js/
│   ├── config.js         <-- API_BASE: where your backend runs
│   ├── api.js            backend client
│   ├── render.js         builds every section from the API (falls back to the static HTML if the API is down/empty)
│   ├── main.js           contact form, resume viewer, loading
│   ├── ui.js · background.js · projects.js   animations, smooth scroll, stacked cards, Full Deck gallery
├── admin/                <-- Admin Panel  (open /admin/)
│   ├── index.html · admin.css · admin.js
└── assets/images/
```

## Connect to the backend
1. Start the backend (see its README): `npm install`, `npm run seed`, `npm run dev` (default http://localhost:5000).
2. Set `API_BASE` in `js/config.js` (e.g. `http://localhost:5000`, or your deployed API URL).
3. Serve this folder with any static server, e.g. `npx serve .` (port 3000) or VS Code Live Server (5500).
   In production, `FRONTEND_URL` in the backend `.env` must be the exact origin of this site.
4. Open `/admin/`, log in with `ADMIN_USERNAME` / `ADMIN_PASSWORD` from the backend `.env`.
   First time: **Settings -> Add sample content**, then edit everything.

## What the Admin Panel controls
| Tab | Add / update / delete |
|---|---|
| Hero section | name, title, intro text, running (typing) skills under the name, hero chips, scrolling marquee words |
| About section | profile picture (upload / replace / delete), About text, About tags (separate from Hero) |
| Skills | skills with categories (e.g. Programming -> C++, Python) |
| Projects | title, description, details, technologies used, GitHub URL, live site URL, up to 50 pictures |
| Education | degree, institution, location, grade, dates, description |
| Certifications | title, provider, date, description, certificate URL |
| Contact | email, phone, GitHub, LinkedIn (+ location, X/Twitter, website) |
| Resume | upload / replace / delete (visitors view it in a PDF viewer, then press Download) |
| Settings | backend URL, change password, sample content |

## Notes
- Email in the contact section opens **Gmail compose** (not the mail app). The contact form sends through the backend
  to the Email saved in the Contact tab, with the sender's name in the From name and subject.
- Empty database or backend offline -> the site shows its built-in static content instead of a blank page.
- Use a PDF for the resume (DOC/DOCX can only be downloaded, not previewed).
