// =============================================
//  search.js — Home Page Search Logic
//
//  PURPOSE:
//  Controls the Search mode on the home page.
//  Handles user input, form validation, calling
//  the TMDB search API, rendering results as
//  movie cards, and managing pagination.
//
//  HOW IT WORKS:
//  1. User types — debounce timer starts (400ms)
//  2. If user keeps typing, timer resets each keystroke
//  3. When user pauses for 400ms, doSearch() fires
//  4. Pressing Enter or clicking Search fires immediately
//  5. renderResults() builds movie cards from the data
//  6. Pagination buttons let the user browse pages
//
//  DEBOUNCING EXPLAINED:
//  Instead of firing a request on every keystroke,
//  we wait until the user stops typing for 400ms.
//  This is done with setTimeout/clearTimeout:
//    - On each input event, clear the previous timer
//    - Set a new 400ms timer
//    - Only the last timer actually completes
//  This reduces API calls from ~10 per word typed
//  down to 1 per completed word.
//
//  KEYBOARD SHORTCUTS:
//  '/'     — focus the search input from anywhere
//  Escape  — clear the input and blur focus
//
//  SHARES DOM WITH: discover.js
//  Both scripts use #movieGrid, #pagination, etc.
//  When Discover mode is active, discover.js takes
//  over the pagination buttons via .onclick.
//
//  DEPENDS ON: config.js, tmdb.js, ui.js
// =============================================

