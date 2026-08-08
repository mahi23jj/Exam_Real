/**
 * Auth0 integration service.
 *
 * Wraps @auth0/auth0-spa-js to:
 *  - initialise the Auth0 client once
 *  - expose login / sign-up / Google OAuth / logout helpers
 *  - obtain the access token and sync the local user via GET /api/v1/auth/me
 */

import {
  createAuth0Client,
  Auth0Client,
} from '@auth0/auth0-spa-js';
import type { PopupLoginOptions } from '@auth0/auth0-spa-js';


// ── Backend user shape (matches UserRead schema) ─────────────────────────────
export interface BackendUser {
  id: string;
  email: string;
  full_name: string | null;
  picture: string | null;
  auth0_id: string | null;
  is_active: boolean;
  last_login: string | null;
  created_at: string;
  updated_at: string;
}

// ── Singleton Auth0 client ───────────────────────────────────────────────────
let auth0Client: Auth0Client | null = null;

const AUTH0_DOMAIN = import.meta.env.VITE_AUTH0_DOMAIN as string;
const AUTH0_CLIENT_ID = import.meta.env.VITE_AUTH0_CLIENT_ID as string;
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL as string;

if (!AUTH0_DOMAIN || !AUTH0_CLIENT_ID) {
  console.error('[authService] Missing VITE_AUTH0_DOMAIN or VITE_AUTH0_CLIENT_ID in .env');
}

/**
 * Returns (and lazily initialises) the shared Auth0 client.
 * We don't pass `audience` because the backend has AUTH0_AUDIENCE unset —
 * requesting without an audience yields a proper JWT that the backend can verify.
 */
export async function getAuth0Client(): Promise<Auth0Client> {
  if (!auth0Client) {
    auth0Client = await createAuth0Client({
      domain: AUTH0_DOMAIN,
      clientId: AUTH0_CLIENT_ID,
      authorizationParams: {
        redirect_uri: window.location.origin + '/auth',
      },
      cacheLocation: 'localstorage',
      useRefreshTokens: true,
    });
  }
  return auth0Client;
}

// ── Backend sync ─────────────────────────────────────────────────────────────

/**
 * Calls the backend /auth/me endpoint with the Auth0 access token.
 * The backend verifies the JWT via JWKS and creates/syncs the local user.
 */
export async function syncUserWithBackend(accessToken: string): Promise<BackendUser> {
  const response = await fetch(`${API_BASE_URL}/auth/me`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body?.detail ?? `Backend sync failed (${response.status})`);
  }

  return response.json() as Promise<BackendUser>;
}

// ── Auth helpers ─────────────────────────────────────────────────────────────

/**
 * Login with email/password via custom backend endpoint.
 * Avoids Auth0 Universal Login for email/password.
 */
export async function loginWithEmailPassword(
  email: string,
  password: string,
): Promise<{ user: BackendUser; accessToken: string }> {
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password }),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body?.detail ?? `Login failed (${response.status})`);
  }

  const data = await response.json();
  return { user: data.user, accessToken: data.access_token };
}

/**
 * Sign up via custom backend endpoint.
 * Avoids Auth0 Universal Login for email/password.
 */
export async function signUpWithEmail(
  email: string,
  fullName: string,
  password?: string,
): Promise<{ user: BackendUser; accessToken: string }> {
  const response = await fetch(`${API_BASE_URL}/auth/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, full_name: fullName, password }),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body?.detail ?? `Registration failed (${response.status})`);
  }

  const data = await response.json();
  return { user: data.user, accessToken: data.access_token };
}

/**
 * Google OAuth via popup.
 * Still uses Auth0 Universal Login specifically for google-oauth2 connection.
 */
export async function loginWithGoogle(): Promise<{ user: BackendUser; accessToken: string }> {
  const client = await getAuth0Client();

  await client.loginWithPopup({
    authorizationParams: {
      connection: 'google-oauth2',
    },
  });

  const accessToken = await client.getTokenSilently();
  
  // Call the new google/callback backend endpoint
  const response = await fetch(`${API_BASE_URL}/auth/google/callback`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ access_token: accessToken }),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body?.detail ?? `Google login sync failed (${response.status})`);
  }

  const data = await response.json();
  return { user: data.user, accessToken: data.access_token };
}

/**
 * Logout: clears Auth0 session and local storage.
 */
export async function logout(): Promise<void> {
  const client = await getAuth0Client();
  await client.logout({
    logoutParams: {
      returnTo: window.location.origin + '/auth',
    },
  });
  localStorage.removeItem('examreal_access_token');
}

/**
 * Tries to restore auth session from cache (on page load).
 * Returns null if no session exists.
 */
export async function restoreSession(): Promise<{ user: BackendUser; accessToken: string } | null> {
  try {
    const client = await getAuth0Client();
    const isAuthenticated = await client.isAuthenticated();

    if (!isAuthenticated) {
      return null;
    }

    const accessToken = await client.getTokenSilently();
    const user = await syncUserWithBackend(accessToken);
    return { user, accessToken };
  } catch {
    return null;
  }
}
