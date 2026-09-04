import { Coins } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CoinBadgeProps {
  amount?: number;
  value?: number;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'energy' | 'lab';
  showSymbol?: boolean;
  className?: string;
}

export default function CoinBadge({
  amount,
  value,
  size = 'md',
  variant = 'default',
  showSymbol = true,
  className,
}: CoinBadgeProps) {
  const num = typeof amount === 'number' ? amount : typeof value === 'number' ? value : 0;

  const sizeClasses = {
    sm: 'text-[11px] px-2 py-0.5 gap-0.5',
    md: 'text-xs px-2.5 py-1 gap-1',
    lg: 'text-sm px-3 py-1.5 gap-1.5',
  };
  const coinSizes = { sm: 12, md: 14, lg: 18 };
  const variantClasses = {
    default: 'bg-gradient-to-r from-energy-50 to-energy-100 text-energy-700 ring-1 ring-energy-200',
    energy: 'bg-grad-energy text-white shadow-glow',
    lab: 'bg-lab-50 text-lab-700 ring-1 ring-lab-200',
  };

  if (!showSymbol && variant === 'default') {
    return (
      <span className={cn(
        'inline-flex items-center rounded-full font-semibold',
        sizeClasses[size],
        variantClasses[variant],
        className
      )}>
        <Coins size={coinSizes[size]} className="text-energy-500" />
        {num}
      </span>
    );
  }

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full font-semibold',
        sizeClasses[size],
        variantClasses[variant],
        className
      )}
    >
      <Coins
        size={coinSizes[size]}
        className={variant === 'energy' ? 'text-white' : variant === 'lab' ? 'text-lab-500' : 'text-energy-500'}
      />
      {num}
    </span>
  );
}
