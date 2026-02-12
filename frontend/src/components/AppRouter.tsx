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
  ForgotPasswordPage,
  ResetPasswordPage,
  DashboardPage,
  CreateTripPage,
  TripDetailsPage,
  EditTripPage,
  JoinTripPage,
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
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route path="/join" element={<JoinTripPage />} />
      <Route path="/join/:code" element={<JoinTripPage />} />
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

      {/* Trip Edit Page */}
      <Route
        path="/trips/:id/edit"
        element={
          <ProtectedRoute>
            <EditTripPage />
          </ProtectedRoute>
        }
      />

      {/* Trip Details Page */}
      <Route
        path="/trips/:id"
        element={
          <ProtectedRoute>
            <TripDetailsPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/trips"
        element={
          <ProtectedRoute>
            <Navigate to="/dashboard" replace />
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
