
// Get the API URL from environment variables, or default to localhost:5000
export const API_BASE_URL = `${window.location.protocol}//${window.location.hostname}:5000`;

// Helper to get full endpoints
export const getEndpoint = (path: string) => {
    // Remove leading slash if present to avoid double slashes
    const cleanPath = path.startsWith('/') ? path.slice(1) : path;
    return `${API_BASE_URL}/${cleanPath}`;
};
