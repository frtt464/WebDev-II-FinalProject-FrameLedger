# FrameLedger

**Course:** INFO 251 — Web Development II | Spring 2026
**Team:** LOEUNG Soxavin, LACH Sovitou
**Group size note:** This project was completed as a group of 2.

---

## What Is FrameLedger?

FrameLedger is a personal cinema tracking web application. Users can search for films by title, browse movies by genre and rating, view full movie details including trailers and audience reviews, and maintain a personal watchlist with statuses, personal notes, and a 1–5 star personal rating system.

---

## Project Requirements Compliance

This section maps every requirement from the INFO 251 Final Project Guidelines directly to the code that satisfies it.

---

### 1. Frontend Web Application

---

#### ✅ Complete HTML Structure with Semantic Elements

The project uses three HTML pages. All three consistently use proper HTML5 semantic elements:

| Element | Pages Used | Purpose |
|---|---|---|
| `<nav>` | All 3 pages | Top navigation bar and footer links |
| `<header>` | `index.html`, `watchlist.html` | Page hero / title area |
| `<main>` | `movie.html` | Primary content wrapper |
| `<section>` | All 3 pages | Search, results, stats, trailer, similar films, reviews, watchlist |
| `<footer>` | All 3 pages | Site-wide footer with branding and navigation |
| `<form>` | `movie.html`, `watchlist.html` | Add-to-watchlist and inline edit forms |

---

#### ✅ Vanilla JavaScript — No Frameworks

Zero use of React, Vue, Angular, jQuery, or any JS framework or library. Every DOM element is created, updated, and removed using native browser APIs only.

The project is split into 8 hand-written `.js` files, each with a single responsibility:

| File | Responsibility |
|---|---|
| `config.js` | Single source of truth for API keys and base URLs |
| `tmdb.js` | All TMDB API calls, private `request()` wrapper |
| `watchlist.js` | All MockAPI CRUD operations (GET, POST, PUT, DELETE) |
| `ui.js` | Shared utilities: Toast, Spinner, card builder, form validation, escapeHtml |
| `search.js` | Home page search, debouncing, history chips, pagination |
| `discover.js` | Discover mode: genre/rating filters, Surprise Me, mode switching |
| `movie.js` | Movie detail page: parallel fetch, trailer, reviews, watchlist form |
| `watchlist-page.js` | Watchlist: sort, filter, inline edit, delete, stats, star rating picker |

---

#### ⚠️ External CSS and JavaScript Files — Note on Inline Styles

All styles live in `css/style.css`. All scripts are loaded via external `<script src="...">` tags at the bottom of each HTML file. There are no `<style>` blocks or `<script>` blocks embedded in any HTML file.

Some `style="..."` attributes exist in the HTML. Most are **functional visibility toggles** (`display:none`) that JavaScript overrides at runtime — these are initial hidden states, not design styles. A small number of residual one-off layout values (e.g. `margin-bottom:2rem` on the back button, `padding-bottom:2rem` on the watchlist header) remain from development. These are a minor gap and ideally belong in `style.css`. The progress bar segment `width:0%` initial values are standard practice for CSS-animated bars.

---

### 2. API Integration

---

#### ✅ Integration with a Public API

The primary data source is **TMDB (The Movie Database)** — a free, publicly available REST API providing movie search, details, trailers, similar films, genre lists, and audience reviews.

**MockAPI** provides the persistence layer — a live REST endpoint that behaves like a real backend database, storing watchlist entries as JSON. This makes demonstrating POST, PUT, and DELETE possible without building a server.

---

#### ✅ API Requests Using `fetch()`

Every API call uses the native `fetch()` function. In `tmdb.js`, a private `request()` function handles URL construction, API key injection, status checking, and JSON parsing for all TMDB calls. In `watchlist.js`, each CRUD method calls `fetch()` directly with the correct HTTP method, headers, and body.

---

#### ✅ All Four HTTP Methods: GET, POST, PUT, DELETE

All four methods are implemented in `js/watchlist.js` against the live MockAPI endpoint:

```
GET    /watchlist        getAll()      loads all watchlist entries on page open
GET    /watchlist/:id    getById()     fetches one entry by ID
POST   /watchlist        add()         saves a new film to the watchlist
PUT    /watchlist/:id    update()      edits status, note, or personal star rating
DELETE /watchlist/:id    remove()      permanently removes an entry
```

