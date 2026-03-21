// =============================================
//  config.js — Global API Configuration
//
//  PURPOSE:
//  This is the single source of truth for all
//  API credentials and base URLs used across
//  the application. Keeping these values in one
//  place means you only need to update them here
//  if they ever change — no hunting through files.
//
//  HOW TO USE:
//  1. Replace TMDB_API_KEY with your key from:
//     https://www.themoviedb.org/settings/api
//  2. Replace MOCKAPI_BASE_URL with your project
//     URL from mockapi.io (no trailing slash).
//
//  IMPORTANT: This file must be loaded FIRST in
//  every HTML page because all other modules
//  depend on the CONFIG object being defined.
// =============================================

const CONFIG = {
  // Your TMDB v3 API key
  TMDB_API_KEY: '8425c879c8ddb5dc7b0d66ebd15d1d50',

  // Base URL for all TMDB API v3 endpoints
  TMDB_BASE_URL: 'https://api.themoviedb.org/3',

  // Base URL for TMDB image CDN
  // A size string (e.g. 'w500') is appended per-request by posterUrl() / backdropUrl()
  TMDB_IMAGE_BASE: 'https://image.tmdb.org/t/p',

  // Your MockAPI project base URL — no trailing slash
  MOCKAPI_BASE_URL: 'https://69beacb317c3d7d97792ae6c.mockapi.io',

  // The MockAPI resource name — must exactly match what you named it on mockapi.io
  MOCKAPI_RESOURCE: 'watchlist',
};
