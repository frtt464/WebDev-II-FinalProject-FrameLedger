// =============================================
//  ui.js — Shared UI Utilities
//
//  PURPOSE:
//  Contains reusable helper functions and objects
//  that are used across multiple pages. Loading
//  this file once makes these tools available
//  globally to search.js, movie.js, etc.
//
//  WHY SHARED?
//  Without this file, we'd duplicate code like
//  card-building and toast logic in every page's
//  script. Centralising it keeps things DRY
//  (Don't Repeat Yourself) and easier to maintain.
//
//  EXPORTS (global):
//  - Toast        — success/error notification system
//  - Spinner      — loading indicator helpers
//  - StateMessage — empty/error state renderer
//  - buildMovieCard — creates a movie card DOM element
//  - Validate     — form validation helpers
//  - statusBadge  — renders a coloured status pill
//  - escapeHtml   — XSS protection for user content
//  - truncate     — shortens strings with ellipsis
//  - getParam     — reads URL query parameters
//  - setActiveNav — highlights the current nav link
//
//  DEPENDS ON: config.js, tmdb.js (for posterUrl)
// =============================================


// =============================================
//  Toast — Notification System
//
//  Shows brief, auto-dismissing messages in the
//  bottom-right corner of the screen.
//
//  Usage:
//    Toast.success('Movie added!');
//    Toast.error('Could not connect.');
//    Toast.info('Tip: press / to search.');
// =============================================
const Toast = (() => {
  // The container div is created once and reused
  let container;

  const init = () => {
    container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
  };

  // Internal: creates and auto-removes a single toast
  const show = (message, type = 'default', duration = 3000) => {
    // Lazy-initialise the container on first use
    if (!container) init();

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    container.appendChild(toast);

    // After `duration` ms, fade out then remove from DOM
    setTimeout(() => {
      toast.style.animation = 'fadeOut 0.25s ease forwards';
      setTimeout(() => toast.remove(), 260);
    }, duration);
  };

  return {
    success: (msg) => show(msg, 'success'),
    error:   (msg) => show(msg, 'error', 4000), // errors stay longer
    info:    (msg) => show(msg, 'default'),
  };
})();


// =============================================
//  Spinner — Loading Indicator
//
//  Injects a CSS spinner + message into a
//  container element, replacing its contents.
//
//  Usage:
//    Spinner.show(gridEl, 'Searching...');
//    Spinner.hide(gridEl);
// =============================================
const Spinner = {
  show: (container, message = 'Loading...') => {
    container.innerHTML = `
      <div class="state-message">
        <div class="spinner"></div>
        <p>${message}</p>
      </div>`;
  },
  hide: (container) => {
    const el = container.querySelector('.state-message');
    if (el) el.remove();
  },
};


// =============================================
//  StateMessage — Empty / Error State
//
//  Renders a centred icon + message inside a
//  container. Used when there are no results,
//  or when an API call fails.
//
//  Usage:
//    StateMessage.show(gridEl, '🔍', 'No results found.');
// =============================================
const StateMessage = {
  show: (container, icon, message) => {
    container.innerHTML = `
      <div class="state-message">
        <div class="state-message__icon">${icon}</div>
        <p>${message}</p>
      </div>`;
  },
};


// =============================================
//  buildMovieCard() — Movie Card DOM Builder
//
//  Dynamically creates a clickable movie card
//  element from a TMDB movie object. Returns
//  an <a> element ready to be appended to a grid.
//
//  WHY DYNAMIC CREATION?
//  We don't know how many movies will be returned
//  by a search. Creating cards in JS lets us
//  generate as many as needed without hardcoding
//  HTML. This is a core DOM manipulation pattern.
//
//  @param {object} movie       — TMDB movie object
//  @param {string} linkPrefix  — path to movie.html
//                                (differs based on
//                                 which page we're on)
//  @returns {HTMLElement} <a> card element
// =============================================
const buildMovieCard = (movie, linkPrefix = 'pages/movie.html') => {
  // Build the poster image URL using the TMDB CDN helper
  // w342 is a good balance of quality vs file size for grid cards
  const posterPath = TMDB.posterUrl(movie.poster_path, 'w342');

  // Extract just the year from the full date string (e.g. '2023-07-15' → '2023')
  const year = movie.release_date
    ? movie.release_date.substring(0, 4)
    : '—';

  // Only show a rating if the film actually has votes
  // vote_average of 0.0 with no votes is meaningless data
  const rating = movie.vote_count > 0 && movie.vote_average != null
    ? movie.vote_average.toFixed(1)
    : '—';

  // Create the card as an anchor tag so the whole card is clickable
  // If there's a current search query in the URL, pass it along so
  // the back button on the detail page can restore results
  const card = document.createElement('a');
  card.className = 'movie-card';
  const currentQ = new URLSearchParams(window.location.search).get('q') || '';
  const qParam   = currentQ ? `&q=${encodeURIComponent(currentQ)}` : '';
  card.href = `${linkPrefix}?id=${movie.id}${qParam}`;

  // Use template literals for clean, readable HTML generation
  // escapeHtml() protects against XSS from movie titles with special chars
  card.innerHTML = `
    ${posterPath
      ? `<img class="movie-card__poster" src="${posterPath}" alt="${escapeHtml(movie.title)}" loading="lazy">`
      : `<div class="movie-card__poster-placeholder">🎬</div>`
    }
    <div class="movie-card__body">
      <div class="movie-card__title">${escapeHtml(movie.title)}</div>
      <div class="movie-card__meta">
        <span class="movie-card__year">${year}</span>
        <span class="movie-card__rating">★ ${rating}</span>
      </div>
    </div>`;

  return card;
};


