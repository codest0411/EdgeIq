import axios from 'axios';
import { supabase } from './supabase';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const api = axios.create({
  baseURL: `${API_URL}/api`,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add auth token to requests
api.interceptors.request.use(async (config) => {
  const { data: { session } } = await supabase.auth.getSession();
  
  if (session?.access_token) {
    config.headers.Authorization = `Bearer ${session.access_token}`;
  }
  
  return config;
});

// Handle response errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Redirect to login or refresh token
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;

// API methods
export const authAPI = {
  signup: (data) => api.post('/auth/signup', data),
  login: (data) => api.post('/auth/login', data),
  logout: () => api.post('/auth/logout'),
  getProfile: () => api.get('/auth/profile'),
  updateProfile: (data) => api.put('/auth/profile', data)
};

export const coursesAPI = {
  getAll: (params) => api.get('/courses', { params }),
  getById: (id) => api.get(`/courses/${id}`),
  create: (data) => api.post('/courses', data),
  update: (id, data) => api.put(`/courses/${id}`, data),
  delete: (id) => api.delete(`/courses/${id}`),
  getLesson: (lessonId) => api.get(`/courses/lessons/${lessonId}`),
  createLesson: (data) => api.post('/courses/lessons', data)
};

export const quizzesAPI = {
  getById: (quizId) => api.get(`/quizzes/${quizId}`),
  submit: (data) => api.post('/quizzes/submit', data),
  create: (data) => api.post('/quizzes', data),
  getAttempts: (quizId) => api.get(`/quizzes/${quizId}/attempts`)
};

export const progressAPI = {
  getForCourse: (courseId) => api.get(`/progress/${courseId}`),
  update: (data) => api.post('/progress/update', data),
  getUserProgress: () => api.get('/progress/user')
};

export const paymentsAPI = {
  createCheckout: (data) => api.post('/payments/create-checkout-session', data),
  getUserPayments: () => api.get('/payments/user')
};

export const aiAPI = {
  getInsights: (userId) => api.get(`/ai/insights/${userId}`)
};

export const leaderboardAPI = {
  get: (params) => api.get('/leaderboard', { params }),
  getUserRank: (userId, params) => api.get(`/leaderboard/rank/${userId}`, { params })
};

export const certificatesAPI = {
  getUserCertificates: () => api.get('/certificates/user'),
  getById: (certId) => api.get(`/certificates/${certId}`),
  verify: (certId) => api.get(`/certificates/${certId}/verify`)
};

export const adminAPI = {
  getDashboardStats: () => api.get('/admin/dashboard/stats'),
  getAllUsers: (params) => api.get('/admin/users', { params }),
  updateUserRole: (userId, role) => api.put(`/admin/users/${userId}/role`, { role }),
  getRevenueStats: (params) => api.get('/admin/revenue', { params }),
  getCourseStats: () => api.get('/admin/courses/stats')
};
