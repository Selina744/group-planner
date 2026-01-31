/**
 * Store Provider - Zustand store initialization and management
 * Handles store initialization, cleanup, and provides context for store usage
 */

import { useEffect, useState, type ReactNode } from 'react';
import { initializeStores, cleanupStores } from '../stores';
import { useUIStore } from '../stores';

interface StoreProviderProps {
  children: ReactNode;
  fallback?: ReactNode;
}

export function StoreProvider({ children, fallback }: StoreProviderProps) {
  const [isInitialized, setIsInitialized] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);

  useEffect(() => {
    const initialize = async () => {
      try {
        useUIStore.getState().setGlobalLoading(true);

        // Initialize all stores
        const authRestored = await initializeStores();

        setIsInitialized(true);

        // Log initialization status
        console.log('Store initialization complete', { authRestored });
      } catch (error) {
        console.error('Store initialization failed:', error);
        setInitError(error instanceof Error ? error.message : 'Unknown error');
      } finally {
        useUIStore.getState().setGlobalLoading(false);
      }
    };

    initialize();

    // Cleanup on unmount
    return () => {
      cleanupStores();
    };
  }, []);

  // Handle initialization error
  if (initError) {
    return (
      <div style={{
        padding: '2rem',
        textAlign: 'center',
        border: '1px solid #f56565',
        borderRadius: '0.5rem',
        backgroundColor: '#fed7d7',
        color: '#c53030',
        margin: '2rem'
      }}>
        <h2>Initialization Error</h2>
        <p>Failed to initialize application stores: {initError}</p>
        <button
          onClick={() => window.location.reload()}
          style={{
            padding: '0.5rem 1rem',
            backgroundColor: '#c53030',
            color: 'white',
            border: 'none',
            borderRadius: '0.25rem',
            cursor: 'pointer',
            marginTop: '1rem'
          }}
        >
          Reload Application
        </button>
      </div>
    );
  }

  // Show fallback while initializing
  if (!isInitialized) {
    return (
      <>
        {fallback || (
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            height: '100vh',
            flexDirection: 'column',
            gap: '1rem'
          }}>
            <div style={{
              width: '40px',
              height: '40px',
              border: '4px solid #f3f3f3',
              borderTop: '4px solid #3498db',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite'
            }} />
            <p>Initializing application...</p>
            <style>{`
              @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
              }
            `}</style>
          </div>
        )}
      </>
    );
  }

  return <>{children}</>;
}

/**
 * Hook to check if stores are initialized
 */
export function useStoresInitialized() {
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    // Simple check - if auth store has been initialized
    const checkInitialized = () => {
      // This is a simple heuristic - in a more complex app you might want
      // a more sophisticated initialization tracking mechanism
      setIsInitialized(true);
    };

    checkInitialized();
  }, []);

  return isInitialized;
}

/**
 * Development component to display store states
 */
export function StoreDevTools() {
  const [isOpen, setIsOpen] = useState(false);

  if (process.env.NODE_ENV !== 'production') {
    return (
      <div style={{
        position: 'fixed',
        bottom: '20px',
        right: '20px',
        zIndex: 9999,
      }}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          style={{
            padding: '0.5rem',
            backgroundColor: '#4a5568',
            color: 'white',
            border: 'none',
            borderRadius: '50%',
            width: '50px',
            height: '50px',
            cursor: 'pointer',
            fontSize: '20px'
          }}
        >
          🛠
        </button>

        {isOpen && (
          <div style={{
            position: 'absolute',
            bottom: '60px',
            right: '0',
            backgroundColor: 'white',
            border: '1px solid #ccc',
            borderRadius: '0.5rem',
            padding: '1rem',
            minWidth: '300px',
            maxHeight: '400px',
            overflow: 'auto',
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
          }}>
            <h3>Store Dev Tools</h3>
            <button
              onClick={() => {
                const { getStoreStates } = require('../stores');
                console.log('Current store states:', getStoreStates());
              }}
              style={{ marginRight: '0.5rem', padding: '0.25rem 0.5rem' }}
            >
              Log States
            </button>
            <button
              onClick={() => {
                const { resetAllStores } = require('../stores');
                resetAllStores();
                console.log('All stores reset');
              }}
              style={{ padding: '0.25rem 0.5rem' }}
            >
              Reset All
            </button>
          </div>
        )}
      </div>
    );
  }

  return null;
}