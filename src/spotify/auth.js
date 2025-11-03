/**
 * Spotify PKCE authentication flow
 */

const CLIENT_ID = import.meta.env.VITE_SPOTIFY_CLIENT_ID;
const REDIRECT_URI = import.meta.env.VITE_SPOTIFY_REDIRECT_URI || 'http://localhost:5173';
const SCOPES = [
  'user-read-currently-playing',
  'user-read-playback-state',
  'user-read-private',
  'user-read-email'
];

// Generate random string for code verifier
function generateRandomString(length) {
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const values = crypto.getRandomValues(new Uint8Array(length));
  return values.reduce((acc, x) => acc + possible[x % possible.length], '');
}

// Generate code challenge from verifier
async function generateCodeChallenge(codeVerifier) {
  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(codeVerifier)
  );
  return btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

/**
 * Begin Spotify login flow
 */
export async function beginLogin() {
  if (!CLIENT_ID) {
    console.error('VITE_SPOTIFY_CLIENT_ID not configured');
    return null;
  }

  const codeVerifier = generateRandomString(64);
  const codeChallenge = await generateCodeChallenge(codeVerifier);

  // Store code verifier for token exchange
  sessionStorage.setItem('spotify_code_verifier', codeVerifier);

  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    response_type: 'code',
    redirect_uri: REDIRECT_URI,
    code_challenge_method: 'S256',
    code_challenge: codeChallenge,
    scope: SCOPES.join(' ')
  });

  const authUrl = `https://accounts.spotify.com/authorize?${params.toString()}`;
  window.location.href = authUrl;
}

/**
 * Complete login after redirect
 */
export async function completeLogin(code) {
  if (!CLIENT_ID) {
    throw new Error('VITE_SPOTIFY_CLIENT_ID not configured');
  }

  const codeVerifier = sessionStorage.getItem('spotify_code_verifier');
  if (!codeVerifier) {
    throw new Error('No code verifier found');
  }

  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    grant_type: 'authorization_code',
    code,
    redirect_uri: REDIRECT_URI,
    code_verifier: codeVerifier
  });

  const response = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: params.toString()
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error_description || 'Token exchange failed');
  }

  const data = await response.json();
  
  // Store tokens
  localStorage.setItem('spotify_access_token', data.access_token);
  if (data.refresh_token) {
    localStorage.setItem('spotify_refresh_token', data.refresh_token);
  }
  localStorage.setItem('spotify_token_expiry', Date.now() + data.expires_in * 1000);

  // Clean up verifier
  sessionStorage.removeItem('spotify_code_verifier');

  return data.access_token;
}

/**
 * Get current access token (from localStorage or legacy context)
 */
export function getAccessToken() {
  const token = localStorage.getItem('spotify_access_token');
  const expiry = localStorage.getItem('spotify_token_expiry');

  if (!token || !expiry) {
    return null;
  }

  if (Date.now() >= parseInt(expiry)) {
    // Token expired
    localStorage.removeItem('spotify_access_token');
    localStorage.removeItem('spotify_token_expiry');
    return null;
  }

  return token;
}

/**
 * Check if user is authenticated
 */
export function isAuthenticated() {
  return !!getAccessToken();
}
