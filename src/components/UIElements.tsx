import React from 'react';
import { ShieldCheck, ShieldAlert, ArrowUpRight, ArrowDownRight, Equal, Sparkles, Loader2, Mic } from 'lucide-react';

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

// ==========================================
// 1. CIRCULAR PROGRESS INDICATOR (UNIVERSAL)
// ==========================================
export type CircularProgressColor = 
  | 'teal' 
  | 'emerald' 
  | 'blue' 
  | 'purple' 
  | 'amber' 
  | 'orange' 
  | 'rose' 
  | 'red' 
  | 'cyan' 
  | 'indigo'
  | 'risk'        // Auto-colored: green -> amber -> red as value rises
  | 'compliance';  // Auto-colored: red -> amber -> green as value rises

export interface CircularProgressProps {
  value: number;                  // 0 to 100 or relative to max
  max?: number;                   // default: 100
  size?: number | 'xs' | 'sm' | 'md' | 'lg' | 'xl'; // xs=32, sm=44, md=68, lg=96, xl=128
  strokeWidth?: number;
  color?: CircularProgressColor | string;
  showValue?: boolean;
  valuePrefix?: string;
  valueSuffix?: string;
  displayValue?: React.ReactNode;
  label?: string;
  subtitle?: string;
  trackColor?: string;
  animate?: boolean;
  className?: string;
  icon?: React.ComponentType<{ className?: string }>;
}

const SIZE_MAP = {
  xs: 32,
  sm: 44,
  md: 68,
  lg: 96,
  xl: 128
};

const COLOR_CONFIG: Record<string, { stroke: string; track: string; text: string; bg?: string }> = {
  teal: { stroke: '#008779', track: '#E6F4F2', text: 'text-[#008779]' },
  emerald: { stroke: '#10B981', track: '#ECFDF5', text: 'text-emerald-600' },
  blue: { stroke: '#2563EB', track: '#EFF6FF', text: 'text-blue-600' },
  purple: { stroke: '#8B5CF6', track: '#F5F3FF', text: 'text-purple-600' },
  amber: { stroke: '#F59E0B', track: '#FFFBEB', text: 'text-amber-600' },
  orange: { stroke: '#EA580C', track: '#FFF7ED', text: 'text-orange-600' },
  rose: { stroke: '#F43F5E', track: '#FFF1F2', text: 'text-rose-600' },
  red: { stroke: '#DC2626', track: '#FEF2F2', text: 'text-red-600' },
  cyan: { stroke: '#06B6D4', track: '#ECFEFF', text: 'text-cyan-600' },
  indigo: { stroke: '#4F46E5', track: '#EEF2FF', text: 'text-indigo-600' },
};

