'use client';

import { useState } from 'react';
import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StarRatingProps {
  value: number;
  onChange: (rating: number) => void;
  readonly?: boolean;
}

export function StarRating({ value, onChange, readonly = false }: StarRatingProps) {
  const [hoverRating, setHoverRating] = useState(0);

  const handleClick = (rating: number) => {
    if (!readonly) {
      onChange(rating);
    }
  };

  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => {
        const filled = star <= (hoverRating || value);
        return (
          <button
            key={star}
            type="button"
            onClick={() => handleClick(star)}
            onMouseEnter={() => !readonly && setHoverRating(star)}
            onMouseLeave={() => setHoverRating(0)}
            disabled={readonly}
            className={cn(
              'transition-transform',
              !readonly && 'cursor-pointer hover:scale-110',
              readonly && 'cursor-default'
            )}
          >
            <Star
              className={cn(
                'h-6 w-6 transition-colors',
                filled ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'
              )}
            />
          </button>
        );
      })}
    </div>
  );
}
