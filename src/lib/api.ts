import axios from 'axios';

// Prefer env, else same-origin + '/api'
const API_BASE = `http://103.150.136.190:3001/api`;

export const api = axios.create({
  baseURL: API_BASE,      // → http://localhost/api
  withCredentials: true,  // set true if you use cookies
});

// Attach token from localStorage automatically
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});