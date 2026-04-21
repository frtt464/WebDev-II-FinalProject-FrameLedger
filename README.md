# FrameLedger

**Course:** INFO 251 — Web Development II | Spring 2026  
**Team:** LOEUNG Soxavin, LACH Sovitou  
**Group size:** 2 members  
**Repository:** https://github.com/Soxavin/WebDev-II-FinalProject-FrameLedger

---

## What is it?

FrameLedger is a film tracking app we built from scratch. You can search for any movie, browse by genre and rating, pull up a full detail page with the trailer and reviews, and keep a personal watchlist where you can set a status, leave notes, and give it your own star rating.

The whole thing runs in the browser: no backend, no frameworks, just HTML, CSS, and vanilla JavaScript talking to two external APIs (TMDB and MockAPI).

---

## Tech Stack

- **Languages:** HTML5, CSS3, JavaScript (ES6+) (no frameworks, no build tools)
- **APIs:** TMDB for movie data, MockAPI for watchlist persistence
- **Browser APIs used:** `fetch`, `localStorage`, `URL`, `URLSearchParams`, `history.replaceState`, `Promise.all`
- Runs entirely in the browser : static files, no server required beyond a simple local file server

---

## Pages

**Home (`index.html`)** : two modes in one page. Search mode does a live debounced search against TMDB as you type, keeps your last 5 searches in localStorage, and lets you page through results. Discover mode lets you filter by genre and minimum rating, sort however you want, or just hit Surprise Me and see what comes up.

**Movie detail (`pages/movie.html`)** : pulls the poster, backdrop, title, tagline, runtime, genres, and overview, then fires off 3 more requests in parallel for the trailer, similar films, and audience reviews. All four TMDB calls happen at the same time via `Promise.all`, so the page loads fast. If a movie is already in your watchlist it tells you; otherwise you can add it with a status and an optional note.

**Watchlist (`pages/watchlist.html`)** : shows everything you've saved with a stats bar at the top (total, want to watch, watching, completed). You can filter by status, sort four different ways, inline-edit any entry, and delete with a confirmation modal. Stats and counts update immediately after every change without touching the server again.

---

## How it's structured

We split the JavaScript into 8 files so each one has one job:

| File | What it does |
|---|---|
| `config.js` | API keys and base URLs : one place to change them |
| `tmdb.js` | All TMDB requests, wrapped in a private `request()` function |
| `watchlist.js` | MockAPI CRUD : GET, POST, PUT, DELETE |
| `ui.js` | Shared stuff: Toast notifications, Spinner, card builder, form validation, `escapeHtml` |
| `search.js` | Home page search, debounce, history chips, pagination |
| `discover.js` | Genre/rating filters, Surprise Me, mode switching |
| `movie.js` | Detail page : parallel fetch, trailer, reviews, watchlist form |
| `watchlist-page.js` | Watchlist UI : filter, sort, inline edit, delete, stats, star picker |

They load in this order on every page: `config.js → tmdb.js → watchlist.js → ui.js → [page script]`. Each file depends on everything before it, so the order matters.

```
frameledger/
├── index.html
├── css/
│   └── style.css
├── js/
│   ├── config.js
│   ├── tmdb.js
│   ├── watchlist.js
│   ├── ui.js
│   ├── search.js
│   ├── discover.js
│   ├── movie.js
│   └── watchlist-page.js
└── pages/
    ├── movie.html
    └── watchlist.html
```

---

## APIs

**TMDB** is the main data source; movie search, details, trailers, similar films, genre lists, and reviews. Free public REST API.

- Base URL: `https://api.themoviedb.org/3`
- Auth: `?api_key=` query param
- Docs: https://developer.themoviedb.org

**MockAPI** is the persistence layer. It gives us a live REST endpoint that works like a real database so we can actually demo POST, PUT, and DELETE without building a server.

- Base URL: `https://69beacb317c3d7d97792ae6c.mockapi.io`
- No auth required
- Docs: https://mockapi.io

Each watchlist entry looks like this:

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

TMDB endpoints we use:

| Endpoint | Function | Used in |
|---|---|---|
| `/search/movie` | `searchMovies()` | `search.js` |
| `/movie/:id` | `getMovieDetails()` | `movie.js` |
| `/movie/:id/videos` | `getMovieVideos()` | `movie.js` |
| `/movie/:id/similar` | `getSimilarMovies()` | `movie.js` |
| `/movie/:id/reviews` | `getMovieReviews()` | `movie.js` |
| `/discover/movie` | `discoverMovies()` | `discover.js` |
| `/genre/movie/list` | `getGenres()` | `discover.js` |

---

## A few things worth noting

**Parallel fetching on the detail page.** Instead of chaining four awaits, we fire all four TMDB requests at the same time:

```javascript
const [movie, videos, similar, reviews] = await Promise.all([
  TMDB.getMovieDetails(movieId),
  TMDB.getMovieVideos(movieId),
  TMDB.getSimilarMovies(movieId),
  TMDB.getMovieReviews(movieId),
]);
```

Cuts load time from roughly 1200ms sequential down to around 300ms.

