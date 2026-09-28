const API_BASE_URL = "http://localhost:7788";

/*
|--------------------------------------------------------------------------
| CredTrack Django Session Utility
|--------------------------------------------------------------------------
| React communicates with Django.
| Django creates and manages the authenticated session.
|--------------------------------------------------------------------------
*/

function getCookie(name) {
  const cookies = document.cookie.split(";");

  for (const cookie of cookies) {
    const [key, ...valueParts] = cookie.trim().split("=");

    if (key === name) {
      return decodeURIComponent(valueParts.join("="));
    }
  }

  return null;
}

/*
|--------------------------------------------------------------------------
| Get CSRF Token
|--------------------------------------------------------------------------
*/

async function getCsrfToken() {
  const response = await fetch(
    `${API_BASE_URL}/api/auth/csrf/`,
    {
      method: "GET",
      credentials: "include",
    }
  );

  if (!response.ok) {
    throw new Error(
      "Unable to initialize the security token."
    );
  }

  const csrfToken = getCookie("csrftoken");

  if (!csrfToken) {
    throw new Error(
      "CSRF token was not provided by Django."
    );
  }

  return csrfToken;
}

/*
|--------------------------------------------------------------------------
| LOGIN
|--------------------------------------------------------------------------
*/

export async function loginUser(username, password, role) {
  const csrfToken = await getCsrfToken();

  const response = await fetch(
    `${API_BASE_URL}/api/auth/login/`,
    {
      method: "POST",

      headers: {
        "Content-Type": "application/json",
        "X-CSRFToken": csrfToken,
      },

      credentials: "include",

      body: JSON.stringify({
        username,
        password,
        role,
      }),
    }
  );

  let data = {};

  try {
    data = await response.json();
  } catch {
    data = {};
  }

  if (!response.ok) {
    throw new Error(
      data.error ||
      data.detail ||
      data.message ||
      `Login failed (${response.status}).`
    );
  }

  return data;
}

/*
|--------------------------------------------------------------------------
| CURRENT SESSION
|--------------------------------------------------------------------------
*/

export async function getCurrentSession() {
  const response = await fetch(
    `${API_BASE_URL}/api/auth/session/`,
    {
      method: "GET",
      credentials: "include",
    }
  );

  let data = {};

  try {
    data = await response.json();
  } catch {
    data = {};
  }

  if (!response.ok) {
    return {
      authenticated: false,
      user: null,
    };
  }

  return data;
}

/*
|--------------------------------------------------------------------------
| CHECK AUTHENTICATION
|--------------------------------------------------------------------------
*/

export async function isAuthenticated() {
  try {
    const session = await getCurrentSession();

    return session.authenticated === true;
  } catch (error) {
    console.error(
      "Session check failed:",
      error
    );

    return false;
  }
}

/*
|--------------------------------------------------------------------------
| GET CURRENT USER
|--------------------------------------------------------------------------
*/

export async function getCurrentUser() {
  try {
    const session = await getCurrentSession();

    if (!session.authenticated) {
      return null;
    }

    return session.user || null;
  } catch (error) {
    console.error(
      "Unable to get current user:",
      error
    );

    return null;
  }
}

/*
|--------------------------------------------------------------------------
| LOGOUT
|--------------------------------------------------------------------------
*/

export async function logoutUser() {
  try {
    const csrfToken = await getCsrfToken();

    const response = await fetch(
      `${API_BASE_URL}/api/auth/logout/`,
      {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
          "X-CSRFToken": csrfToken,
        },

        credentials: "include",
      }
    );

    if (!response.ok) {
      throw new Error(
        "Sign-out failed. Please try again."
      );
    }
  } catch (error) {
    window.alert(
      "Could not sign out securely. Check the server connection and retry."
    );

    throw error;
  }

  localStorage.removeItem("credtrackSession");
  sessionStorage.removeItem("credtrackSession");
}

/*
|--------------------------------------------------------------------------
| REQUIRE SESSION
|--------------------------------------------------------------------------
*/

export async function requireSession(
  requiredRole = null
) {
  try {
    const session = await getCurrentSession();

    if (!session.authenticated) {
      return {
        allowed: false,
        reason: "NOT_AUTHENTICATED",
        user: null,
      };
    }

    if (
      requiredRole &&
      session.user?.role &&
      session.user.role.toUpperCase() !==
        requiredRole.toUpperCase()
    ) {
      return {
        allowed: false,
        reason: "WRONG_ROLE",
        user: session.user,
      };
    }

    return {
      allowed: true,
      reason: "AUTHORIZED",
      user: session.user,
    };

  } catch (error) {
    console.error(
      "Session authorization failed:",
      error
    );

    return {
      allowed: false,
      reason: "SESSION_ERROR",
      user: null,
    };
  }
}

/*
|--------------------------------------------------------------------------
| PAGE CACHE PROTECTION
|--------------------------------------------------------------------------
*/

export function disablePageCache() {
  if (typeof window === "undefined") {
    return;
  }

  window.history.replaceState(
    null,
    "",
    window.location.href
  );

  window.addEventListener(
    "pageshow",
    (event) => {
      if (event.persisted) {
        window.location.reload();
      }
    }
  );
}

/*
|--------------------------------------------------------------------------
| DEFAULT EXPORT
|--------------------------------------------------------------------------
*/

export default {
  loginUser,
  getCurrentSession,
  isAuthenticated,
  getCurrentUser,
  logoutUser,
  requireSession,
  disablePageCache,
};