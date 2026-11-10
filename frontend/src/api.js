const BASE = '';

function getToken() {
  return localStorage.getItem('cthulhu_token');
}

function authHeaders() {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function apiFetch(path, options = {}) {
  const { body, method = 'GET', isFormData = false } = options;
  const headers = { ...authHeaders() };
  if (!isFormData) {
    headers['Content-Type'] = 'application/json';
  }

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: isFormData ? body : body ? JSON.stringify(body) : undefined,
  });

  if (res.status === 401) {
    localStorage.removeItem('cthulhu_token');
    localStorage.removeItem('cthulhu_user');
    window.location.href = '/login';
    throw new Error('Unauthorized');
  }

  // Safely parse JSON — backend may return HTML on 500 errors
  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(res.ok ? 'Invalid server response' : `Server error (${res.status})`);
  }

  if (!res.ok) {
    throw new Error(data.detail || `Request failed (${res.status})`);
  }
  return data;
}

export function saveAuth(tokenData) {
  localStorage.setItem('cthulhu_token', tokenData.access_token);
  localStorage.setItem(
    'cthulhu_user',
    JSON.stringify({
      id: tokenData.user_id,
      username: tokenData.username,
      display_name: tokenData.display_name,
      is_approved: tokenData.is_approved || false,
      is_admin: tokenData.is_admin || false,
    })
  );
}

export function getUser() {
  const raw = localStorage.getItem('cthulhu_user');
  return raw ? JSON.parse(raw) : null;
}

export function logout() {
  localStorage.removeItem('cthulhu_token');
  localStorage.removeItem('cthulhu_user');
}

export function isLoggedIn() {
  return !!getToken();
}
