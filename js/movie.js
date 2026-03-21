// =============================================
//  movie.js — Movie Detail Page Logic
//
//  PURPOSE:
//  Controls everything on movie.html. Reads the
//  movie ID from the URL, fetches all required
//  data from TMDB in parallel, and renders the
//  full detail view including poster, metadata,
//  trailer, similar films, and the watchlist form.
//
//  HOW IT WORKS:
//  1. getParam('id') reads ?id=XXXX from the URL
//  2. Three TMDB requests fire simultaneously via
//     Promise.all() — details, videos, similar films
//  3. Each render function populates its section
//  4. initWatchlistForm() checks if the movie is
//     already saved, then sets up the add form
//
//  WHY PROMISE.ALL()?
//  Instead of waiting for each request to finish
//  before starting the next, Promise.all() fires
//  all four at once. This cuts total load time
//  from ~1200ms (sequential) to ~300ms (parallel).
//
//  WATCHLIST FORM:
//  Uses a double-submit guard (isSubmitting flag)
//  to prevent duplicate POST requests if the user
//  clicks "Add to Watchlist" multiple times quickly.
//
//  DEPENDS ON: config.js, tmdb.js, watchlist.js, ui.js
// =============================================

(() => {
  // Read the movie ID from the URL — e.g. movie.html?id=550 → '550'
  const movieId = getParam('id');

  // ---- DOM References ------------------------
  const loadingState  = document.getElementById('loadingState');
  const detailContent = document.getElementById('detailContent');
  const errorState    = document.getElementById('errorState');

  // If no ID in the URL, show error immediately and stop
  if (!movieId) {
    loadingState.style.display = 'none';
    errorState.style.display   = 'block';
    return;
  }

  // ---- Render Movie Details ------------------
  // Populates the hero section: poster, title, tagline,
  // metadata row, genre tags, and overview paragraph.
  const renderDetails = (movie) => {
    // Update the browser tab title with the movie name
    document.title = `FrameLedger — ${movie.title}`;

    // Set the blurred backdrop image (decorative background)
    const backdrop = TMDB.backdropUrl(movie.backdrop_path);
    if (backdrop) {
      document.getElementById('backdrop').style.backgroundImage = `url('${backdrop}')`;
    }

    // Poster — replace the placeholder <img> with real image,
    // or swap to a placeholder div if no poster is available
    const posterEl  = document.getElementById('detailPoster');
    const posterSrc = TMDB.posterUrl(movie.poster_path, 'w500');
    if (posterSrc) {
      posterEl.src = posterSrc;
      posterEl.alt = movie.title;
    } else {
      posterEl.outerHTML = `<div class="detail-poster-placeholder">🎬</div>`;
    }

    // Set back button to return to search results if ?q= is in referrer
    // This preserves the user's search query when clicking back
    const backBtn = document.getElementById('backBtn');
    if (backBtn) {
      const referrerQuery = getParam('q');
      if (referrerQuery) {
        backBtn.href = `../index.html?q=${encodeURIComponent(referrerQuery)}`;
      }
    }

    // Eyebrow line: release year, and original title if different
    // (e.g. a French film shown in English would display both)
    const year = movie.release_date ? movie.release_date.substring(0, 4) : '—';
    document.getElementById('detailEyebrow').innerHTML =
      `${year}${movie.original_title !== movie.title
        ? ` &mdash; ${escapeHtml(movie.original_title)}`
        : ''}`;

    // Title and tagline
    document.getElementById('detailTitle').textContent   = movie.title;
    document.getElementById('detailTagline').textContent = movie.tagline || '';
    if (!movie.tagline) {
      document.getElementById('detailTagline').style.display = 'none';
    }

    // Metadata row: rating, vote count, runtime, language, release status
    const metaRow = document.getElementById('detailMetaRow');
    const runtime = movie.runtime
      ? `${Math.floor(movie.runtime / 60)}h ${movie.runtime % 60}m`
      : '—';
    // Only show rating if the film has actual votes — 0.0 with no votes is misleading
    const rating = movie.vote_count > 0 && movie.vote_average != null
      ? movie.vote_average.toFixed(1)
      : '—';
    const votes  = movie.vote_count   ? movie.vote_count.toLocaleString()    : '—';
    const lang   = movie.original_language ? movie.original_language.toUpperCase() : '—';

metaRow.innerHTML = `
        <div class="detail-meta-item">
          <span class="label">${'Rating'}</span>
          <span class="value gold">★ ${rating}</span>
        </div>
        <div class="detail-meta-item">
          <span class="label">${'Votes'}</span>
          <span class="value">${votes}</span>
        </div>
        <div class="detail-meta-item">
          <span class="label">${'Runtime'}</span>
          <span class="value">${runtime}</span>
        </div>
        <div class="detail-meta-item">
          <span class="label">${'Language'}</span>
          <span class="value">${lang}</span>
        </div>
        <div class="detail-meta-item">
          <span class="label">${'Status'}</span>
          <span class="value">${escapeHtml(movie.status || '—')}</span>
        </div>`;

    // Genre tags — map genre objects to badge spans
    const genresEl = document.getElementById('detailGenres');
    if (movie.genres && movie.genres.length) {
      genresEl.innerHTML = movie.genres
        .map((g) => `<span class="genre-tag">${escapeHtml(g.name)}</span>`)
        .join('');
    }

    // Overview (plot summary)
    document.getElementById('detailOverview').textContent =
      movie.overview || 'No overview available.';
  };

  // ---- Render Trailer ------------------------
  // Filters the videos response for YouTube trailers.
  // Prefers official "Trailer" type over "Teaser".
  // Embeds using youtube-nocookie.com for privacy.
  const renderTrailer = (videos) => {
    // Filter to only YouTube trailers/teasers
    const trailers = videos.results.filter(
      (v) => v.site === 'YouTube' && (v.type === 'Trailer' || v.type === 'Teaser')
    );
    if (!trailers.length) return; // No trailer available — section stays hidden

    // Prefer a full Trailer over a Teaser
    const trailer   = trailers.find((v) => v.type === 'Trailer') || trailers[0];
    const section   = document.getElementById('trailerSection');
    const container = document.getElementById('trailerContainer');
    const divider   = document.getElementById('trailerDivider');

    section.style.display = 'block';
    divider.style.display = 'block';

    // youtube-nocookie.com embeds don't track the user
    // rel=0 hides related videos, modestbranding=1 reduces YouTube branding
    container.innerHTML = `
      <div class="trailer-wrapper">
        <iframe
          src="https://www.youtube-nocookie.com/embed/${encodeURIComponent(trailer.key)}?rel=0&modestbranding=1"
          title="${escapeHtml(trailer.name)}"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowfullscreen
        ></iframe>
      </div>`;
  };

  // ---- Render Similar Movies -----------------
  // Shows up to 8 similar films in a smaller card grid.
  // Uses the same buildMovieCard() helper as the home page.
  const renderSimilar = (movies) => {
    if (!movies.length) return; // Nothing to show — section stays hidden

    const section = document.getElementById('similarSection');
    const grid    = document.getElementById('similarGrid');
    const divider = document.getElementById('similarDivider');

    section.style.display = 'block';
    if (divider) divider.style.display = 'block';

    // Limit to 8 — enough to be useful without overwhelming the page
    // Note: linkPrefix is 'movie.html' not 'pages/movie.html' because
    // we're already inside the /pages/ directory
    movies.slice(0, 8).forEach((movie) => {
      grid.appendChild(buildMovieCard(movie, 'movie.html'));
    });
  };

  // ---- Watchlist Form Logic ------------------
  // Sets up the "Add to Watchlist" form on the detail page.
  // First checks if the movie is already saved so we can
  // show the correct button state on load.
  const initWatchlistForm = async (movie) => {
    const form         = document.getElementById('addToWatchlistForm');
    const addBtn       = document.getElementById('addBtn');
    const viewBtn      = document.getElementById('viewWatchlistBtn');
    const noteInput    = document.getElementById('noteInput');
    const noteError    = document.getElementById('noteError');
    const formError    = document.getElementById('formError');
    const statusSelect = document.getElementById('statusSelect');
    const charCount    = document.getElementById('noteCharCount');

    // Double-submit guard: set to true while a POST is in-flight
    let isSubmitting = false;

    // Character counter for the note input
    const updateCharCount = () => {
      if (charCount) {
        const len = noteInput.value.length;
        charCount.textContent = `${len} / 200`;
        // Turn red when approaching the limit
        charCount.style.color = len > 180 ? 'var(--red)' : 'var(--text-muted)';
      }
    };
    noteInput.addEventListener('input', updateCharCount);
    updateCharCount(); // Set initial value

    // Check if this movie is already in the watchlist
    // If so, pre-fill the form and disable the add button
    try {
      const existing = await WatchlistAPI.findByTmdbId(movieId);
      if (existing) {
        addBtn.textContent    = '✓ In Watchlist';
        addBtn.disabled       = true;
        statusSelect.value    = existing.status;
        noteInput.value       = existing.note || '';
        viewBtn.style.display = 'inline-flex';
        updateCharCount();
      }
    } catch (_) {
      // If MockAPI is unreachable, fail silently — the form still works
    }

    // "View in Watchlist" button — navigates to watchlist.html
    viewBtn.addEventListener('click', () => {
      window.location.href = 'watchlist.html';
    });

    // Form submit — POST a new watchlist entry
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (isSubmitting) return; // Block double-submit

      // Clear any previous validation errors
      Validate.clearAll(form);
      formError.classList.remove('visible');

      const note   = noteInput.value.trim();
      const status = statusSelect.value;

      // Validate note length (it's optional, but if provided must be ≤200 chars)
      if (note && !Validate.maxLength(note, 200)) {
        Validate.showError(noteInput, noteError, 'Note must be 200 characters or fewer.');
        return;
      }

      // Lock the form
      isSubmitting       = true;
      addBtn.disabled    = true;
      addBtn.textContent = 'Adding...';

      // Build the entry object to POST to MockAPI
      // We store the data we need for the watchlist page
      // without having to re-fetch from TMDB
      const entry = {
        tmdbId:      movie.id,
        title:       movie.title,
        posterPath:  movie.poster_path  || '',
        releaseYear: movie.release_date ? movie.release_date.substring(0, 4) : '',
        rating:      movie.vote_count > 0 && movie.vote_average != null ? movie.vote_average.toFixed(1) : '',
        status,
        note,
        addedAt:     new Date().toISOString(), // ISO string for consistent sorting
      };

      try {
        await WatchlistAPI.add(entry); // POST to MockAPI
        Toast.success(`"${movie.title}" added to your watchlist.`);
        addBtn.textContent    = '✓ In Watchlist';
        viewBtn.style.display = 'inline-flex';
      } catch (err) {
        // On failure: unlock the form so the user can try again
        isSubmitting       = false;
        addBtn.disabled    = false;
        addBtn.textContent = 'Add to Watchlist';
        formError.textContent = 'Failed to add to watchlist. Please try again.';
        formError.classList.add('visible');
        Toast.error('Could not save to watchlist: ' + err.message);
      }
      // Note: isSubmitting is NOT reset on success —
      // once added, the button stays disabled permanently
    });
  };

  // ---- Render Reviews ------------------------
  // Displays up to 3 audience reviews from TMDB.
  // Each review shows the author's avatar initial,
  // name, star rating (if provided), date, and a
  // truncated excerpt with a "Read more" toggle.
  // Reviews with fewer than 100 characters are skipped
  // as they add little value.
  const renderReviews = (reviewsData) => {
    // Filter to reviews with meaningful content
    const reviews = reviewsData.results
      .filter((r) => r.content && r.content.length >= 100)
      .slice(0, 3);

    if (!reviews.length) return; // No reviews — section stays hidden

    const section  = document.getElementById('reviewsSection');
    const grid     = document.getElementById('reviewsGrid');
    const divider  = document.getElementById('reviewsDivider');

    section.style.display = 'block';
    divider.style.display = 'block';

    reviews.forEach((review) => {
      // Format the date (e.g. "March 2024")
      const date = review.created_at
        ? new Date(review.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
        : '';

      // Get star rating from author_details if available
      const ratingVal = review.author_details?.rating;
      const stars = ratingVal
        ? `<span class="review-card__rating">★ ${parseFloat(ratingVal).toFixed(1)}</span>`
        : '';

      // Use first letter of author name as avatar initial
      const initial = (review.author || '?')[0].toUpperCase();

      // Truncate long reviews — show first 300 chars with expand toggle
      const EXCERPT_LEN = 300;
      const isLong      = review.content.length > EXCERPT_LEN;
      const excerpt     = isLong
        ? escapeHtml(review.content.substring(0, EXCERPT_LEN)) + '…'
        : escapeHtml(review.content);
      const full        = escapeHtml(review.content);

      const card = document.createElement('div');
      card.className = 'review-card';
      card.innerHTML = `
        <div class="review-card__header">
          <div class="review-card__avatar">${escapeHtml(initial)}</div>
          <div class="review-card__meta">
            <span class="review-card__author">${escapeHtml(review.author || 'Anonymous')}</span>
            <span class="review-card__date">${escapeHtml(date)}</span>
          </div>
          ${stars}
        </div>
        <p class="review-card__body" id="reviewBody-${escapeHtml(review.id)}">${excerpt}</p>
        ${isLong ? `<button class="review-card__toggle" data-full="${encodeURIComponent(full)}" data-excerpt="${encodeURIComponent(excerpt)}">Read more</button>` : ''}`;

      // Wire up the expand/collapse toggle
      if (isLong) {
        const toggle = card.querySelector('.review-card__toggle');
        const body   = card.querySelector('.review-card__body');
        let expanded = false;

        toggle.addEventListener('click', () => {
          expanded = !expanded;
          body.innerHTML    = expanded ? decodeURIComponent(toggle.dataset.full) : decodeURIComponent(toggle.dataset.excerpt);
          toggle.textContent = expanded ? 'Read less' : 'Read more';
        });
      }

      grid.appendChild(card);
    });
  };

  // ---- Main Initialisation -------------------
  // Fires all four TMDB requests simultaneously using
  // Promise.all(), then renders each section in order.
  // If any critical request fails, shows the error state.
  const init = async () => {
    try {
      // Parallel fetch — all four start at the same time
      const [movie, videos, similar, reviews] = await Promise.all([
        TMDB.getMovieDetails(movieId),   // Main movie data
        TMDB.getMovieVideos(movieId),    // Trailer keys
        TMDB.getSimilarMovies(movieId),  // Related films
        TMDB.getMovieReviews(movieId),   // Audience reviews
      ]);

      // Render each section with its data
      renderDetails(movie);
      renderTrailer(videos);
      renderSimilar(similar.results);
      renderReviews(reviews);

      // Set up the watchlist form last (it needs movie data)
      await initWatchlistForm(movie);

      // Reveal the full page content
      loadingState.style.display  = 'none';
      detailContent.style.display = 'block';

    } catch (err) {
      // Something went wrong — show the error fallback
      loadingState.style.display = 'none';
      errorState.style.display   = 'block';
      Toast.error('Failed to load film details: ' + err.message);
    }
  };

  init();
})();
