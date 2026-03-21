// =============================================
//  discover.js — Discover Mode Logic
//
//  PURPOSE:
//  Controls the Discover mode on the home page.
//  Lets users browse movies by genre and/or
//  minimum rating without needing a search query.
//  Uses TMDB's /discover/movie endpoint which
//  supports rich filtering parameters.
//
//  HOW IT WORKS:
//  1. User clicks the "Discover" mode toggle button
//  2. The search pane hides, the discover pane shows
//  3. Genres are fetched from TMDB and loaded into
//     the genre dropdown dynamically
//  4. An automatic default fetch (popular films) fires
//  5. User can refine by genre, rating, and sort order
//  6. Results use the same shared grid as search.js
//
//  MODE SWITCHING:
//  Both Search and Discover share the same results
//  grid, results header, and pagination elements.
//  When switching modes, this script takes over
//  the pagination buttons (via .onclick) and
//  releases them back to search.js when switching
//  back to Search mode.
//
//  NAVIGATION:
//  - Clicking "Discover" in the nav on index.html
//    intercepts the click and switches mode in-page
//  - Clicking "Discover" from movie.html/watchlist.html
//    navigates to index.html?mode=discover, and this
//    script detects that param on load and auto-switches
//
//  DEPENDS ON: config.js, tmdb.js, ui.js
// =============================================

