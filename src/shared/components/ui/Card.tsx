// Design Ref: §7.1 — 카드 기반 레이아웃, 넉넉한 패딩, 둥근 모서리
'use client';

import { type HTMLAttributes } from 'react';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  readonly variant?: 'default' | 'interactive' | 'highlight';
  readonly padding?: 'sm' | 'md' | 'lg';
}

const variantStyles = {
  default: 'bg-white border border-gray-200',
  interactive: 'bg-white border border-gray-200 hover:border-blue-300 hover:shadow-md cursor-pointer active:scale-[0.98] transition-all',
  highlight: 'bg-blue-50 border-2 border-blue-400',
};

const paddingStyles = {
  sm: 'p-3',
  md: 'p-4',
  lg: 'p-6',
};

export function Card({
  variant = 'default',
  padding = 'md',
  className = '',
  children,
  ...props
}: CardProps) {
  return (
    <div
      className={`rounded-2xl shadow-sm ${variantStyles[variant]} ${paddingStyles[padding]} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
