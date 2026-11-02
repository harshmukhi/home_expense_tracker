'use client';

import React from 'react';
import { LucideIcon } from 'lucide-react';

interface KPICardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon: LucideIcon;
  variant?: 'emerald' | 'blue' | 'purple' | 'amber' | 'rose' | 'slate';
  trend?: {
    value: string;
    isPositive?: boolean;
    label?: string;
  };
  onClick?: () => void;
}

const VARIANT_STYLES = {
  emerald: {
    bg: 'bg-emerald-50 dark:bg-emerald-950/30',
    border: 'border-emerald-200 dark:border-emerald-800/50',
    iconBg: 'bg-emerald-100 dark:bg-emerald-900/50',
    iconColor: 'text-emerald-600 dark:text-emerald-400',
  },
  blue: {
    bg: 'bg-blue-50 dark:bg-blue-950/30',
    border: 'border-blue-200 dark:border-blue-800/50',
    iconBg: 'bg-blue-100 dark:bg-blue-900/50',
    iconColor: 'text-blue-600 dark:text-blue-400',
  },
  purple: {
    bg: 'bg-purple-50 dark:bg-purple-950/30',
    border: 'border-purple-200 dark:border-purple-800/50',
    iconBg: 'bg-purple-100 dark:bg-purple-900/50',
    iconColor: 'text-purple-600 dark:text-purple-400',
  },
  amber: {
    bg: 'bg-amber-50 dark:bg-amber-950/30',
    border: 'border-amber-200 dark:border-amber-800/50',
    iconBg: 'bg-amber-100 dark:bg-amber-900/50',
    iconColor: 'text-amber-600 dark:text-amber-400',
  },
  rose: {
    bg: 'bg-rose-50 dark:bg-rose-950/30',
    border: 'border-rose-200 dark:border-rose-800/50',
    iconBg: 'bg-rose-100 dark:bg-rose-900/50',
    iconColor: 'text-rose-600 dark:text-rose-400',
  },
  slate: {
    bg: 'bg-gray-50 dark:bg-gray-800/40',
    border: 'border-gray-200 dark:border-gray-800',
    iconBg: 'bg-gray-100 dark:bg-gray-800',
    iconColor: 'text-gray-600 dark:text-gray-400',
  },
};

export function KPICard({
  title,
  value,
  subtitle,
  icon: Icon,
  variant = 'slate',
  trend,
  onClick,
}: KPICardProps) {
  const styles = VARIANT_STYLES[variant];

  return (
    <div
      onClick={onClick}
      className={`p-5 rounded-2xl border transition-all duration-200 bg-white dark:bg-gray-900 ${styles.border} ${
        onClick ? 'cursor-pointer hover:shadow-md hover:scale-[1.01]' : ''
      }`}
    >
      <div className="flex items-start justify-between">
        <div>
          <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            {title}
          </span>
          <div className="text-2xl font-bold text-gray-900 dark:text-white mt-1 tracking-tight">
            {value}
          </div>
        </div>
        <div className={`p-3 rounded-xl ${styles.iconBg} ${styles.iconColor}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>

      {(subtitle || trend) && (
        <div className="mt-3 flex items-center gap-2 text-xs">
          {trend && (
            <span
              className={`font-semibold px-1.5 py-0.5 rounded ${
                trend.isPositive
                  ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400'
                  : 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-400'
              }`}
            >
              {trend.value}
            </span>
          )}
          {subtitle && (
            <span className="text-gray-500 dark:text-gray-400 truncate">
              {subtitle}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

