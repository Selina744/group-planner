/**
 * Main App component with React Router integration
 * Provides authentication context and global state management
 */

import { BrowserRouter } from 'react-router-dom';
import { Box } from '@mui/material';

import { AuthProvider } from './contexts/AuthContext';
import { StoreProvider, StoreDevTools, QueryProvider } from './providers';
import AppRouter from './components/AppRouter';

function App() {
  return (
    <BrowserRouter>
      <QueryProvider>
        <StoreProvider>
          <AuthProvider>
            <Box sx={{ minHeight: '100vh' }}>
              <AppRouter />
            </Box>

            {/* Development tools - only shows in development */}
            <StoreDevTools />
          </AuthProvider>
        </StoreProvider>
      </QueryProvider>
    </BrowserRouter>
  );
}

export default App;