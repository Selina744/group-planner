/**
 * Zustand UI store - global UI state management
 * Handles modals, loading states, theme, navigation, and other UI-related state
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

// Modal types
export type ModalType =
  | 'login'
  | 'register'
  | 'createTrip'
  | 'editTrip'
  | 'deleteTrip'
  | 'inviteMember'
  | 'createEvent'
  | 'editEvent'
  | 'deleteEvent'
  | 'profile'
  | 'settings'
  | 'confirmation';

// Modal state
interface ModalState {
  isOpen: boolean;
  type: ModalType | null;
  data?: any; // Additional data passed to modal
  onClose?: () => void; // Custom close handler
}

// Theme mode
export type ThemeMode = 'light' | 'dark' | 'system';

// Navigation state
interface NavigationState {
  sidebarOpen: boolean;
  activeTab: string | null;
  breadcrumbs: Array<{ label: string; href?: string }>;
}

// Loading state for different operations
interface LoadingState {
  global: boolean;
  auth: boolean;
  trips: boolean;
  events: boolean;
  [key: string]: boolean; // Allow dynamic loading keys
}

// UI preferences
interface UIPreferences {
  theme: ThemeMode;
  density: 'compact' | 'standard' | 'comfortable';
  language: string;
  dateFormat: 'MM/DD/YYYY' | 'DD/MM/YYYY' | 'YYYY-MM-DD';
  timeFormat: '12h' | '24h';
  currency: string;
  timezone: string;
}

// Confirmation dialog state
interface ConfirmationDialog {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm?: () => void | Promise<void>;
  onCancel?: () => void;
  variant?: 'warning' | 'danger' | 'info';
}

// UI store state
interface UIState {
  // Modal management
  modal: ModalState;

  // Navigation
  navigation: NavigationState;

  // Loading states
  loading: LoadingState;

  // Global error state
  error: string | null;

  // User preferences
  preferences: UIPreferences;

  // Confirmation dialog
  confirmation: ConfirmationDialog;

  // Search state
  search: {
    isOpen: boolean;
    query: string;
    results: any[];
    isSearching: boolean;
  };

  // Page metadata
  page: {
    title: string;
    description?: string;
  };

  // Device/viewport info
  viewport: {
    isMobile: boolean;
    isTablet: boolean;
    isDesktop: boolean;
    width: number;
    height: number;
  };
}

// UI store actions
interface UIActions {
  // Modal management
  openModal: (type: ModalType, data?: any, onClose?: () => void) => void;
  closeModal: () => void;
  setModalData: (data: any) => void;

  // Navigation
  setSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;
  setActiveTab: (tab: string | null) => void;
  setBreadcrumbs: (breadcrumbs: NavigationState['breadcrumbs']) => void;
  addBreadcrumb: (breadcrumb: { label: string; href?: string }) => void;

  // Loading states
  setLoading: (key: string, loading: boolean) => void;
  setGlobalLoading: (loading: boolean) => void;

  // Error handling
  setError: (error: string | null) => void;
  clearError: () => void;

  // Preferences
  updatePreferences: (preferences: Partial<UIPreferences>) => void;
  setTheme: (theme: ThemeMode) => void;
  setLanguage: (language: string) => void;
  setDensity: (density: UIPreferences['density']) => void;

  // Confirmation dialog
  showConfirmation: (options: Omit<ConfirmationDialog, 'isOpen'>) => void;
  hideConfirmation: () => void;
  confirmAction: () => void;

  // Search
  openSearch: () => void;
  closeSearch: () => void;
  setSearchQuery: (query: string) => void;
  setSearchResults: (results: any[]) => void;
  setSearching: (searching: boolean) => void;

  // Page metadata
  setPageTitle: (title: string) => void;
  setPageDescription: (description: string) => void;

  // Viewport
  updateViewport: (viewport: Partial<UIState['viewport']>) => void;

  // Utility actions
  reset: () => void;
  resetNavigation: () => void;
}

type UIStore = UIState & UIActions;

// Default preferences
const defaultPreferences: UIPreferences = {
  theme: 'system',
  density: 'standard',
  language: 'en',
  dateFormat: 'MM/DD/YYYY',
  timeFormat: '12h',
  currency: 'USD',
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
};

// Initial state
const initialState: UIState = {
  modal: {
    isOpen: false,
    type: null,
  },
  navigation: {
    sidebarOpen: false,
    activeTab: null,
    breadcrumbs: [],
  },
  loading: {
    global: false,
    auth: false,
    trips: false,
    events: false,
  },
  error: null,
  preferences: defaultPreferences,
  confirmation: {
    isOpen: false,
    title: '',
    message: '',
  },
  search: {
    isOpen: false,
    query: '',
    results: [],
    isSearching: false,
  },
  page: {
    title: 'Group Planner',
  },
  viewport: {
    isMobile: false,
    isTablet: false,
    isDesktop: true,
    width: 1920,
    height: 1080,
  },
};

export const useUIStore = create<UIStore>()(
  persist(
    (set, get) => ({
      ...initialState,

      // Modal management
      openModal: (type, data, onClose) => {
        set({
          modal: {
            isOpen: true,
            type,
            ...(data && { data }),
            ...(onClose && { onClose }),
          },
        });
      },

      closeModal: () => {
        const { modal } = get();
        if (modal.onClose) {
          modal.onClose();
        }
        set({
          modal: {
            isOpen: false,
            type: null,
          },
        });
      },

      setModalData: (data) => {
        set(state => ({
          modal: { ...state.modal, data },
        }));
      },

      // Navigation
      setSidebarOpen: (open) => {
        set(state => ({
          navigation: { ...state.navigation, sidebarOpen: open },
        }));
      },

      toggleSidebar: () => {
        set(state => ({
          navigation: {
            ...state.navigation,
            sidebarOpen: !state.navigation.sidebarOpen,
          },
        }));
      },

      setActiveTab: (tab) => {
        set(state => ({
          navigation: { ...state.navigation, activeTab: tab },
        }));
      },

      setBreadcrumbs: (breadcrumbs) => {
        set(state => ({
          navigation: { ...state.navigation, breadcrumbs },
        }));
      },

      addBreadcrumb: (breadcrumb) => {
        set(state => ({
          navigation: {
            ...state.navigation,
            breadcrumbs: [...state.navigation.breadcrumbs, breadcrumb],
          },
        }));
      },

      // Loading states
      setLoading: (key, loading) => {
        set(state => ({
          loading: { ...state.loading, [key]: loading },
        }));
      },

      setGlobalLoading: (loading) => {
        set(state => ({
          loading: { ...state.loading, global: loading },
        }));
      },

      // Error handling
      setError: (error) => {
        set({ error });
      },

      clearError: () => {
        set({ error: null });
      },

      // Preferences
      updatePreferences: (newPreferences) => {
        set(state => ({
          preferences: { ...state.preferences, ...newPreferences },
        }));
      },

      setTheme: (theme) => {
        set(state => ({
          preferences: { ...state.preferences, theme },
        }));
      },

      setLanguage: (language) => {
        set(state => ({
          preferences: { ...state.preferences, language },
        }));
      },

      setDensity: (density) => {
        set(state => ({
          preferences: { ...state.preferences, density },
        }));
      },

      // Confirmation dialog
      showConfirmation: (options) => {
        set({
          confirmation: {
            isOpen: true,
            confirmText: 'Confirm',
            cancelText: 'Cancel',
            variant: 'info',
            ...options,
          },
        });
      },

      hideConfirmation: () => {
        set({
          confirmation: {
            isOpen: false,
            title: '',
            message: '',
          },
        });
      },

      confirmAction: () => {
        const { confirmation } = get();
        if (confirmation.onConfirm) {
          const result = confirmation.onConfirm();
          // Handle async confirmations
          if (result instanceof Promise) {
            result.finally(() => get().hideConfirmation());
          } else {
            get().hideConfirmation();
          }
        } else {
          get().hideConfirmation();
        }
      },

      // Search
      openSearch: () => {
        set(state => ({
          search: { ...state.search, isOpen: true },
        }));
      },

      closeSearch: () => {
        set(state => ({
          search: { ...state.search, isOpen: false, query: '', results: [] },
        }));
      },

      setSearchQuery: (query) => {
        set(state => ({
          search: { ...state.search, query },
        }));
      },

      setSearchResults: (results) => {
        set(state => ({
          search: { ...state.search, results },
        }));
      },

      setSearching: (isSearching) => {
        set(state => ({
          search: { ...state.search, isSearching },
        }));
      },

      // Page metadata
      setPageTitle: (title) => {
        set(state => ({
          page: { ...state.page, title },
        }));

        // Update document title
        if (typeof document !== 'undefined') {
          document.title = title;
        }
      },

      setPageDescription: (description) => {
        set(state => ({
          page: { ...state.page, description },
        }));
      },

      // Viewport
      updateViewport: (viewportUpdate) => {
        set(state => ({
          viewport: { ...state.viewport, ...viewportUpdate },
        }));
      },

      // Utility actions
      reset: () => {
        set(initialState);
      },

      resetNavigation: () => {
        set(() => ({
          navigation: initialState.navigation,
        }));
      },
    }),
    {
      name: 'ui-store',
      storage: createJSONStorage(() => localStorage),
      // Persist preferences and some navigation state
      partialize: (state) => ({
        preferences: state.preferences,
        navigation: {
          sidebarOpen: state.navigation.sidebarOpen,
        },
      }),
    }
  )
);

// Selector hooks for optimized re-renders
export const useModal = () => useUIStore(state => state.modal);
export const useNavigation = () => useUIStore(state => state.navigation);
export const useUILoading = () => useUIStore(state => state.loading);
export const useUIError = () => useUIStore(state => state.error);
export const useUIPreferences = () => useUIStore(state => state.preferences);
export const useConfirmation = () => useUIStore(state => state.confirmation);
export const useSearch = () => useUIStore(state => state.search);
export const usePage = () => useUIStore(state => state.page);
export const useViewport = () => useUIStore(state => state.viewport);

// Specific selectors
export const useTheme = () => useUIStore(state => state.preferences.theme);
export const useIsSidebarOpen = () => useUIStore(state => state.navigation.sidebarOpen);
export const useIsGlobalLoading = () => useUIStore(state => state.loading.global);

// Action selectors
export const useModalActions = () => useUIStore(state => ({
  openModal: state.openModal,
  closeModal: state.closeModal,
  setModalData: state.setModalData,
}));

export const useNavigationActions = () => useUIStore(state => ({
  setSidebarOpen: state.setSidebarOpen,
  toggleSidebar: state.toggleSidebar,
  setActiveTab: state.setActiveTab,
  setBreadcrumbs: state.setBreadcrumbs,
  addBreadcrumb: state.addBreadcrumb,
}));

export const useUIActions = () => useUIStore(state => ({
  setLoading: state.setLoading,
  setGlobalLoading: state.setGlobalLoading,
  setError: state.setError,
  clearError: state.clearError,
  updatePreferences: state.updatePreferences,
  setTheme: state.setTheme,
  showConfirmation: state.showConfirmation,
  hideConfirmation: state.hideConfirmation,
  setPageTitle: state.setPageTitle,
  updateViewport: state.updateViewport,
}));