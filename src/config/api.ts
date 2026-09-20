/**
 * API configuration for SIF-SHIELD.
 * Proxies /api/* requests to FastAPI backend on http://127.0.0.1:8000.
 */
export const API_BASE_URL = '';

export const apiUrl = (path: string): string => {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE_URL}${cleanPath}`;
};

export default apiUrl;