**Demo flow showing all four methods:**
1. Open Watchlist page → **GET** fires automatically
2. Add a film from the detail page → **POST**
3. Click ✏️ edit on any entry, change status, Save → **PUT**
4. Click 🗑 delete, confirm in modal → **DELETE**

---

#### ✅ TMDB Endpoints Used

| Method | Endpoint | Function in `tmdb.js` | Used In |
|---|---|---|---|
| GET | `/search/movie` | `searchMovies()` | `search.js` |
| GET | `/movie/:id` | `getMovieDetails()` | `movie.js` |
| GET | `/movie/:id/videos` | `getMovieVideos()` | `movie.js` |
| GET | `/movie/:id/similar` | `getSimilarMovies()` | `movie.js` |
| GET | `/movie/:id/reviews` | `getMovieReviews()` | `movie.js` |
| GET | `/discover/movie` | `discoverMovies()` | `discover.js` |
| GET | `/genre/movie/list` | `getGenres()` | `discover.js` |

---

#### ✅ Data Displayed in an Organised, User-Friendly Format

- **Search results** — responsive card grid: poster, title, release year, TMDB rating
- **Movie detail** — poster, blurred backdrop, title, tagline, runtime, language, genres, full overview
- **Trailer** — embedded YouTube player (`youtube-nocookie.com`), prefers "Trailer" over "Teaser"
- **Similar films** — up to 8 related titles, each linking to their own detail page
- **Audience reviews** — up to 3 real TMDB reviews: avatar initial, author, date, star rating, 300-char excerpt with Read more/less toggle
- **Watchlist list** — poster thumbnail, colour-coded status badge, release year, TMDB rating labelled "TMDB ★", personal star rating labelled "Your rating", note in italic

---

#### ✅ Error Handling for API Failures

Every `fetch()` call is wrapped in `try/catch`. On failure the app:
- Shows a descriptive inline error state (icon + message) in the content area
- Displays a toast notification in the bottom-right corner with the specific error
- Never breaks, crashes, or leaves a blank/frozen page

Examples:
- `search.js` — "Could not reach the server. Please try again."
- `movie.js` — full error fallback page with a return link if any of the 4 parallel requests fail
- `watchlist-page.js` — separate catches for load, edit, and delete failures, each with their own message
- `watchlist.js` — every CRUD method throws a descriptive error including the HTTP status code

---

### 3. Interactive Features

---

#### ✅ User Input Forms with Client-Side Validation

**Search form** (`search.js`):
- Validates query is not empty before firing any request
- Error message: *"Please enter a film title to search."*
- Input gets an `error` CSS class (red border); clears as the user types

**Add to Watchlist form** (`movie.js`):
- Status dropdown always has a valid value (no empty option)
- Note field: optional, validated to ≤ 200 characters if provided
- Live character counter: `42 / 200`, turns red above 180
- `isSubmitting` flag prevents duplicate POSTs from rapid clicks

**Inline edit form** (`watchlist-page.js`):
- Note field validated to ≤ 200 characters on each save attempt
- Per-entry live character counter
- `isSaving` flag prevents duplicate PUTs

The reusable `Validate` object in `ui.js` (`required()`, `maxLength()`, `showError()`, `clearError()`, `clearAll()`) is used consistently across all three forms.

---

#### ✅ Dynamic Content Updates Without Page Refresh

Nothing triggers a page reload during normal use:

- **Search results** — rendered into `#movieGrid` via `appendChild()` after each API response
- **Watchlist entries** — after POST/PUT/DELETE, the in-memory `allEntries` array is updated and `renderList()` rebuilds the DOM
- **Stats and progress bar** — recalculate and re-render after every edit/delete
- **Filter tabs / sort dropdown** — filter and sort the in-memory array, re-render instantly with no fetch
- **Mode toggle** — shows/hides Search and Discover panes via `style.display`
- **Inline edit forms** — open/close by toggling a CSS class on the item element
- **Star picker** — hover and click states update in real time via `classList.toggle`

---

#### ✅ Event-Driven Functionality

| Event | Where | What It Does |
|---|---|---|
| `submit` | Search form, Add to Watchlist form | Fires search or POST immediately |
| `input` | Search input, note fields | Debounced live search; char counter; clear button visibility |
| `click` | Cards, filter tabs, edit/delete/save/cancel buttons, modal buttons, star buttons | Navigation, filtering, editing, deleting, rating, confirming |
| `change` | Sort dropdown | Re-sorts and re-renders the watchlist |
| `focus` | Search input | Reveals recent search history chips |
| `keydown` | Search input, note inputs, `document` | `/` focuses search; Escape clears input or closes edit form or modal |
| `mouseenter` / `mouseleave` | Star rating buttons | Hover highlight fills stars up to hovered position; clears on leave |
| `DOMContentLoaded` | `ui.js` | Sets active nav highlight on page load |

