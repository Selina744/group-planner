import { Card, CardContent, Typography, Box } from '@mui/material'
import type { FeatureHighlight } from '../utils/features'

type Props = {
  feature: FeatureHighlight
}

export default function FeatureCard({ feature }: Props) {
  const accentColor = feature.accent === 'primary' ? 'primary.main' : 'secondary.main'

  return (
    <Card
      sx={(theme) => ({
        minHeight: 220,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        border: `1px solid ${theme.palette.divider}`,
        '&:hover': {
          borderColor: accentColor,
          boxShadow: theme.shadows[4],
        },
      })}
      elevation={0}
    >
      <CardContent>
        <Box
          sx={{
            width: 48,
            height: 48,
            borderRadius: '50%',
            backgroundColor: accentColor,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'common.white',
            mb: 2,
          }}
        >
          {feature.icon}
        </Box>
        <Typography variant="h6" component="h3" gutterBottom>
          {feature.title}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {feature.description}
        </Typography>
      </CardContent>
    </Card>
  )
}
