/**
 * Enhanced ProtectedRoute component for authentication and role-based access control
 * Provides comprehensive auth guards for the application routing system
 */

import { useEffect, type ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { Box, CircularProgress, Typography, Alert } from '@mui/material';
import type { User } from '../../types/auth';

// Role types for type safety
export type UserRole = 'admin' | 'moderator' | 'user' | string;

// Props interface with optional role-based access control
interface ProtectedRouteProps {
  children: ReactNode;
  /** Optional roles that are allowed to access this route */
  roles?: UserRole[];
  /** Optional custom unauthorized component */
  unauthorizedComponent?: ReactNode;
  /** Optional redirect path for unauthorized users (defaults to /login) */
  redirectTo?: string;
  /** Whether to show loading state during auth check */
  showLoading?: boolean;
}

/**
 * Helper function to extract user role from user object
 * Checks preferences.role first, falls back to 'user' default
 */
function getUserRole(user: User | null): UserRole {
  if (!user) return 'user';

  // Check if role is stored in preferences
  if (user.preferences && typeof user.preferences.role === 'string') {
    return user.preferences.role as UserRole;
  }

  // Default role
  return 'user';
}

/**
 * Helper function to check if user has required role
 */
function hasRequiredRole(user: User | null, requiredRoles?: UserRole[]): boolean {
  if (!requiredRoles || requiredRoles.length === 0) {
    // No role requirements
    return true;
  }

  const userRole = getUserRole(user);
  return requiredRoles.includes(userRole);
}

/**
 * Default unauthorized component
 */
function DefaultUnauthorized({ userRole, requiredRoles }: { userRole: UserRole; requiredRoles: UserRole[] }) {
  return (
    <Box
      display="flex"
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
      minHeight="50vh"
      gap={2}
      padding={3}
    >
      <Alert severity="error" sx={{ maxWidth: 500 }}>
        <Typography variant="h6" gutterBottom>
          Access Denied
        </Typography>
        <Typography variant="body2">
          You don't have permission to access this page.
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          Your role: {userRole} | Required: {requiredRoles.join(' or ')}
        </Typography>
      </Alert>
    </Box>
  );
}

/**
 * ProtectedRoute component with authentication and role-based access control
 */
export function ProtectedRoute({
  children,
  roles,
  unauthorizedComponent,
  redirectTo = '/login',
  showLoading = true
}: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, user, initialize } = useAuthStore();
  const location = useLocation();

  // Initialize auth state on mount if needed
  useEffect(() => {
    if (!user && !isLoading && !isAuthenticated) {
      initialize();
    }
  }, [user, isLoading, isAuthenticated, initialize]);

  // Show loading state while auth status is being determined
  if (isLoading && showLoading) {
    return (
      <Box
        display="flex"
        flexDirection="column"
        alignItems="center"
        justifyContent="center"
        minHeight="50vh"
        gap={2}
      >
        <CircularProgress size={40} />
        <Typography variant="body2" color="text.secondary">
          Verifying access...
        </Typography>
      </Box>
    );
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    // Save the attempted location for redirect after login
    return (
      <Navigate
        to={redirectTo}
        state={{ from: location }}
        replace
      />
    );
  }

  // Check role-based access if roles are specified
  if (roles && roles.length > 0) {
    const hasAccess = hasRequiredRole(user, roles);

    if (!hasAccess) {
      // Show unauthorized component or default unauthorized message
      if (unauthorizedComponent) {
        return <>{unauthorizedComponent}</>;
      }

      const userRole = getUserRole(user);
      return <DefaultUnauthorized userRole={userRole} requiredRoles={roles} />;
    }
  }

  // All checks passed - render protected content
  return <>{children}</>;
}

/**
 * Higher-order component factory for creating role-specific route guards
 */
export function createRoleProtectedRoute(requiredRoles: UserRole[]) {
  return function RoleProtectedRoute({ children, ...props }: Omit<ProtectedRouteProps, 'roles'>) {
    return (
      <ProtectedRoute roles={requiredRoles} {...props}>
        {children}
      </ProtectedRoute>
    );
  };
}

// Pre-defined role guards for common use cases
export const AdminRoute = createRoleProtectedRoute(['admin']);
export const ModeratorRoute = createRoleProtectedRoute(['admin', 'moderator']);

/**
 * Hook to check user permissions within components
 */
export function useUserPermissions() {
  const { user, isAuthenticated } = useAuthStore();
  const userRole = getUserRole(user);

  return {
    isAuthenticated,
    userRole,
    hasRole: (role: UserRole) => userRole === role,
    hasAnyRole: (roles: UserRole[]) => roles.includes(userRole),
    isAdmin: () => userRole === 'admin',
    isModerator: () => userRole === 'moderator' || userRole === 'admin',
  };
}

export default ProtectedRoute;