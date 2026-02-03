/**
 * Centralized API Configuration
 * 
 * This file serves as the single source of truth for the backend API URL.
 * To change the API URL for the entire application, update the VITE_API_URL 
 * variable in your .env file.
 */

// Get the API URL from environment variables, or default to localhost:5000
export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// Helper to get full endpoints
export const getEndpoint = (path: string) => {
    // Remove leading slash if present to avoid double slashes
    const cleanPath = path.startsWith('/') ? path.slice(1) : path;
    return `${API_BASE_URL}/${cleanPath}`;
};
