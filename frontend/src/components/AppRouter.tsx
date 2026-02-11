/**
 * Main application router configuration
 * Handles all routes with proper protection and redirects
 */

import { Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute } from './auth';
import {
  LandingPage,
  LoginPage,
  RegisterPage,
  VerifyEmailPage,
  DashboardPage,
  CreateTripPage,
  DemoPage,
} from '../pages';

export function AppRouter() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/verify-email" element={<VerifyEmailPage />} />
      <Route path="/demo" element={<DemoPage />} />

      {/* Protected routes */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/trips/create"
        element={
          <ProtectedRoute>
            <CreateTripPage />
          </ProtectedRoute>
        }
      />

      {/* Placeholder routes for future implementation */}
      <Route
        path="/trips/:id"
        element={
          <ProtectedRoute>
            <div>Trip Detail Page (TODO: Implement bd-1x8)</div>
          </ProtectedRoute>
        }
      />

      <Route
        path="/trips"
        element={
          <ProtectedRoute>
            <div>Trip List Page (TODO: Implement)</div>
          </ProtectedRoute>
        }
      />

      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <div>Profile Page (TODO: Implement)</div>
          </ProtectedRoute>
        }
      />

      <Route
        path="/settings"
        element={
          <ProtectedRoute>
            <div>Settings Page (TODO: Implement)</div>
          </ProtectedRoute>
        }
      />

      {/* Catch-all redirect to dashboard for authenticated users, landing for others */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default AppRouter;