(() => {
  // ---- DOM References ------------------------
  const form           = document.getElementById('searchForm');
  const input          = document.getElementById('searchInput');
  const clearBtn       = document.getElementById('searchClearBtn');
  const errorEl        = document.getElementById('searchError');
  const grid           = document.getElementById('movieGrid');
  const initialState   = document.getElementById('initialState');
  const resultsHeader  = document.getElementById('resultsHeader');
  const resultsLabel   = document.getElementById('resultsLabel');
  const paginationEl   = document.getElementById('pagination');
  const prevBtn        = document.getElementById('prevBtn');
  const nextBtn        = document.getElementById('nextBtn');
  const pageInfo       = document.getElementById('pageInfo');
  const resultsSection = document.getElementById('resultsSection');

  // ---- State Variables -----------------------
  let currentQuery  = '';    // The last successfully searched query
  let currentPage   = 1;    // Current pagination page
  let totalPages    = 1;    // Total pages returned by TMDB
  let isSearching   = false; // Guard: prevents overlapping requests
  let debounceTimer = null;  // Holds the setTimeout reference for debouncing

  // ---- Debounce Delay ------------------------
  // 400ms is the sweet spot: fast enough to feel live,
  // slow enough to not fire on every keystroke
  const DEBOUNCE_MS = 400;
  const MIN_QUERY_LENGTH = 2; // Don't search single characters

  // ---- Clear Button --------------------------
  const updateClearBtn = () => {
    if (clearBtn) {
      clearBtn.style.display = input.value.length > 0 ? 'flex' : 'none';
    }
  };

  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      input.value = '';
      input.focus();
      updateClearBtn();
      clearTimeout(debounceTimer); // Cancel any pending debounced search
      errorEl.classList.remove('visible');
      input.classList.remove('error');
      // Reset results to initial state
      grid.innerHTML = '';
      initialState.style.display  = 'block';
      resultsHeader.style.display = 'none';
      paginationEl.style.display  = 'none';
    });
  }

  // ---- Validation ----------------------------
  const validateSearch = (query) => {
    if (!Validate.required(query)) {
      errorEl.textContent = 'Please enter a film title to search.';
      errorEl.classList.add('visible');
      input.classList.add('error');
      return false;
    }
    errorEl.classList.remove('visible');
    input.classList.remove('error');
    return true;
  };

  // ---- Search History (localStorage) --------
  // Stores last 5 unique searches as clickable chips.
  // Persists across page loads via localStorage.
  const HISTORY_KEY = 'fl_search_history';
  const MAX_HISTORY = 5;

  const getHistory = () => {
    try { return JSON.parse(localStorage.getItem(HISTORY_KEY)) || []; }
    catch (_) { return []; }
  };

  const saveToHistory = (query) => {
    let history = getHistory();
    history = [query, ...history.filter((h) => h.toLowerCase() !== query.toLowerCase())];
    history = history.slice(0, MAX_HISTORY);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  };

  // ---- Render Results ------------------------
  const renderResults = (movies, query, page, total) => {
    initialState.style.display = 'none';
    grid.innerHTML = '';

    if (!movies.length) {
      StateMessage.show(grid, '🔍', `No results found for "${escapeHtml(query)}"`);
      resultsHeader.style.display = 'none';
      paginationEl.style.display  = 'none';
      return;
    }

    resultsHeader.style.display = 'flex';
    resultsLabel.textContent = `${movies.length} results for "${query}"`;

    movies.forEach((movie) => {
      grid.appendChild(buildMovieCard(movie, 'pages/movie.html'));
    });

    if (total > 1) {
      paginationEl.style.display = 'flex';
      pageInfo.textContent = `Page ${page} of ${total}`;
      prevBtn.disabled = page <= 1;
      nextBtn.disabled = page >= total;
    } else {
      paginationEl.style.display = 'none';
    }

    resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });

    // Save successful search to history
    saveToHistory(query);

    // Update URL with current query so card links can pass ?q= back
    // This doesn't reload the page — just updates the browser history
    if (page === 1) {
      const newUrl = `${window.location.pathname}?q=${encodeURIComponent(query)}`;
      window.history.replaceState({}, '', newUrl);
    }
  };

  // ---- API Fetch -----------------------------
  const doSearch = async (query, page) => {
    if (isSearching) return;
    isSearching = true;

    Spinner.show(grid, 'Searching the archives...');
    initialState.style.display  = 'none';
    resultsHeader.style.display = 'none';
    paginationEl.style.display  = 'none';

    try {
      const data = await TMDB.searchMovies(query, page);
      totalPages = Math.min(data.total_pages, 500);
      renderResults(data.results, query, page, totalPages);
    } catch (err) {
      StateMessage.show(grid, '⚠️', 'Could not reach the server. Please try again.');
      Toast.error('Search failed: ' + err.message);
    } finally {
      isSearching = false;
    }
  };

  // ---- Debounced Live Search -----------------
  // Fires automatically as the user types, after a 400ms pause.
  // Each keystroke clears the previous timer and starts a new one.
  // Only the final timer (when user stops typing) completes.
  input.addEventListener('input', () => {
    updateClearBtn();

    // Clear validation errors as user types
    if (input.value.trim()) {
      errorEl.classList.remove('visible');
      input.classList.remove('error');
    }

    const query = input.value.trim();

    // If input is cleared, reset to initial state
    if (!query) {
      clearTimeout(debounceTimer);
      grid.innerHTML = '';
      initialState.style.display  = 'block';
      resultsHeader.style.display = 'none';
      paginationEl.style.display  = 'none';
      return;
    }

    // Don't fire for very short queries (single characters)
    if (query.length < MIN_QUERY_LENGTH) return;

    // Cancel the previous timer and start a fresh one
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      currentQuery = query;
      currentPage  = 1;
      doSearch(currentQuery, currentPage);
    }, DEBOUNCE_MS);
  });

  // ---- Form Submit (immediate) ---------------
  // Pressing Enter or clicking Search fires immediately,
  // bypassing the debounce delay for a snappier feel
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const query = input.value.trim();
    if (!validateSearch(query)) return;

    clearTimeout(debounceTimer); // Cancel any pending debounced search
    currentQuery = query;
    currentPage  = 1;
    doSearch(currentQuery, currentPage);
  });

  // ---- Pagination ----------------------------
  const onPrev = () => {
    if (currentPage > 1) {
      currentPage--;
      doSearch(currentQuery, currentPage);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const onNext = () => {
    if (currentPage < totalPages) {
      currentPage++;
      doSearch(currentQuery, currentPage);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  prevBtn.addEventListener('click', onPrev);
  nextBtn.addEventListener('click', onNext);

  // ---- Keyboard Shortcuts --------------------
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      clearTimeout(debounceTimer);
      input.value = '';
      updateClearBtn();
      input.blur();
      grid.innerHTML = '';
      initialState.style.display  = 'block';
      resultsHeader.style.display = 'none';
      paginationEl.style.display  = 'none';
    }
  });

  document.addEventListener('keydown', (e) => {
    if (
      e.key === '/' &&
      document.activeElement !== input &&
      document.activeElement.tagName !== 'SELECT' &&
      document.activeElement.tagName !== 'TEXTAREA'
    ) {
      e.preventDefault();
      input.focus();
      input.select();
    }
  });

  // ---- URL Pre-fill --------------------------
  const q = getParam('q');
  if (q) {
    input.value = q;
    currentQuery = q;
    updateClearBtn();
    doSearch(q, 1);
  }

  updateClearBtn();

  // ---- Search History Chips ------------------
  const renderHistory = () => {
    const historyEl = document.getElementById('searchHistory');
    const chipsEl   = document.getElementById('searchHistoryChips');
    if (!historyEl || !chipsEl) return;

    const history = getHistory();
    if (!history.length) { historyEl.style.display = 'none'; return; }

    chipsEl.innerHTML = '';
    history.forEach((query) => {
      const chip = document.createElement('button');
      chip.className   = 'search-history__chip';
      chip.textContent = query;
      chip.type        = 'button';
      chip.addEventListener('click', () => {
        input.value  = query;
        currentQuery = query;
        currentPage  = 1;
        updateClearBtn();
        clearTimeout(debounceTimer);
        historyEl.style.display = 'none';
        doSearch(query, 1);
      });
      chipsEl.appendChild(chip);
    });

    historyEl.style.display = input.value.length === 0 ? 'block' : 'none';
  };

  // Show history on focus when empty
  input.addEventListener('focus', () => {
    if (!input.value.trim()) renderHistory();
  });

  // Hide history on outside click
  document.addEventListener('click', (e) => {
    const historyEl = document.getElementById('searchHistory');
    if (historyEl && !historyEl.contains(e.target) && e.target !== input) {
      historyEl.style.display = 'none';
    }
  });

  renderHistory();
})();