(() => {
  // ---- DOM References — Mode Toggle ----------
  const modeSearch   = document.getElementById('modeSearch');
  const modeDiscover = document.getElementById('modeDiscover');
  const searchPane   = document.getElementById('searchPane');
  const discoverPane = document.getElementById('discoverPane');

  // ---- DOM References — Discover Controls ----
  const genreSelect   = document.getElementById('genreSelect');
  const ratingSelect  = document.getElementById('ratingSelect');
  const sortSelect    = document.getElementById('sortSelect');
  const discoverBtn   = document.getElementById('discoverBtn');
  const discoverError = document.getElementById('discoverError');

  // ---- Shared DOM (also used by search.js) ---
  const grid          = document.getElementById('movieGrid');
  const initialState  = document.getElementById('initialState');
  const resultsHeader = document.getElementById('resultsHeader');
  const resultsLabel  = document.getElementById('resultsLabel');
  const paginationEl  = document.getElementById('pagination');
  const prevBtn       = document.getElementById('prevBtn');
  const nextBtn       = document.getElementById('nextBtn');
  const pageInfo      = document.getElementById('pageInfo');

  // ---- State ---------------------------------
  let currentPage = 1;   // Current page of discover results
  let totalPages  = 1;   // Total pages from TMDB
  let lastParams  = {};  // Last filter params — reused by pagination

  // ---- Mode Switching ------------------------
  // Switches between Search and Discover UI panes.
  // Also transfers ownership of pagination buttons:
  //   - In Search mode: search.js handles prev/next
  //   - In Discover mode: this script handles prev/next
  //     by setting .onclick (which overrides addEventListener)
  const switchMode = (mode) => {
    if (mode === 'search') {
      modeSearch.classList.add('active');
      modeDiscover.classList.remove('active');
      searchPane.style.display   = 'block';
      discoverPane.style.display = 'none';
      // Return pagination to search.js by clearing our onclick handlers
      prevBtn.onclick = null;
      nextBtn.onclick = null;
    } else {
      modeDiscover.classList.add('active');
      modeSearch.classList.remove('active');
      discoverPane.style.display = 'block';
      searchPane.style.display   = 'none';
      // Take over pagination — use lastParams to re-fetch the same filters
      prevBtn.onclick = () => {
        if (currentPage > 1) {
          currentPage--;
          doDiscover(lastParams, currentPage);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
      };
      nextBtn.onclick = () => {
        if (currentPage < totalPages) {
          currentPage++;
          doDiscover(lastParams, currentPage);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
      };
    }
  };

  // Toggle buttons
  modeSearch.addEventListener('click',   () => switchMode('search'));
  modeDiscover.addEventListener('click', () => switchMode('discover'));

  // The nav "Discover" link on the same page (index.html):
  // intercept the click so we don't navigate away, just switch mode
  const navDiscover = document.getElementById('navDiscover');
  if (navDiscover) {
    navDiscover.addEventListener('click', (e) => {
      e.preventDefault();
      switchMode('discover');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  // If arriving from another page via ?mode=discover, auto-switch
  if (getParam('mode') === 'discover' || window.location.hash === '#discover') {
    switchMode('discover');
  }

  // ---- Load Genres ---------------------------
  // Fetches the official TMDB genre list and populates
  // the genre <select> dropdown dynamically.
  // This is non-fatal — if the request fails, the
  // dropdown just shows "Any Genre" as the only option.
  const loadGenres = async () => {
    try {
      const data = await TMDB.getGenres();
      data.genres.forEach(({ id, name }) => {
        const opt = document.createElement('option');
        opt.value       = id;   // TMDB genre ID (e.g. 28)
        opt.textContent = name; // Human name (e.g. "Action")
        genreSelect.appendChild(opt);
      });
    } catch (_) {
      // Non-fatal: dropdown stays at "Any Genre" default
    }
  };

  loadGenres();

  // ---- Render Discover Results ---------------
  // Same pattern as search.js renderResults —
  // clears the grid, builds cards, updates pagination.
  const renderDiscoverResults = (movies, page, total, label) => {
    initialState.style.display = 'none';
    grid.innerHTML = '';

    if (!movies.length) {
      StateMessage.show(grid, '🎞️', 'No films found for these filters. Try adjusting your selection.');
      resultsHeader.style.display = 'none';
      paginationEl.style.display  = 'none';
      return;
    }

    resultsHeader.style.display = 'flex';
    resultsLabel.textContent    = label;

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
  };

  // ---- Fetch Discover Results ----------------
  // Builds the TMDB API params from the user's filter
  // selections and fires the request.
  //
  // vote_count.gte: 100 ensures we don't surface
  // obscure films with only 1-2 votes that happen to
  // have a perfect rating.
  const doDiscover = async (params, page = 1) => {
    discoverError.classList.remove('visible');
    Spinner.show(grid, 'Searching the archives...');
    initialState.style.display  = 'none';
    resultsHeader.style.display = 'none';
    paginationEl.style.display  = 'none';

    const apiParams = {
      sort_by:          params.sort || 'popularity.desc',
      'vote_count.gte': 100,        // Filter out statistically unreliable ratings
      include_adult:    false,
      page,
    };

    // Only add these params if the user actually selected a value
    if (params.genre)  apiParams.with_genres         = params.genre;
    if (params.rating) apiParams['vote_average.gte'] = params.rating;

    try {
      const data = await TMDB.discoverMovies(apiParams);
      totalPages = Math.min(data.total_pages, 500); // TMDB caps at 500

      // Build a human-readable results label from the active filters
      const genreName  = params.genre
        ? genreSelect.options[genreSelect.selectedIndex].text
        : null;
      const ratingText = params.rating ? `${params.rating}+ ★` : null;
      const parts      = [genreName, ratingText].filter(Boolean);
      const label      = parts.length
        ? `Discover — ${parts.join(', ')}`
        : 'Discover — All Films';

      renderDiscoverResults(data.results, page, totalPages, label);
    } catch (err) {
      StateMessage.show(grid, '⚠️', 'Could not fetch results. Please try again.');
      Toast.error('Discover failed: ' + err.message);
    }
  };

  // ---- Discover Button -----------------------
  // Reads current filter values, saves them to lastParams
  // (so pagination can reuse them), then fires the fetch
  discoverBtn.addEventListener('click', () => {
    lastParams = {
      genre:  genreSelect.value  || '',
      rating: ratingSelect.value || '',
      sort:   sortSelect.value   || 'popularity.desc',
    };
    currentPage = 1;
    doDiscover(lastParams, 1);
  });

  // ---- Surprise Me Button --------------------
  // Picks a random genre from the loaded dropdown and
  // fires a discover request with a random page offset
  // so results feel fresh every time.
  //
  // Math.random() * totalGenres gives a random index.
  // We also randomise the page (1-3) for more variety.
  const surpriseBtn = document.getElementById('surpriseBtn');
  if (surpriseBtn) {
    surpriseBtn.addEventListener('click', async () => {
      // Wait for genres to be loaded if the dropdown only has "Any Genre"
      const genreOptions = Array.from(genreSelect.options).filter((o) => o.value);
      if (!genreOptions.length) {
        Toast.info('Genres still loading, try again in a moment.');
        return;
      }

      // Pick a random genre from the available options
      const randomGenre = genreOptions[Math.floor(Math.random() * genreOptions.length)];

      // Set the dropdowns to reflect what we picked (visual feedback)
      genreSelect.value  = randomGenre.value;
      ratingSelect.value = '';          // No rating filter — keep it open
      sortSelect.value   = 'popularity.desc';

      // Pick a random starting page (1-3) so results aren't always the same
      const randomPage = Math.floor(Math.random() * 3) + 1;

      lastParams = {
        genre:  randomGenre.value,
        rating: '',
        sort:   'popularity.desc',
      };
      currentPage = randomPage;

      Toast.info(`🎲 Showing random ${randomGenre.text} films...`);
      doDiscover(lastParams, randomPage);
    });
  }

  // Auto-trigger a default discover fetch when switching
  // to discover mode (if the grid is currently empty)
  modeDiscover.addEventListener('click', () => {
    if (!grid.children.length || grid.querySelector('.state-message')) {
      lastParams  = { genre: '', rating: '', sort: 'popularity.desc' };
      currentPage = 1;
      doDiscover(lastParams, 1);
    }
  });
})();