export const CircularProgress: React.FC<CircularProgressProps> = ({
  value,
  max = 100,
  size = 'md',
  strokeWidth,
  color = 'teal',
  showValue = true,
  valuePrefix = '',
  valueSuffix = '%',
  displayValue,
  label,
  subtitle,
  trackColor,
  animate = true,
  className = '',
  icon: Icon
}) => {
  const pixelSize = typeof size === 'number' ? size : SIZE_MAP[size] || 68;
  const stroke = strokeWidth || Math.max(3, Math.round(pixelSize * 0.09));
  const radius = (pixelSize - stroke) / 2;
  const circumference = 2 * Math.PI * radius;

  // Calculate normalized percentage (0 to 100)
  const safeMax = max > 0 ? max : 100;
  const percentage = Math.min(100, Math.max(0, (value / safeMax) * 100));
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  // Resolve dynamic colors
  let activeColor = color;
  if (color === 'risk') {
    if (percentage >= 70) activeColor = 'rose';
    else if (percentage >= 40) activeColor = 'amber';
    else activeColor = 'emerald';
  } else if (color === 'compliance') {
    if (percentage >= 85) activeColor = 'emerald';
    else if (percentage >= 60) activeColor = 'amber';
    else activeColor = 'rose';
  }

  const colorStyle = COLOR_CONFIG[activeColor] || {
    stroke: activeColor,
    track: trackColor || '#E2E8F0',
    text: 'text-slate-800'
  };

  const finalTrack = trackColor || colorStyle.track;

  // Font sizing based on circle size
  const valFontSize = pixelSize <= 36 ? 'text-[9px]' : pixelSize <= 50 ? 'text-xs' : pixelSize <= 80 ? 'text-sm' : pixelSize <= 100 ? 'text-lg' : 'text-2xl';

  return (
    <div className={`inline-flex flex-col items-center justify-center ${className}`}>
      <div className="relative inline-flex items-center justify-center" style={{ width: pixelSize, height: pixelSize }}>
        <svg
          width={pixelSize}
          height={pixelSize}
          viewBox={`0 0 ${pixelSize} ${pixelSize}`}
          className="transform -rotate-90 origin-center"
        >
          {/* Background Track Circle */}
          <circle
            cx={pixelSize / 2}
            cy={pixelSize / 2}
            r={radius}
            stroke={finalTrack}
            strokeWidth={stroke}
            fill="transparent"
          />
          {/* Animated Progress Circle */}
          <circle
            cx={pixelSize / 2}
            cy={pixelSize / 2}
            r={radius}
            stroke={colorStyle.stroke}
            strokeWidth={stroke}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            fill="transparent"
            style={{
              transition: animate ? 'stroke-dashoffset 0.8s cubic-bezier(0.4, 0, 0.2, 1)' : 'none'
            }}
          />
        </svg>

        {/* Center Content / Value */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center select-none px-1">
          {displayValue !== undefined ? (
            displayValue
          ) : Icon ? (
            <Icon className={`${pixelSize <= 44 ? 'h-3.5 w-3.5' : pixelSize <= 80 ? 'h-5 w-5' : 'h-7 w-7'} ${colorStyle.text}`} />
          ) : showValue ? (
            <div className="flex items-baseline justify-center font-black font-mono leading-none tracking-tight">
              {valuePrefix && <span className="text-[10px] text-slate-400 font-sans mr-0.5">{valuePrefix}</span>}
              <span className={`${valFontSize} ${colorStyle.text}`}>{Math.round(value)}</span>
              {valueSuffix && <span className="text-[9px] text-slate-400 font-sans ml-0.5">{valueSuffix}</span>}
            </div>
          ) : null}
        </div>
      </div>

      {/* Optional Outer Label */}
      {label && (
        <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider mt-1.5 text-center">
          {label}
        </span>
      )}
      {subtitle && (
        <span className="text-[9px] text-slate-400 text-center font-medium">
          {subtitle}
        </span>
      )}
    </div>
  );
};

// ==========================================
// 2. SIF RISK SCORE CIRCULAR METER
// ==========================================
interface RiskScoreMeterProps {
  score: number;             // 0 to 100 (or 0 to 10)
  max?: number;              // default: 100
  riskLevel?: string;        // 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'
  size?: number | 'sm' | 'md' | 'lg' | 'xl';
  showBadge?: boolean;
  label?: string;
  dark?: boolean;
}

export const RiskScoreMeter: React.FC<RiskScoreMeterProps> = ({
  score,
  max = 100,
  riskLevel,
  size = 'md',
  showBadge = true,
  label = 'Risk Index',
  dark = false
}) => {
  // Normalize score
  const normalized = max === 10 ? score * 10 : score;
  const isHigh = normalized >= 70 || riskLevel === 'CRITICAL' || riskLevel === 'HIGH';
  const isMedium = (normalized >= 40 && normalized < 70) || riskLevel === 'MEDIUM';

  const color: CircularProgressColor = isHigh ? 'rose' : isMedium ? 'amber' : 'emerald';
  const levelText = riskLevel || (isHigh ? 'HIGH' : isMedium ? 'MEDIUM' : 'LOW');

  return (
    <div className={`flex flex-col items-center ${dark ? 'text-white' : 'text-slate-800'}`}>
      <div className="relative">
        <CircularProgress
          value={normalized}
          max={100}
          size={size}
          color={color}
          trackColor={dark ? '#1E293B' : undefined}
          displayValue={
            <div className="flex flex-col items-center justify-center leading-none">
              <span className={`font-black font-mono ${dark ? 'text-white' : 'text-slate-900'} ${
                size === 'sm' ? 'text-xs' : size === 'lg' ? 'text-xl' : size === 'xl' ? 'text-3xl' : 'text-sm'
              }`}>
                {max === 10 ? score.toFixed(1) : Math.round(score)}
              </span>
              <span className={`text-[8px] font-sans uppercase font-bold tracking-wider ${
                isHigh ? 'text-rose-500' : isMedium ? 'text-amber-500' : 'text-emerald-500'
              }`}>
                {max === 10 ? '/10' : '/100'}
              </span>
            </div>
          }
        />
      </div>

      {showBadge && (
        <div className="mt-1.5 flex flex-col items-center">
          <span className={`px-2 py-0.5 rounded-md text-[9.5px] font-black uppercase tracking-wider ${
            isHigh 
              ? 'bg-rose-100 text-rose-700 border border-rose-200' 
              : isMedium 
              ? 'bg-amber-100 text-amber-800 border border-amber-200' 
              : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
          }`}>
            {levelText}
          </span>
          {label && (
            <span className={`text-[9px] uppercase font-bold tracking-wider mt-1 ${dark ? 'text-slate-400' : 'text-slate-400'}`}>
              {label}
            </span>
          )}
        </div>
      )}
    </div>
  );
};

// ==========================================
// 3. AI CONFIDENCE CIRCULAR GAUGE
// ==========================================
interface ConfidenceGaugeProps {
  confidence: number;       // 0 to 100 or 0.0 to 1.0
  size?: number | 'sm' | 'md' | 'lg';
  label?: string;
  dark?: boolean;
}

export const ConfidenceGauge: React.FC<ConfidenceGaugeProps> = ({
  confidence,
  size = 'md',
  label = 'AI Certitude',
  dark = false
}) => {
  const normalized = confidence <= 1.0 ? Math.round(confidence * 100) : Math.round(confidence);
  const isHigh = normalized >= 85;

  return (
    <div className={`flex flex-col items-center ${dark ? 'text-white' : 'text-slate-800'}`}>
      <CircularProgress
        value={normalized}
        max={100}
        size={size}
        color={isHigh ? 'teal' : 'amber'}
        trackColor={dark ? '#1E293B' : undefined}
        displayValue={
          <div className="flex flex-col items-center justify-center leading-none">
            <span className={`font-black font-mono ${dark ? 'text-white' : 'text-slate-900'} ${
              size === 'sm' ? 'text-xs' : size === 'lg' ? 'text-xl' : 'text-sm'
            }`}>
              {normalized}%
            </span>
            <Sparkles className="h-2.5 w-2.5 text-[#008779] mt-0.5" />
          </div>
        }
      />
      {label && (
        <span className={`text-[10px] font-bold uppercase tracking-wider mt-1.5 ${dark ? 'text-slate-400' : 'text-slate-400'}`}>
          {label}
        </span>
      )}
    </div>
  );
};

// ==========================================
// 4. CIRCULAR LOADING SPINNER
// ==========================================
interface CircularLoadingSpinnerProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  color?: 'teal' | 'blue' | 'emerald' | 'rose' | 'white' | 'slate';
  label?: string;
  sublabel?: string;
  progress?: number;       // Optional 0-100 percentage
  className?: string;
}

