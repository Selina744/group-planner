import type { ReactNode } from 'react'
import {
  Explore,
  Group,
  Event,
  FavoriteBorder,
  Public,
  CalendarMonth,
  CheckCircle
} from '@mui/icons-material'

export type FeatureHighlight = {
  title: string
  description: string
  icon: ReactNode
  accent: 'primary' | 'secondary'
}

export const featureHighlights: FeatureHighlight[] = [
  {
    title: 'Discover destinations you love',
    description:
      'Browse curated travel ideas, add the ones you love, and loop your group in with a shared shortlist.',
    icon: <Explore fontSize="inherit" />,
    accent: 'primary'
  },
  {
    title: 'Collaborate with every trip member',
    description:
      'Share itineraries, vote on plans, and spotlight hosts versus co-hosts with rich member roles.',
    icon: <Group fontSize="inherit" />,
    accent: 'secondary'
  },
  {
    title: 'Plan events and timelines',
    description:
      'Create events, proposals, and reminders while keeping the whole group synced with conflicts highlighted.',
    icon: <Event fontSize="inherit" />,
    accent: 'primary'
  },
  {
    title: 'Track essentials & shared items',
    description:
      'Claim gear, note quantities, and mark essentials so everyone knows what still needs to be packed.',
    icon: <FavoriteBorder fontSize="inherit" />,
    accent: 'secondary'
  },
  {
    title: 'Host dashboards & permissions',
    description:
      'Hosts get full visibility while co-hosts help manage approvals, all through obvious RBAC rules.',
    icon: <Public fontSize="inherit" />,
    accent: 'primary'
  },
  {
    title: 'Stay ahead of timelines',
    description:
      'Color-coded status, automated reminders, and a shared clock stop inattentive planning from derailing.',
    icon: <CalendarMonth fontSize="inherit" />,
    accent: 'secondary'
  },
  {
    title: 'Feel confident & secure',
    description:
      'JWT auth, rate limiting, and structured errors keep your data safe so you can focus on fun.',
    icon: <CheckCircle fontSize="inherit" />,
    accent: 'primary'
  }
]