// =============================================
//  Validate — Form Validation Helpers
//
//  Provides reusable validation logic and
//  DOM helpers for showing/clearing errors.
//  Used in search.js, movie.js, watchlist-page.js.
//
//  WHY CLIENT-SIDE VALIDATION?
//  It gives users immediate feedback without
//  waiting for a server round-trip. It also
//  prevents unnecessary API calls with bad data.
// =============================================
const Validate = {
  // Returns true if the string has at least one non-whitespace character
  required: (value) => value.trim().length > 0,

  // Returns true if trimmed length is within the allowed maximum
  maxLength: (value, max) => value.trim().length <= max,

  // Marks a field as invalid and shows its error message
  showError: (fieldEl, errorEl, message) => {
    fieldEl.classList.add('error');         // adds red border via CSS
    errorEl.textContent = message;
    errorEl.classList.add('visible');       // unhides the error paragraph
  },

  // Clears error state from a single field
  clearError: (fieldEl, errorEl) => {
    fieldEl.classList.remove('error');
    errorEl.classList.remove('visible');
  },

  // Clears all error states in a form at once
  // Called before re-validating on each submit
  clearAll: (formEl) => {
    formEl.querySelectorAll('.form-control').forEach((f) => f.classList.remove('error'));
    formEl.querySelectorAll('.field-error').forEach((e) => e.classList.remove('visible'));
  },
};


// =============================================
//  statusBadge() — Status Pill Builder
//
//  Returns an HTML string for a coloured badge
//  representing a watchlist status.
//  The CSS class suffix maps to distinct colours.
//
//  @param {string} status — stored English value
//  @returns {string} HTML string
// =============================================
const statusBadge = (status) => {
  const map = {
    'Want to Watch': 'want',
    'Watching':      'watching',
    'Completed':     'completed',
  };
  const cls = map[status] || 'want';
  return `<span class="status-badge status-badge--${cls}">${escapeHtml(status)}</span>`;
};


// =============================================
//  setActiveNav() — Nav Link Highlighter
//
//  Compares the current page filename against
//  each nav link's href, and adds the 'active'
//  class to the matching link.
//
//  WHY STRIP QUERY PARAMS?
//  Links like 'index.html?mode=discover' would
//  fail a direct comparison with 'index.html'
//  unless we strip the query string first.
// =============================================
const setActiveNav = () => {
  const page = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav__link').forEach((link) => {
    // Strip query params (e.g. ?mode=discover) before comparing
    const href = link.getAttribute('href').split('?')[0].split('/').pop();
    if (href === page) link.classList.add('active');
  });
};


// =============================================
//  escapeHtml() — XSS Protection
//
//  Converts a plain string into safe HTML by
//  escaping special characters like < > & " '
//  This MUST be used whenever displaying
//  user-provided or API-provided text inside
//  innerHTML to prevent script injection.
//
//  @param {string} str
//  @returns {string} escaped HTML-safe string
// =============================================
const escapeHtml = (str) => {
  // We use the browser's own text node to do the escaping —
  // this is safer and more reliable than manual string replace
  const div = document.createElement('div');
  div.appendChild(document.createTextNode(str || ''));
  return div.innerHTML;
};


// =============================================
//  truncate() — String Shortener
//
//  Shortens a string to `max` characters and
//  appends an ellipsis if it was truncated.
//  Useful for long movie titles in compact UIs.
//
//  @param {string} str
//  @param {number} max
//  @returns {string}
// =============================================
const truncate = (str, max) =>
  str && str.length > max ? str.substring(0, max) + '…' : str;


// =============================================
//  getParam() — URL Query Parameter Reader
//
//  Reads a value from the current page's URL.
//  e.g. for URL 'movie.html?id=550', calling
//  getParam('id') returns '550'.
//
//  Used by movie.js to get the movie ID, and
//  by discover.js to detect ?mode=discover.
//
//  @param {string} key
//  @returns {string|null}
// =============================================
const getParam = (key) => new URLSearchParams(window.location.search).get(key);


// Run nav highlight as soon as the DOM is ready
document.addEventListener('DOMContentLoaded', setActiveNav);
