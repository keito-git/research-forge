import { cva, type VariantProps } from 'class-variance-authority';
import * as React from 'react';
import { cn } from '@/lib/utils';

const alertVariants = cva('relative w-full rounded-lg px-3 py-2 text-sm flex items-center gap-2', {
  variants: {
    variant: {
      default: 'bg-sand-100 text-ink-700 border border-sand-200',
      success: 'bg-green-50 text-green-700 border border-green-200',
      destructive: 'bg-red-50 text-red-700 border border-red-200',
    },
  },
  defaultVariants: {
    variant: 'default',
  },
});

const Alert = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof alertVariants>
>(({ className, variant, ...props }, ref) => (
  <div ref={ref} role="alert" className={cn(alertVariants({ variant }), className)} {...props} />
));
Alert.displayName = 'Alert';

export { Alert, alertVariants };
