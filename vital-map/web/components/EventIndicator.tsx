/**
 * EventIndicator component
 * 
 * Visual indicator for "happening now" events with temporal information.
 */

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface EventIndicatorProps {
  /** Whether the event is currently happening */
  isHappeningNow: boolean;
  /** Event start time (ISO string) */
  eventStart?: string;
  /** Event end time (ISO string) */
  eventEnd?: string;
  /** Optional className for styling */
  className?: string;
}

/**
 * Component that displays event temporal status
 * 
 * Shows "Happening Now" badge with optional time range.
 * Uses shadcn/ui Badge component.
 */
export function EventIndicator({
  isHappeningNow,
  eventStart,
  eventEnd,
  className = '',
}: EventIndicatorProps) {
  if (!isHappeningNow) {
    return null;
  }

  // Format time range if available
  let timeRange = '';
  if (eventStart && eventEnd) {
    try {
      const start = new Date(eventStart);
      const end = new Date(eventEnd);
      const startTime = start.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
      });
      const endTime = end.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
      });
      timeRange = `${startTime} - ${endTime}`;
    } catch {
      // Invalid date format, skip time range
    }
  }

  return (
    <Badge
      variant="default"
      className={cn('gap-2 animate-pulse', className)}
      title={timeRange ? `Event time: ${timeRange}` : 'Happening now'}
    >
      <span className="w-2 h-2 bg-white rounded-full"></span>
      <span>Happening Now</span>
      {timeRange && <span className="opacity-80">({timeRange})</span>}
    </Badge>
  );
}
