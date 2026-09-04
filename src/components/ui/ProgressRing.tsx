import { cn } from '@/lib/utils';

interface ProgressRingProps {
  value: number;
  size?: number;
  strokeWidth?: number;
  trackColor?: string;
  indicatorColor?: string;
  showLabel?: boolean;
  className?: string;
  labelClassName?: string;
}

export default function ProgressRing({
  value,
  size = 40,
  strokeWidth = 4,
  trackColor = '#D8DFEC',
  indicatorColor,
  showLabel = true,
  className,
  labelClassName,
}: ProgressRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const clamped = Math.max(0, Math.min(100, value));
  const offset = circumference - (clamped / 100) * circumference;
  const color =
    indicatorColor ||
    (clamped >= 100 ? '#00BFA5' : clamped >= 60 ? '#FF6B35' : clamped >= 30 ? '#0D47A1' : '#E53935');

  return (
    <div className={cn('relative inline-flex items-center justify-center', className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={trackColor}
          strokeWidth={strokeWidth}
          fill="none"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 400ms ease, stroke 300ms ease' }}
        />
      </svg>
      {showLabel && (
        <span
          className={cn(
            'absolute font-mono font-bold text-physics-800',
            size >= 80 ? 'text-lg' : size >= 56 ? 'text-sm' : size >= 40 ? 'text-[11px]' : 'text-[10px]',
            labelClassName
          )}
        >
          {Math.round(clamped)}%
        </span>
      )}
    </div>
  );
}
