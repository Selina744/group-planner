/**
 * Demo Page - showcase Zustand store functionality
 * Interactive examples and demonstrations
 */

import { Container, Typography, Box, Button } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { ArrowBack } from '@mui/icons-material';

import { StoreUsageExamples } from '../examples/StoreUsageExamples';

export function DemoPage() {
  const navigate = useNavigate();

  const handleGoBack = () => {
    navigate(-1);
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      {/* Header */}
      <Box sx={{ py: 3, borderBottom: 1, borderColor: 'divider' }}>
        <Container maxWidth="lg">
          <Box display="flex" alignItems="center" gap={2}>
            <Button
              startIcon={<ArrowBack />}
              onClick={handleGoBack}
              variant="text"
            >
              Back
            </Button>
            <Typography variant="h4" component="h1">
              Store Demo & Examples
            </Typography>
          </Box>
        </Container>
      </Box>

      {/* Content */}
      <StoreUsageExamples />
    </Box>
  );
}

export default DemoPage;