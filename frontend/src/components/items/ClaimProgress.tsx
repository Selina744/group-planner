/**
 * ClaimProgress component - displays claim status with progress bar
 * Shows quantity claimed/needed visually
 */

import { Box, LinearProgress, Typography, Chip } from '@mui/material';
import { CheckCircle as CheckIcon } from '@mui/icons-material';

interface ClaimProgressProps {
  quantityNeeded: number;
  quantityClaimed: number;
  variant?: 'default' | 'compact';
}

export function ClaimProgress({
  quantityNeeded,
  quantityClaimed,
  variant = 'default',
}: ClaimProgressProps) {
  const progress = quantityNeeded > 0 ? (quantityClaimed / quantityNeeded) * 100 : 0;
  const isFulfilled = quantityClaimed >= quantityNeeded;
  const remaining = Math.max(0, quantityNeeded - quantityClaimed);

  if (variant === 'compact') {
    return (
      <Box display="flex" alignItems="center" gap={1}>
        <Chip
          {...(isFulfilled ? { icon: <CheckIcon /> } : {})}
          label={`${quantityClaimed}/${quantityNeeded}`}
          size="small"
          color={isFulfilled ? 'success' : 'default'}
          variant={isFulfilled ? 'filled' : 'outlined'}
        />
      </Box>
    );
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={0.5}>
        <Typography variant="body2" color="text.secondary">
          {isFulfilled ? 'Fully claimed' : `${remaining} needed`}
        </Typography>
        <Typography variant="body2" fontWeight={500}>
          {quantityClaimed}/{quantityNeeded}
        </Typography>
      </Box>
      <LinearProgress
        variant="determinate"
        value={Math.min(progress, 100)}
        color={isFulfilled ? 'success' : 'primary'}
        sx={{
          height: 8,
          borderRadius: 1,
          backgroundColor: 'action.hover',
        }}
      />
    </Box>
  );
}

export default ClaimProgress;
