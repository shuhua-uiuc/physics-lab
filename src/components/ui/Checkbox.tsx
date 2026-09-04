import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { InputHTMLAttributes } from 'react';

interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  size?: 'sm' | 'md';
}

export default function Checkbox({ label, checked, onCheckedChange, size = 'md', className, id, ...rest }: CheckboxProps) {
  const boxSize = size === 'sm' ? 'w-4 h-4' : 'w-5 h-5';
  const chkSize = size === 'sm' ? 10 : 14;
  const inputId = id || `chk-${Math.random().toString(36).slice(2, 8)}`;

  return (
    <label htmlFor={inputId} className={cn('inline-flex items-start gap-2.5 cursor-pointer select-none', className)}>
      <span className="relative inline-flex items-center justify-center">
        <input
          id={inputId}
          type="checkbox"
          className="sr-only"
          checked={checked}
          onChange={(e) => onCheckedChange(e.target.checked)}
          {...rest}
        />
        <span
          className={cn(
            boxSize,
            'rounded-md border transition-all duration-150 flex items-center justify-center',
            checked
              ? 'bg-physics-500 border-physics-500 ring-4 ring-physics-100'
              : 'bg-white border-physics-200 hover:border-physics-300'
          )}
        >
          {checked && <Check size={chkSize} className="text-white" strokeWidth={3} />}
        </span>
      </span>
      {label && <span className="text-sm text-ink-700 leading-6 pt-0.5">{label}</span>}
    </label>
  );
}
