import React from 'react';
import { ShieldCheck, ShieldAlert, ArrowUpRight, ArrowDownRight, Equal } from 'lucide-react';

// KPI Card
interface KPICardProps {
  title: string;
  value: number | string;
  subtitle?: string;
  icon: React.ComponentType<{ className?: string }>;
  colorClass?: string;
  iconColorClass?: string;
}

export const KPICard: React.FC<KPICardProps> = ({ 
  title, 
  value, 
  subtitle, 
  icon: Icon, 
  colorClass = 'text-industrial-navy',
  iconColorClass = 'bg-slate-100 text-slate-600'
}) => {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex items-center justify-between">
      <div>
        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{title}</span>
        <div className={`text-2xl font-extrabold mt-1.5 ${colorClass}`}>{value}</div>
        {subtitle && <p className="text-[10px] text-slate-400 mt-1">{subtitle}</p>}
      </div>
      <div className={`h-11 w-11 rounded-lg flex items-center justify-center ${iconColorClass}`}>
        <Icon className="h-5 w-5" />
      </div>
    </div>
  );
};

// SIF Potential Badge
interface RiskBadgeProps {
  probability?: number;
  level?: string;
}

export const RiskBadge: React.FC<RiskBadgeProps> = ({ probability, level }) => {
  if (level) {
    const l = level.toUpperCase();
    if (l === 'CRITICAL' || l === 'HIGH') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-red-50 text-industrial-red border border-red-100 rounded-full text-xs font-bold">
          <ShieldAlert className="h-3.5 w-3.5" />
          <span>{level}</span>
        </span>
      );
    }
    if (l === 'MEDIUM') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 text-industrial-orange border border-amber-100 rounded-full text-xs font-bold">
          <ShieldAlert className="h-3.5 w-3.5" />
          <span>{level}</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-industrial-green border border-emerald-100 rounded-full text-xs font-bold">
        <ShieldCheck className="h-3.5 w-3.5" />
        <span>{level}</span>
      </span>
    );
  }

  const prob = probability ?? 0;
  const isHigh = prob >= 70.0;
  const isMedium = prob >= 40.0 && prob < 70.0;

  if (isHigh) {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-red-50 text-industrial-red border border-red-100 rounded-full text-xs font-bold">
        <ShieldAlert className="h-3.5 w-3.5" />
        <span>SIF Potential</span>
      </span>
    );
  }

  if (isMedium) {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 text-industrial-orange border border-amber-100 rounded-full text-xs font-bold">
        <ShieldAlert className="h-3.5 w-3.5" />
        <span>Medium SIF Risk</span>
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-industrial-green border border-emerald-100 rounded-full text-xs font-bold">
      <ShieldCheck className="h-3.5 w-3.5" />
      <span>Non-SIF</span>
    </span>
  );
};

// Trend Indicator
interface TrendIndicatorProps {
  trend: string;
}

export const TrendIndicator: React.FC<TrendIndicatorProps> = ({ trend }) => {
  const isUp = trend.includes('↑') || trend.toLowerCase() === 'increase' || trend.toLowerCase() === 'up';
  const isDown = trend.includes('↓') || trend.toLowerCase() === 'decrease' || trend.toLowerCase() === 'down';

  if (isUp) {
    return (
      <span className="inline-flex items-center gap-0.5 text-xs text-industrial-red font-semibold bg-red-50 border border-red-100 px-2 py-0.5 rounded">
        <ArrowUpRight className="h-3 w-3" />
        <span>{trend}</span>
      </span>
    );
  }

  if (isDown) {
    return (
      <span className="inline-flex items-center gap-0.5 text-xs text-industrial-green font-semibold bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded">
        <ArrowDownRight className="h-3 w-3" />
        <span>{trend}</span>
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-0.5 text-xs text-slate-500 font-semibold bg-slate-50 border border-slate-200 px-2 py-0.5 rounded">
      <Equal className="h-3 w-3" />
      <span>{trend}</span>
    </span>
  );
};
