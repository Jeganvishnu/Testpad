import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { NotificationProvider } from './components/common/NotificationSystem';
import ProtectedRoute from './components/common/ProtectedRoute';
import ErrorBoundary from './components/common/ErrorBoundary';
import LoginForm from './components/auth/LoginForm';
import AdminLoginForm from './components/auth/AdminLoginForm';
import AdminRegisterForm from './components/auth/AdminRegisterForm';
import RegisterForm from './components/auth/RegisterForm';
import EmailVerification from './components/auth/EmailVerification';
import Dashboard from './components/student/Dashboard';
import TestInterface from './components/student/TestInterface';
import ProgrammingTestInterface from './components/student/ProgrammingTestInterface';
import TestResult from './components/student/TestResult';
import Leaderboard from './components/student/Leaderboard';
import Profile from './components/student/Profile';
import AdminDashboard from './components/admin/AdminDashboard';
import AboutUs from './pages/AboutUs';
import ContactUs from './pages/ContactUs';

function App() {
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('theme') === 'dark' ||
        (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches);
    }
    return false;
  });

  // Initialize theme on app load
  useEffect(() => {
    const initializeTheme = () => {
      const root = document.documentElement;
      const body = document.body;

      if (isDarkMode) {
        root.classList.add('dark');
        root.setAttribute('data-theme', 'dark');
        body.style.backgroundColor = '#0a0a0a';
        body.style.color = '#ffffff';
      } else {
        root.classList.remove('dark');
        root.setAttribute('data-theme', 'light');
        body.style.backgroundColor = '#ffffff';
        body.style.color = '#1e293b';
      }
    };

    initializeTheme();

    // Listen for theme changes from navbar
    const handleThemeChange = (event: CustomEvent) => {
      setIsDarkMode(event.detail.isDark);
    };

    window.addEventListener('themeChange', handleThemeChange as EventListener);
    return () => {
      window.removeEventListener('themeChange', handleThemeChange as EventListener);
    };
  }, [isDarkMode]);

  return (
    <ErrorBoundary>
      <NotificationProvider>
        <AuthProvider>
          <Router>
            <div className="App min-h-screen transition-colors duration-300">
              <Routes>
                {/* Auth Routes */}
                <Route path="/login" element={<LoginForm />} />
                <Route path="/register" element={<RegisterForm />} />
                <Route path="/admin/login" element={<AdminLoginForm />} />
                <Route
                  path="/verify-email"
                  element={
                    <ProtectedRoute>
                      <EmailVerification />
                    </ProtectedRoute>
                  }
                />

                {/* Public Routes */}
                <Route path="/about" element={<AboutUs />} />
                <Route path="/contact" element={<ContactUs />} />

                {/* Student Routes */}
                <Route
                  path="/dashboard"
                  element={<Dashboard />}
                />
                <Route
                  path="/test/:testId"
                  element={
                    <ProtectedRoute>
                      <TestInterface />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/programming-test/:testId"
                  element={
                    <ProtectedRoute>
                      <ProgrammingTestInterface />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/result/:testId"
                  element={
                    <ProtectedRoute>
                      <TestResult />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/leaderboard"
                  element={
                    <ProtectedRoute>
                      <Leaderboard />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/profile/:userId"
                  element={
                    <ProtectedRoute>
                      <Profile />
                    </ProtectedRoute>
                  }
                />

                {/* Admin Routes */}
                <Route
                  path="/admin"
                  element={
                    <ProtectedRoute requireAdmin>
                      <AdminDashboard />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/create-admin"
                  element={
                    <ProtectedRoute requireAdmin>
                      <AdminRegisterForm />
                    </ProtectedRoute>
                  }
                />

                {/* Default Route */}
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
              </Routes>
            </div>
          </Router>
        </AuthProvider>
      </NotificationProvider>
    </ErrorBoundary>
  );
}

export default App;