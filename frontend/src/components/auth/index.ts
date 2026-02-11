/**
 * Auth components exports
 * Centralized exports for all authentication-related components
 */

export { LoginForm } from './LoginForm';
export { RegisterForm } from './RegisterForm';

// Protected route components and utilities
export {
  ProtectedRoute,
  createRoleProtectedRoute,
  AdminRoute,
  ModeratorRoute,
  useUserPermissions,
  type UserRole,
} from './ProtectedRoute';