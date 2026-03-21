# FrameLedger

**Course:** INFO 251 — Web Development II | Spring 2026</br>
**Team:** LOEUNG Soxavin, LACH Sovitou</br>
**Group size note:** This project was completed as a group of 2.

---

## What Is FrameLedger?

FrameLedger is a personal cinema tracking web application. Users can search for films by title, browse movies by genre and rating, view full movie details including trailers and audience reviews, and maintain a personal watchlist with statuses, personal notes, and a 1–5 star personal rating system.

---

## Feature Overview

### Home Page — Search Mode
- Debounced live search — results appear automatically after a 400ms typing pause
- Immediate search on Enter or Search button click
- Search history — last 5 searches in `localStorage`, shown as clickable chips on focus
- Clear button (✕) resets the input and results instantly
- Pagination — browse up to 500 pages; URL updates with `?q=` to preserve the query
- Keyboard shortcuts — `/` focuses search; Escape clears and blurs

### Home Page — Discover Mode
- Genre dropdown populated dynamically from TMDB's genre list
- Minimum rating filter: Any / 5+ / 6+ / 7+ / 8+ / 9+
- Sort by: Most Popular, Highest Rated, Newest First, Oldest First
- Surprise Me — random genre, random starting page (1–3)
- Auto-loads Most Popular films when switching to Discover with an empty grid

### Movie Detail Page
- Poster, blurred backdrop, title, tagline, runtime, language, genres, overview
- Official Trailer embed (YouTube, privacy-enhanced)
- Similar Films — up to 8 related titles
- Audience Reviews — up to 3, with expand/collapse for long reviews
- Add to Watchlist — status + note form with validation
- Duplicate detection — shows "✓ In Watchlist" if already saved
- Back button preserves the previous search query

### Watchlist Page
- Stats: Total Films, Want to Watch, Watching, Completed with animated progress bar
- Filter tabs: All / Want to Watch / Watching / Completed
- Sort: Recently Added, Oldest First, Title A–Z, Highest Rated
- Skeleton loader — 5 shimmer rows while data fetches
- Inline edit — status, personal 1–5 star rating, note; saves via PUT
- Delete with confirmation modal — title shown, multiple ways to close
- All stats and counts sync immediately after every edit/delete

---

## Setup Instructions

### 1. Configure API keys

Open `js/config.js` and fill in your keys:
```javascript
const CONFIG = {
  TMDB_API_KEY:     'your_tmdb_api_key',
  TMDB_BASE_URL:    'https://api.themoviedb.org/3',
  TMDB_IMAGE_BASE:  'https://image.tmdb.org/t/p',
  MOCKAPI_BASE_URL: 'https://your-project.mockapi.io',
  MOCKAPI_RESOURCE: 'watchlist',
};
```
Get a free TMDB key at https://www.themoviedb.org/settings/api

### 2. Run a local server

Safari and some browsers block `fetch()` when opening HTML files directly from the filesystem. Always serve via a local server:

**Python (no install needed):**
```bash
cd frameledger
python3 -m http.server 8080
```
Open `http://localhost:8080`

**VS Code:** Right-click `index.html` → Open with Live Server

---

## Project Requirements Compliance

### 1. Frontend Web Application

| Requirement | How It's Met |
|---|---|
| Complete HTML with semantic elements | `<nav>`, `<header>`, `<main>`, `<section>`, `<footer>`, `<form>` used across all 3 pages |
| Vanilla JavaScript — no frameworks | Zero use of React, Vue, Angular, jQuery, or any library |
| External CSS and JS files only | All styles in `css/style.css`; all scripts loaded via `<script src="...">` tags; no inline `<style>` or `<script>` blocks |

The project is split into 8 JS files, each with a single responsibility:

| File | Responsibility |
|---|---|
| `config.js` | API keys and base URLs — single source of truth |
| `tmdb.js` | All TMDB API calls, private `request()` wrapper |
| `watchlist.js` | All MockAPI CRUD operations (GET, POST, PUT, DELETE) |
| `ui.js` | Shared utilities: Toast, Spinner, card builder, validation, escapeHtml |
| `search.js` | Home page search, debouncing, history chips, pagination |
| `discover.js` | Discover mode: genre/rating filters, Surprise Me, mode switching |
| `movie.js` | Movie detail page: parallel fetch, trailer, reviews, watchlist form |
| `watchlist-page.js` | Watchlist: sort, filter, inline edit, delete, stats, star rating |

