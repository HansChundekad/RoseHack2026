/**
 * TrustScoreBadge component
 * 
 * Displays community trust score for decentralized verification.
 * Only shown for community resources (healers, farms, etc.)
 */

import { Badge } from '@/components/ui/badge';
import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TrustScoreBadgeProps {
  /** Trust score value (0-100) */
  score: number;
  /** Optional className for styling */
  className?: string;
}

/**
 * Component that displays a community trust score badge
 * 
 * Color coding:
 * - Green (80-100): High trust
 * - Yellow (50-79): Medium trust
 * - Red (0-49): Low trust
 * Uses shadcn/ui Badge component.
 */
export function TrustScoreBadge({
  score,
  className = '',
}: TrustScoreBadgeProps) {
  // Clamp score to valid range
  const clampedScore = Math.max(0, Math.min(100, score));

  // Determine variant based on score
  let variant: 'default' | 'secondary' | 'destructive' | 'outline' = 'destructive';
  if (clampedScore >= 80) {
    variant = 'default';
  } else if (clampedScore >= 50) {
    variant = 'secondary';
  }

  return (
    <Badge
      variant={variant}
      className={cn('gap-1', className)}
      title={`Community Trust Score: ${clampedScore}/100`}
    >
      <Star className="h-3 w-3 fill-current" />
      <span>{clampedScore}</span>
    </Badge>
  );
}
