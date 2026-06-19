import { cn } from '@evershop/evershop/lib/util/cn';
import { cva } from 'class-variance-authority';
import React from 'react';

const circleVariants = cva('rounded-full inline-flex border-4', {
  variants: {
    variant: {
      default: 'border-muted',
      success: 'border-green-500/30',
      info: 'border-cyan-500/30',
      attention: 'border-yellow-500/30',
      destructive: 'border-destructive/30',
      warning: 'border-amber-500/30',
      new: 'border-muted'
    }
  },
  defaultVariants: {
    variant: 'default'
  }
});

const circleInnerVariants = cva(
  'border-2 rounded-full block w-[1.125rem] h-[1.125rem] flex justify-center',
  {
    variants: {
      variant: {
        default: 'border-muted-foreground',
        success: 'border-green-700 dark:border-green-400',
        info: 'border-cyan-600 dark:border-cyan-400',
        attention: 'border-yellow-700 dark:border-yellow-400',
        destructive: 'border-destructive',
        warning: 'border-amber-700 dark:border-amber-400',
        new: 'border-muted-foreground'
      }
    },
    defaultVariants: {
      variant: 'default'
    }
  }
);

const circleDotVariants = cva(
  'block w-[40%] h-[40%] self-center rounded-full',
  {
    variants: {
      variant: {
        default: 'bg-muted-foreground',
        success: 'bg-green-700 dark:bg-green-400',
        info: 'bg-cyan-600 dark:bg-cyan-400',
        attention: 'bg-yellow-700 dark:bg-yellow-400',
        destructive: 'bg-destructive',
        warning: 'bg-amber-700 dark:bg-amber-400',
        new: 'bg-muted-foreground'
      }
    },
    defaultVariants: {
      variant: 'default'
    }
  }
);

export type CircleVariant =
  | 'default'
  | 'success'
  | 'info'
  | 'attention'
  | 'destructive'
  | 'warning'
  | 'new';

export interface CircleProps {
  variant?: CircleVariant;
  className?: string;
}

export function Circle({ variant = 'default', className }: CircleProps) {
  return (
    <span className={cn(circleVariants({ variant }), className)}>
      <span className={circleInnerVariants({ variant })}>
        <span className={circleDotVariants({ variant })} />
      </span>
    </span>
  );
}
