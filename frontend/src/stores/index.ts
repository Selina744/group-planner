/**
 * Zustand stores - centralized exports
 * Single entry point for all stores and their hooks
 */

// Auth store
export {
  useAuthStore,
  useAuthUser,
  useIsAuthenticated,
  useAuthLoading,
  useAuthError,
  useAuthActions,
} from './authStore';

// Trip store
export {
  useTripStore,
  useTrips,
  useCurrentTrip,
  useCurrentTripMembers,
  useCurrentTripEvents,
  useTripLoading,
  useTripError,
  useTripSearchResults,
  useIsSearching,
  useTripActions,
} from './tripStore';

// Notification store
export {
  useNotificationStore,
  useNotifications,
  useUnreadNotifications,
  useUnreadCount,
  useToasts,
  useNotificationSettings,
  useNotificationActions,
  useToastActions,
  useTripNotificationActions,
} from './notificationStore';
export type { Notification, ToastNotification, NotificationType } from './notificationStore';

// UI store
export {
  useUIStore,
  useModal,
  useNavigation,
  useUILoading,
  useUIError,
  useUIPreferences,
  useConfirmation,
  useSearch,
  usePage,
  useViewport,
  useTheme,
  useIsSidebarOpen,
  useIsGlobalLoading,
  useModalActions,
  useNavigationActions,
  useUIActions,
} from './uiStore';
export type { ModalType, ThemeMode } from './uiStore';

// Store initialization and cleanup utilities
import { useAuthStore } from './authStore';
import { useTripStore } from './tripStore';
import { useNotificationStore } from './notificationStore';
import { useUIStore } from './uiStore';

/**
 * Initialize all stores - call this on app startup
 * Returns whether authentication was restored
 */
export const initializeStores = async (): Promise<boolean> => {
  try {
    // Initialize auth store (this will handle token restoration)
    const authRestored = await useAuthStore.getState().initialize();

    // Initialize UI store with viewport detection
    if (typeof window !== 'undefined') {
      const viewport = {
        width: window.innerWidth,
        height: window.innerHeight,
        isMobile: window.innerWidth < 768,
        isTablet: window.innerWidth >= 768 && window.innerWidth < 1024,
        isDesktop: window.innerWidth >= 1024,
      };
      useUIStore.getState().updateViewport(viewport);

      // Listen for viewport changes
      const handleResize = () => {
        const newViewport = {
          width: window.innerWidth,
          height: window.innerHeight,
          isMobile: window.innerWidth < 768,
          isTablet: window.innerWidth >= 768 && window.innerWidth < 1024,
          isDesktop: window.innerWidth >= 1024,
        };
        useUIStore.getState().updateViewport(newViewport);
      };

      window.addEventListener('resize', handleResize);

      // Store cleanup function for later
      (window as any).__storeCleanup = () => {
        window.removeEventListener('resize', handleResize);
      };
    }

    // Cleanup expired notifications
    useNotificationStore.getState().cleanup();

    return authRestored;
  } catch (error) {
    console.error('Failed to initialize stores:', error);
    return false;
  }
};

/**
 * Reset all stores to initial state
 */
export const resetAllStores = () => {
  useAuthStore.getState().reset();
  useTripStore.getState().reset();
  useNotificationStore.getState().reset();
  useUIStore.getState().reset();
};

/**
 * Cleanup stores and event listeners
 */
export const cleanupStores = () => {
  if (typeof window !== 'undefined' && (window as any).__storeCleanup) {
    (window as any).__storeCleanup();
  }
};

/**
 * Development helper to inspect all store states
 */
export const getStoreStates = () => {
  if (process.env.NODE_ENV !== 'development') {
    console.warn('getStoreStates should only be used in development');
    return;
  }

  return {
    auth: useAuthStore.getState(),
    trips: useTripStore.getState(),
    notifications: useNotificationStore.getState(),
    ui: useUIStore.getState(),
  };
};