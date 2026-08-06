const API_BASE = window.location.origin.includes('5173') ? 'http://localhost:3001/api' : '/api';

export function getAuthToken(): string | null {
  return localStorage.getItem('dance_live_token');
}

export function setAuthToken(token: string | null) {
  if (token) {
    localStorage.setItem('dance_live_token', token);
  } else {
    localStorage.removeItem('dance_live_token');
  }
}

export function getStoredUser(): any {
  const u = localStorage.getItem('dance_live_user');
  try {
    return u ? JSON.parse(u) : null;
  } catch {
    return null;
  }
}

export function setStoredUser(user: any) {
  if (user) {
    localStorage.setItem('dance_live_user', JSON.stringify(user));
  } else {
    localStorage.removeItem('dance_live_user');
  }
}

export async function apiFetch(path: string, options: RequestInit = {}): Promise<any> {
  const token = getAuthToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  } as any;

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  if (res.status === 401) {
    setAuthToken(null);
    setStoredUser(null);
    // Silent reload to redirect to login
    window.location.reload();
    throw new Error('Unauthorized');
  }

  const text = await res.text();
  try {
    const data = JSON.parse(text);
    if (!res.ok) {
      throw new Error(data.error || 'Request failed');
    }
    return data;
  } catch {
    if (!res.ok) {
      throw new Error(text || 'Request failed');
    }
    return text;
  }
}
