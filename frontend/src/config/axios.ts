import axios from 'axios';
import { API_BASE_URL } from './api';

const instance = axios.create({
  baseURL: API_BASE_URL,
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
      localStorage.removeItem('authToken');
      // Only redirect if not already on the auth page
      if (!window.location.pathname.includes('/auth')) {
        window.location.href = '/auth';
      }
    }
    return Promise.reject(error);
  }
);

export default instance;