**Debouncing.** The search input doesn't fire a request on every keystroke, it waits for a 400ms pause. Keeps the API call count reasonable while the results still feel live.

**Double-submit guards.** `isSubmitting`, `isSaving`, and `isDeleting` flags make sure rapid clicks don't fire duplicate POST/PUT/DELETE requests.

**XSS protection.** Everything from the API or from user input gets passed through `escapeHtml()` before going into `innerHTML`. Movie titles and review text from TMDB can contain arbitrary characters.

**Error handling.** Every `fetch()` is in a `try/catch/finally`. The `finally` block always resets the UI (re-enables buttons, clears loading states) so nothing gets stuck. Failed requests show an inline error message and a toast, the page never just goes blank.

---

## Setup

### 1. Add your API keys

Open `js/config.js` and fill in:

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

### 2. Serve it locally

Don't open the HTML files directly in the browser; Safari and some others block `fetch()` on local file paths. Use a local server instead:

```bash
python3 -m http.server 8080
```

Then open `http://localhost:8080`. In VS Code you can also right-click `index.html` → Open with Live Server.

---

## Demo flow

This hits all four HTTP methods in about two minutes:

1. Search for a film: results load live as you type *(TMDB GET)*
2. Click a card: detail page loads with trailer, similar films, reviews *(4 TMDB GETs in parallel)*
3. Add to Watchlist: pick a status, write a note, submit *(MockAPI POST)*
4. Open Watchlist: your entry shows up, stats update *(MockAPI GET)*
5. Hit edit: change status to Completed, give it 5 stars, save *(MockAPI PUT)*
6. Delete it: confirm in the modal, gone, stats drop *(MockAPI DELETE)*
7. Switch to Discover: filter by genre, try Surprise Me *(TMDB GET)*

---

## Things we ran into

**Safari blocking fetch on local files.** The first time we tested in Safari everything was broken, no errors in the console, just no data. Turned out Safari blocks fetch() when you open an HTML file directly from the filesystem. Running through a local server fixed it.

**Star picker clicks not registering.** We were attaching event listeners with `document.getElementById()` before the element had been added to the DOM, so it returned null and the listeners never attached. Switching to `item.querySelector()`, which searches within the element itself regardless of whether it's in the document yet, sorted it.

**`getParam is not defined` breaking both pages.** There was a duplicate `const cls` declaration in `ui.js` that caused a silent syntax error when the file loaded. Since `ui.js` never finished loading, `getParam` was never defined. It took a while to trace because the error message didn't mention `getParam` at all. Removing the duplicate fixed it.

**Search and Discover fighting over the pagination buttons.** Both modes use the same prev/next buttons but need different click handlers. We ended up having `discover.js` take ownership of the buttons with `.onclick` when you switch to Discover, then release them (`onclick = null`) when you switch back, leaving the `addEventListener` handlers from `search.js` intact underneath.

**Using AI to get unstuck.** A few times we genuinely had no idea what was going wrong; the code looked right, no obvious errors, and we'd been staring at it too long to see it clearly. In those cases we walked through the problem with Claude to help trace the issue. It was mostly useful for debugging things like the `getParam` crash and a couple of other logic bugs where a second pair of eyes helped more than another hour of guessing.

---

## What we learned

Probably the biggest takeaway was how much splitting JS into separate files helps. When something broke, we didn't have to dig through hundreds of lines, each file had one job so we knew exactly where to look.

`Promise.all` took a bit to get comfortable with but it was worth it. The detail page would've felt slow if we'd loaded everything one after another.

Error handling is the kind of thing that's easy to skip and annoying to add later. Setting up `try/catch/finally` from the start meant we never had buttons stuck in a loading state or pages that just went blank.

If we had more time:

- Create 'User accounts' functionality; right now everyone's watchlist goes to the same MockAPI endpoint so nothing is actually private
- Some kind of fallback for when MockAPI goes down
- A proper watch history separate from the active watchlist
- Better mobile layout for the inline edit form
- Improved look and more responsive website
- Implement more unique and fun features that would be feasible to add for the website

---

## Team Contributions

| Developer | Contributions |
|---|---|
| LOEUNG Soxavin | Project architecture, TMDB API integration, shared UI utilities, home page (search + discover), movie detail page, CSS |
| LACH Sovitou | MockAPI CRUD integration, watchlist page, discover mode filters and Surprise Me feature |

---

## References

- MDN Web Docs - DOM APIs, `fetch`, `localStorage`, `Promise`
- TMDB API documentation - https://developer.themoviedb.org
- MockAPI documentation - https://mockapi.io/docs
- YouTube IFrame Player API - for the privacy-enhanced trailer embed (`youtube-nocookie.com`)

---

## A note on integrity

Everything here was written by us at our own discretion. We did use Claude a few times when we were genuinely stuck and couldn't figure out what was going wrong, mainly to help trace bugs and errors, not to mainly write code for us. We still made use of AI to help us with coding for parts where we were unable to proceed. For documentation we mostly used MDN, the TMDB docs, and MockAPI's docs. This project makes use of the TMDB API.
