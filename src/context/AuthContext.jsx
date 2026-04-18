import React, { createContext, useState, useEffect } from 'react';
import axios from 'axios';
import sshClient from '../services/sshClient';

import { API_URL as BASE_URL } from '../config';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('rootmastr_token'));
  const [loading, setLoading] = useState(true);

  const API_URL = `${BASE_URL}/api/auth`;

  useEffect(() => {
    if (token) {
      localStorage.setItem('rootmastr_token', token);
      sshClient.setToken(token);
      fetchMe();
    } else {
      localStorage.removeItem('rootmastr_token');
      sshClient.setToken(null);
      setLoading(false);
    }
  }, [token]);

  const fetchMe = async () => {
    try {
      const response = await axios.get(`${API_URL}/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUser(response.data);
    } catch (error) {
      console.error('Failed to fetch user', error);
      logout();
    } finally {
      setLoading(false);
    }
  };

  const login = async (username, password) => {
    try {
      const response = await axios.post(`${API_URL}/login`, { username, password });
      const newToken = response.data.token;
      setToken(newToken);
      setUser(response.data);
      sshClient.setToken(newToken);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || 'Login failed',
      };
    }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('rootmastr_token');
    sshClient.setToken(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};
