// In development, this comes from .env (localhost:5000)
// In production, this comes from .env.production (https://api.pingchannel.com)
// FALLBACK: Use window location or hardcoded localhost if env var fails
export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// Helper to get full endpoints
export const getEndpoint = (path: string) => {
    // Remove leading slash if present to avoid double slashes
    const cleanPath = path.startsWith('/') ? path.slice(1) : path;
    return `${API_BASE_URL}/${cleanPath}`;
};
