import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Onboarding from './components/Onboarding';
import MainApp from './components/MainApp';
import { getCurrentUser, clearAuth } from './lib/api';
import { SettingsProvider } from './contexts/SettingsContext';
import { AuthProvider } from './contexts/AuthContext';

export default function App() {
  const [user, setUser] = useState(getCurrentUser());

  useEffect(() => {
    setUser(getCurrentUser());
  }, []);

  return (
    <AuthProvider>
      <SettingsProvider>
        <BrowserRouter>
          <Routes>
            <Route 
              path="/" 
              element={!user ? <Onboarding onLogin={() => setUser(getCurrentUser())} /> : <Navigate to="/app" replace />} 
            />
            <Route 
              path="/app" 
              element={user ? <MainApp /> : <Navigate to="/" replace />} 
            />
          </Routes>
        </BrowserRouter>
      </SettingsProvider>
    </AuthProvider>
  );
}