export const CircularLoadingSpinner: React.FC<CircularLoadingSpinnerProps> = ({
  size = 'md',
  color = 'teal',
  label,
  sublabel,
  progress,
  className = ''
}) => {
  const sizeClass = {
    xs: 'h-4 w-4 border-2',
    sm: 'h-6 w-6 border-2',
    md: 'h-10 w-10 border-3',
    lg: 'h-14 w-14 border-4',
    xl: 'h-20 w-20 border-4'
  }[size];

  const colorClass = {
    teal: 'border-[#008779] border-t-transparent',
    blue: 'border-blue-600 border-t-transparent',
    emerald: 'border-emerald-600 border-t-transparent',
    rose: 'border-rose-600 border-t-transparent',
    white: 'border-white border-t-transparent',
    slate: 'border-slate-700 border-t-transparent'
  }[color];

  return (
    <div className={`flex flex-col items-center justify-center gap-3 p-4 ${className}`}>
      <div className="relative flex items-center justify-center">
        {progress !== undefined ? (
          <CircularProgress
            value={progress}
            size={size === 'xl' ? 'xl' : size === 'lg' ? 'lg' : 'md'}
            color={color === 'white' ? 'teal' : color}
            showValue={true}
          />
        ) : (
          <>
            <div className={`rounded-full animate-spin ${sizeClass} ${colorClass}`} />
            <div className="absolute h-2 w-2 rounded-full bg-current opacity-40 animate-ping" />
          </>
        )}
      </div>

      {label && (
        <div className="text-center space-y-0.5">
          <div className="text-xs font-black text-slate-800 tracking-tight">{label}</div>
          {sublabel && <div className="text-[11px] text-slate-400 max-w-xs leading-relaxed">{sublabel}</div>}
        </div>
      )}
    </div>
  );
};

// ==========================================
// 5. CIRCULAR RECORDING / TIMER INDICATOR
// ==========================================
interface CircularTimerProps {
  seconds: number;
  maxSeconds?: number;
  isRecording?: boolean;
  size?: number;
  onStop?: () => void;
}

export const CircularTimer: React.FC<CircularTimerProps> = ({
  seconds,
  maxSeconds = 60,
  isRecording = true,
  size = 84,
  onStop
}) => {
  const percentage = Math.min(100, (seconds / maxSeconds) * 100);

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="flex flex-col items-center justify-center">
      <div className="relative flex items-center justify-center cursor-pointer group" onClick={onStop}>
        <CircularProgress
          value={percentage}
          max={100}
          size={size}
          strokeWidth={5}
          color="rose"
          trackColor="#FEE2E2"
          displayValue={
            <div className="flex flex-col items-center justify-center">
              <div className="relative">
                <Mic className="h-6 w-6 text-rose-600 animate-pulse" />
                {isRecording && (
                  <span className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-rose-500 animate-ping" />
                )}
              </div>
              <span className="text-xs font-mono font-black text-rose-700 mt-1">
                {formatTime(seconds)}
              </span>
            </div>
          }
        />
      </div>
      <span className="text-[10px] font-bold text-rose-600 uppercase tracking-wider mt-2">
        {isRecording ? 'Listening • Click to Complete' : 'Recording Stoped'}
      </span>
    </div>
  );
};