---

### 4. Advanced JavaScript Implementation

---

#### ✅ Modern ES6+ Features

Every `.js` file uses ES6+ exclusively. There is no `var` anywhere in the codebase.

| Feature | Example from the code |
|---|---|
| `const` / `let` | Every variable — no `var` |
| Arrow functions | `entries.filter((e) => e.status === 'Completed')` |
| Template literals | All dynamic HTML: `` `<span class="${cls}">${title}</span>` `` |
| Object destructuring | `const { TMDB_API_KEY, TMDB_BASE_URL } = CONFIG;` in `tmdb.js` |
| Array destructuring | `const [movie, videos, similar, reviews] = await Promise.all([...])` |
| Spread (array copy) | `const sorted = [...entries]` — avoids mutating original |
| Spread (object merge) | `allEntries[idx] = { ...allEntries[idx], ...updated }` |
| Default parameters | `const request = async (endpoint, params = {})` |
| `async` / `await` | All API calls throughout every file |
| `Promise.all()` | 4 TMDB requests fired simultaneously in `movie.js` |
| IIFE module pattern | `const TMDB = (() => { ... })()` — keeps internals private |
| `Array.filter()` | Watchlist filtering, review filtering, history deduplication |
| `Array.map()` | Building star spans, populating option elements |
| `Array.find()` | Duplicate detection in `findByTmdbId()` |
| `Array.sort()` | All four watchlist sort modes |
| `URL` API | Safe URL construction in `tmdb.js` `request()` |
| `URLSearchParams` | `getParam()` utility in `ui.js` |
| `localStorage` | Search history: persists across loads, deduplicates case-insensitively |
| `history.replaceState` | Updates URL with `?q=` after search without navigation |

---

#### ✅ DOM Manipulation and Dynamic Element Creation

No data-driven HTML is hardcoded. Every visible piece of content is built in JavaScript:

- **`buildMovieCard()`** in `ui.js` — creates `<a>` card elements from TMDB movie data; used by both Search and Discover modes
- **`buildItem()`** in `watchlist-page.js` — creates complete watchlist row elements including the edit form, star picker, char counter, and all event listeners, before the item is added to the DOM
- **`buildStarDisplay()`** in `watchlist-page.js` — creates five `<span>` stars with filled/empty state from an integer rating
- **`renderReviews()`** in `movie.js` — creates review cards with avatar initial, author, date, star rating, truncated body, and expand/collapse toggle
- **`showSkeleton()`** in `watchlist-page.js` — creates animated shimmer placeholder rows for immediate loading feedback
- **`Toast.show()`** in `ui.js` — dynamically creates, inserts, and auto-removes notification elements with fade animation

---

#### ✅ Asynchronous Programming

All API communication uses `async`/`await` on top of `fetch()`.

**`Promise.all()` for parallel fetching** in `movie.js`:
```javascript
const [movie, videos, similar, reviews] = await Promise.all([
  TMDB.getMovieDetails(movieId),
  TMDB.getMovieVideos(movieId),
  TMDB.getSimilarMovies(movieId),
  TMDB.getMovieReviews(movieId),
]);
```
All four requests start simultaneously. This reduces the detail page load time from ~1200ms (sequential) to ~300ms (parallel).

**Debouncing** in `search.js`:
```javascript
clearTimeout(debounceTimer);
debounceTimer = setTimeout(() => {
  doSearch(currentQuery, currentPage);
}, 400);
```
Each keystroke cancels the previous timer. A request only fires when the user pauses for 400ms. Reduces API calls from ~10 per word typed to 1 per completed word.

---

#### ✅ Proper Error Handling and Debugging

**`try/catch/finally`** — every `async` function is wrapped. `finally` always resets UI state (re-enables buttons, restores button text) even on failure, so the UI never gets stuck in a loading state.

**Double-submit guards** — `isSubmitting`, `isSaving`, and `isDeleting` flags prevent race conditions from rapid clicks:
```javascript
if (isSaving) return;
isSaving = true;
saveBtn.disabled = true;
// ... await API call ...
// finally: isSaving = false; saveBtn.disabled = false;
```

**XSS protection** — `escapeHtml()` in `ui.js` sanitises every piece of API-provided or user-provided text before insertion into `innerHTML`. Prevents malicious content in movie titles, review text, or user notes from executing as HTML or JavaScript.

