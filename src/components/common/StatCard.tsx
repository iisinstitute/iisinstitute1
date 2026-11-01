import React from 'react';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: {
    value: string;
    isPositive?: boolean;
  };
  colorScheme?: 'blue' | 'purple' | 'emerald' | 'amber' | 'rose' | 'indigo';
  onClick?: () => void;
}

const colorMaps = {
  blue: {
    bg: 'bg-blue-50',
    iconBg: 'bg-blue-600 text-white',
    border: 'border-blue-100 hover:border-blue-300',
    text: 'text-blue-700',
  },
  purple: {
    bg: 'bg-purple-50',
    iconBg: 'bg-purple-600 text-white',
    border: 'border-purple-100 hover:border-purple-300',
    text: 'text-purple-700',
  },
  emerald: {
    bg: 'bg-emerald-50',
    iconBg: 'bg-emerald-600 text-white',
    border: 'border-emerald-100 hover:border-emerald-300',
    text: 'text-emerald-700',
  },
  amber: {
    bg: 'bg-amber-50',
    iconBg: 'bg-amber-600 text-white',
    border: 'border-amber-100 hover:border-amber-300',
    text: 'text-amber-700',
  },
  rose: {
    bg: 'bg-rose-50',
    iconBg: 'bg-rose-600 text-white',
    border: 'border-rose-100 hover:border-rose-300',
    text: 'text-rose-700',
  },
  indigo: {
    bg: 'bg-indigo-50',
    iconBg: 'bg-indigo-600 text-white',
    border: 'border-indigo-100 hover:border-indigo-300',
    text: 'text-indigo-700',
  },
};

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  colorScheme = 'blue',
  onClick,
}) => {
  const scheme = colorMaps[colorScheme];

  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-xl border ${scheme.border} p-5 shadow-xs transition-all hover:shadow-md ${
        onClick ? 'cursor-pointer' : ''
      }`}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">{title}</p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-gray-900">{value}</span>
            {trend && (
              <span
                className={`inline-flex items-center text-xs font-semibold ${
                  trend.isPositive ? 'text-emerald-600' : 'text-rose-600'
                }`}
              >
                {trend.isPositive ? '↑' : '↓'} {trend.value}
              </span>
            )}
          </div>
          {subtitle && <p className="mt-1 text-xs text-gray-500">{subtitle}</p>}
        </div>
        <div className={`flex h-11 w-11 items-center justify-center rounded-xl shadow-xs ${scheme.iconBg}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
};
