// =============================================
//  tmdb.js — TMDB API Module
//
//  PURPOSE:
//  Centralises every call made to The Movie
//  Database (TMDB) API. All functions return
//  Promises, so callers can use async/await.
//
//  WHY AN IIFE?
//  The entire module is wrapped in an
//  Immediately Invoked Function Expression:
//    const TMDB = (() => { ... })();
//  This keeps internal helpers (like `request`)
//  private — they can't be called from outside
//  this file. Only the functions listed in the
//  final `return { ... }` are public.
//
//  ENDPOINTS USED:
//  GET /search/movie          → searchMovies()
//  GET /movie/:id             → getMovieDetails()
//  GET /movie/:id/videos      → getMovieVideos()
//  GET /movie/:id/similar     → getSimilarMovies()
//  GET /discover/movie        → discoverMovies()
//  GET /genre/movie/list      → getGenres()
//
//  DEPENDS ON: config.js (must load first)
// =============================================

const TMDB = (() => {
  // Destructure what we need from the global CONFIG object
  const { TMDB_API_KEY, TMDB_BASE_URL, TMDB_IMAGE_BASE } = CONFIG;

  // --------------------------------------------------
  //  request() — private core fetch wrapper
  //
  //  All public functions call this instead of fetch()
  //  directly. It handles:
  //    - Appending the API key to every request
  //    - Appending any extra query params
  //    - Checking for HTTP error responses (res.ok)
  //    - Parsing the JSON body
  //    - Throwing a descriptive error on failure
  //
  //  @param {string} endpoint  — e.g. '/search/movie'
  //  @param {object} params    — additional query params
  //  @returns {Promise<object>} parsed JSON response
  // --------------------------------------------------
  const request = async (endpoint, params = {}) => {
    // Build the full URL using the URL API so params are encoded safely
    const url = new URL(`${TMDB_BASE_URL}${endpoint}`);

    // Every TMDB v3 request requires the api_key param
    url.searchParams.set('api_key', TMDB_API_KEY);

    // Append any additional params passed by the caller
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));

    const res = await fetch(url.toString());

    // If the HTTP status is not 2xx, extract TMDB's error message and throw
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.status_message || `TMDB error ${res.status}`);
    }

    return res.json();
  };

  // --------------------------------------------------
  //  searchMovies() — Search by title
  //  Used by: search.js (home page search bar)
  //
  //  @param {string} query  — user's search text
  //  @param {number} page   — pagination page (default 1)
  // --------------------------------------------------
  const searchMovies = (query, page = 1) =>
    request('/search/movie', { query, page, include_adult: false });

  // --------------------------------------------------
  //  getMovieDetails() — Full detail for one movie
  //  Used by: movie.js (detail page)
  //  Returns: title, overview, genres, runtime,
  //           tagline, vote_average, backdrop, etc.
  // --------------------------------------------------
  const getMovieDetails = (movieId) =>
    request(`/movie/${movieId}`);

  // --------------------------------------------------
  //  getMovieVideos() — Trailers and teasers
  //  Used by: movie.js (trailer embed section)
  //  We filter results to YouTube Trailers/Teasers
  // --------------------------------------------------
  const getMovieVideos = (movieId) =>
    request(`/movie/${movieId}/videos`);

  // --------------------------------------------------
  //  getMovieReviews() — User reviews for a movie
  //  Used by: movie.js (reviews section)
  //  Returns: author, content, rating, created_at
  //  Note: Not all movies have reviews. We show up
  //  to 3 and truncate long ones.
  // --------------------------------------------------
  const getMovieReviews = (movieId) =>
    request(`/movie/${movieId}/reviews`);

  // --------------------------------------------------
  //  getSimilarMovies() — Films similar to a given one
  //  Used by: movie.js (similar films section)
  // --------------------------------------------------
  const getSimilarMovies = (movieId, page = 1) =>
    request(`/movie/${movieId}/similar`, { page });

  // --------------------------------------------------
  //  discoverMovies() — Filter/browse without a query
  //  Used by: discover.js (Discover mode on home page)
  //  Accepts params like: with_genres, vote_average.gte,
  //  sort_by, vote_count.gte, include_adult, page
  // --------------------------------------------------
  const discoverMovies = (params = {}) =>
    request('/discover/movie', params);

  // --------------------------------------------------
  //  getGenres() — Full list of TMDB genre IDs + names
  //  Used by: discover.js to populate the genre dropdown
  //  e.g. { id: 28, name: "Action" }
  // --------------------------------------------------
  const getGenres = () =>
    request('/genre/movie/list');

  // --------------------------------------------------
  //  posterUrl() — Build a full image URL for a poster
  //
  //  TMDB returns only a path like '/abc123.jpg'.
  //  We prepend the CDN base + a size string.
  //  Common sizes: w92, w185, w342, w500, w780, original
  //
  //  @param {string|null} path  — poster_path from API
  //  @param {string}      size  — CDN size prefix
  //  @returns {string|null}
  // --------------------------------------------------
  const posterUrl = (path, size = 'w500') =>
    path ? `${TMDB_IMAGE_BASE}/${size}${path}` : null;

  // --------------------------------------------------
  //  backdropUrl() — Build a full image URL for a backdrop
  //  Used by: movie.js to set the blurred background
  // --------------------------------------------------
  const backdropUrl = (path, size = 'w1280') =>
    path ? `${TMDB_IMAGE_BASE}/${size}${path}` : null;

  // Expose only the public API — `request` stays private
  return {
    searchMovies,
    getMovieDetails,
    getMovieVideos,
    getMovieReviews,
    getSimilarMovies,
    discoverMovies,
    getGenres,
    posterUrl,
    backdropUrl,
  };
})();