**Descriptive error messages** — every thrown error includes the HTTP status code (`"Failed to add entry (422)"`) for immediate diagnosability.

---

## Technical Architecture

```
frameledger/
├── index.html                  Home page: Search + Discover modes
├── css/
│   └── style.css               All styles — dark cinema / film noir theme
│                               Responsive breakpoints at 768px and 480px
├── js/
│   ├── config.js               API credentials — single source of truth
│   ├── tmdb.js                 TMDB module — IIFE, private request wrapper
│   ├── watchlist.js            MockAPI module — full GET/POST/PUT/DELETE
│   ├── ui.js                   Shared: Toast, Spinner, card builder, Validate
│   ├── search.js               Search, debounce, history, pagination
│   ├── discover.js             Discover filters, Surprise Me, mode control
│   ├── movie.js                Detail page — Promise.all, trailer, reviews
│   └── watchlist-page.js       Watchlist UI — filter, sort, edit, delete
└── pages/
    ├── movie.html              Movie detail page
    └── watchlist.html          Watchlist management page
```

**Script load order (consistent across all pages):**
```
config.js → tmdb.js → watchlist.js → ui.js → [page-specific script]
```
Each file depends on everything before it. `config.js` must be first because all other modules read from `CONFIG`. `ui.js` must precede page scripts because they call `escapeHtml`, `buildMovieCard`, `Toast`, `Validate`, etc.

---

## APIs

### TMDB — The Movie Database
- **Base URL:** `https://api.themoviedb.org/3`
- **Auth:** API key as `?api_key=` query parameter
- **Docs:** https://developer.themoviedb.org

### MockAPI (Persistence Layer)
- **Base URL:** `https://69beacb317c3d7d97792ae6c.mockapi.io`
- **Auth:** None — public REST endpoint
- **Docs:** https://mockapi.io

### Watchlist Entry Schema (MockAPI)

```json
{
  "id":          "auto-generated",
  "tmdbId":      "550",
  "title":       "Fight Club",
  "posterPath":  "/pB8BM7pdSp6B6Ih7QZ4DrQ3PmJK.jpg",
  "releaseYear": "1999",
  "rating":      "8.4",
  "status":      "Completed",
  "note":        "Rewatch every year.",
  "userRating":  5,
  "addedAt":     "2026-03-21T10:30:00.000Z"
}
```

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

## Presentation Demo Script

Covers all 4 HTTP methods and key features in under 2 minutes:

1. **Type a film title** — results appear live *(TMDB GET, debounce)*
2. **Click a movie card** — detail page loads with trailer, similar films, reviews *(4× TMDB GET in parallel via Promise.all)*
3. **Add to Watchlist** — select status, write a note, click Add *(MockAPI POST)*
4. **Open Watchlist page** — film appears, stats show counts *(MockAPI GET)*
5. **Click ✏️ edit** — change status to Completed, give it 5 stars, Save *(MockAPI PUT)*
6. **Click 🗑 delete** — confirm in modal, film disappears, stats update *(MockAPI DELETE)*
7. **Switch to Discover** — pick a genre, try Surprise Me *(TMDB GET — genre + discover endpoints)*

---

## Challenges and Solutions

**Safari blocking fetch() on local files** — Opening from the filesystem caused all API calls to silently fail. Solution: always run via `python3 -m http.server`.

**Star picker not responding to clicks** — Event listeners were attached using `document.getElementById()` on a detached DOM element (one not yet inserted into the document), which returned `null`. Solution: switched to `item.querySelector()` which searches within the detached element itself.

**`getParam is not defined` crashing search and discover** — A duplicate `const cls` declaration in `ui.js` caused a syntax error that stopped the file from loading, meaning `getParam` was never defined. Solution: removed the duplicate declaration.

**Search and Discover sharing pagination buttons** — Both modes need prev/next controls but the buttons are shared. Solution: `discover.js` takes ownership via `.onclick` when in Discover mode and releases them (`onclick = null`) when switching back, leaving the `addEventListener` handlers from `search.js` intact.

---

## Team Contributions

| Feature | Developer |
|---|---|
| *(Fill in before submission)* | Vin |
| *(Fill in before submission)* | Tou |

---

## Academic Integrity

All code was written by Vin and Tou. External references consulted: MDN Web Docs, TMDB API documentation, MockAPI documentation — for reference only. This project uses the TMDB API but is not endorsed or certified by TMDB.