---

### 2. API Integration

| Requirement | How It's Met |
|---|---|
| One public API | TMDB (The Movie Database) — movie data, images, trailers, reviews |
| All requests use `fetch()` | Every call in `tmdb.js` and `watchlist.js` uses native `fetch()` |
| GET, POST, PUT, DELETE | All four implemented in `watchlist.js` against MockAPI |
| Data displayed in organised format | Card grids, detail layouts, review cards, watchlist list view |
| Error handling for API failures | Every `fetch()` wrapped in `try/catch`; toast + inline error state on failure |

**MockAPI** serves as the persistence layer — a live REST endpoint that stores watchlist entries as JSON, making POST, PUT, and DELETE demonstrable without building a server.

**All four HTTP methods in `watchlist.js`:**

| Method | Endpoint | Function | Triggered By |
|---|---|---|---|
| GET | `/watchlist` | `getAll()` | Watchlist page load |
| GET | `/watchlist/:id` | `getById()` | Duplicate detection |
| POST | `/watchlist` | `add()` | "Add to Watchlist" button |
| PUT | `/watchlist/:id` | `update()` | Inline edit Save button |
| DELETE | `/watchlist/:id` | `remove()` | Delete confirmation modal |

**TMDB endpoints used:**

| Endpoint | Function | Used In |
|---|---|---|
| `/search/movie` | `searchMovies()` | `search.js` |
| `/movie/:id` | `getMovieDetails()` | `movie.js` |
| `/movie/:id/videos` | `getMovieVideos()` | `movie.js` |
| `/movie/:id/similar` | `getSimilarMovies()` | `movie.js` |
| `/movie/:id/reviews` | `getMovieReviews()` | `movie.js` |
| `/discover/movie` | `discoverMovies()` | `discover.js` |
| `/genre/movie/list` | `getGenres()` | `discover.js` |

---

### 3. Interactive Features

| Requirement | How It's Met |
|---|---|
| Forms with client-side validation | Search form, Add to Watchlist form, inline edit form — all validated via reusable `Validate` object in `ui.js` |
| Dynamic updates without page refresh | Search results, watchlist entries, stats, filters, and sort all update the DOM in place with no navigation |
| Event-driven functionality | `submit`, `input`, `click`, `change`, `focus`, `keydown`, `mouseenter/leave` events used throughout |

---

### 4. Advanced JavaScript

| Requirement | How It's Met |
|---|---|
| ES6+ features | `const`/`let` (no `var`), arrow functions, template literals, destructuring, spread, default params, `async`/`await`, `Promise.all()` |
| DOM manipulation and dynamic element creation | Every card, watchlist row, review card, star display, and toast is built in JavaScript from API data |
| Asynchronous programming | All API calls use `async`/`await`; `Promise.all()` fires 4 TMDB requests in parallel on the detail page; debouncing with `setTimeout`/`clearTimeout` in search |
| Error handling and debugging | `try/catch/finally` on every async function; double-submit guards (`isSubmitting`, `isSaving`, `isDeleting`); `escapeHtml()` for XSS protection |

---

## Technical Architecture

```
frameledger/
├── index.html                  Home page: Search + Discover modes
├── css/
│   └── style.css               All styles — dark cinema / film noir theme
├── js/
│   ├── config.js               API credentials
│   ├── tmdb.js                 TMDB module
│   ├── watchlist.js            MockAPI CRUD module
│   ├── ui.js                   Shared utilities
│   ├── search.js               Search logic
│   ├── discover.js             Discover logic
│   ├── movie.js                Movie detail logic
│   └── watchlist-page.js       Watchlist page logic
└── pages/
    ├── movie.html              Movie detail page
    └── watchlist.html          Watchlist page
```

**Script load order:**
```
config.js → tmdb.js → watchlist.js → ui.js → [page script]
```

---

## References and Acknowledgements

- [TMDB API](https://developer.themoviedb.org) — movie data, images, trailers, reviews
- [MockAPI](https://mockapi.io) — REST backend for watchlist persistence
- [MDN Web Docs](https://developer.mozilla.org) — JavaScript and Web API reference
- [Claude (Anthropic)](https://claude.ai) — AI assistant used throughout development for debugging, code review, architectural decisions, and README writing. All code was written and reviewed by the team. Claude was used as a development tool, not a replacement for understanding.
