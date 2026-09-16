/**
 * API configuration for SIF-SHIELD (Standalone Frontend Mode).
 * All /api/* calls are intercepted by the client-side mock service.
 * No backend server is required.
 */
export const API_BASE_URL = '';

export const apiUrl = (path: string): string => {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE_URL}${cleanPath}`;
};

export default apiUrl;
