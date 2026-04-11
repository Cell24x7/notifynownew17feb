import axios from 'axios';
import { API_BASE_URL } from './api';

const instance = axios.create({
  baseURL: API_BASE_URL,
  transformResponse: [
    (data) => {
      if (typeof data === 'string' && (data.trim().startsWith('{') || data.trim().startsWith('['))) {
        try {
          // Attempt to find the boundary of the JSON object/array
          // to skip any leading/trailing garbage (like server logs)
          const start = data.indexOf(data.trim().startsWith('{') ? '{' : '[');
          const end = data.lastIndexOf(data.trim().startsWith('{') ? '}' : ']');
          
          if (start !== -1 && end !== -1) {
            const cleanData = data.substring(start, end + 1);
            return JSON.parse(cleanData);
          }
        } catch (e) {
          // If our extraction fails, fall back to standard parsing
          try { return JSON.parse(data); } catch(i) { return data; }
        }
      }
      return data;
    }
  ],
});

// Add a request interceptor to include the auth token
instance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Add a response interceptor to handle global errors (like 401)
instance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && (error.response.status === 401 || error.response.status === 403)) {
      // Global redirect to login on session expiry
      console.warn('Session expired or unauthorized. Logging out...');
      
      const isAuthPage = window.location.pathname.includes('/auth');
      
      if (!isAuthPage) {
        localStorage.removeItem('authToken');
        // Notify user clearly
        alert('Your session has expired. Please login again to continue.');
        window.location.href = '/auth';
      }
    }
    return Promise.reject(error);
  }
);

export default instance;
