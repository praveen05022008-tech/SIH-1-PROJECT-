import React from 'react';
import { 
  Milestone, 
  Layers, 
  Wrench, 
  Package, 
  ListTodo, 
  Cpu 
} from 'lucide-react';

interface L1L6HierarchyProps {
  l1: string;
  l2: string;
  l3: string;
  l4: string;
  l5: string;
  l6: string;
}

export const L1L6Hierarchy: React.FC<L1L6HierarchyProps> = ({ l1, l2, l3, l4, l5, l6 }) => {
  const levels = [
    { label: 'L1 — Macro Milestone', value: l1, icon: Milestone, color: 'text-indigo-600 bg-indigo-50 border-indigo-100' },
    { label: 'L2 — Unit / Area', value: l2, icon: Layers, color: 'text-sky-600 bg-sky-50 border-sky-100' },
    { label: 'L3 — Discipline / System', value: l3, icon: Wrench, color: 'text-emerald-600 bg-emerald-50 border-emerald-100' },
    { label: 'L4 — Work Package', value: l4, icon: Package, color: 'text-amber-600 bg-amber-50 border-amber-100' },
    { label: 'L5 — Activity / Task', value: l5, icon: ListTodo, color: 'text-purple-600 bg-purple-50 border-purple-100' },
    { label: 'L6 — Executable Job', value: l6, icon: Cpu, color: 'text-rose-600 bg-rose-50 border-rose-100' }
  ];

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
      <div className="mb-4 pb-2 border-b border-slate-100">
        <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Refinery Operational Context (L1–L6)</h4>
        <p className="text-[10px] text-slate-400 mt-0.5">Physical and organizational drill-down mapping</p>
      </div>

      <div className="space-y-3.5 relative">
        {/* Connector vertical line */}
        <div className="absolute top-4 bottom-4 left-4.5 w-0.5 bg-slate-100 z-0"></div>

        {levels.map((lvl, index) => {
          const Icon = lvl.icon;
          return (
            <div key={index} className="flex gap-4 items-start relative z-10">
              {/* Icon Container */}
              <div className={`h-9 w-9 rounded-lg border flex items-center justify-center shrink-0 ${lvl.color}`}>
                <Icon className="h-4.5 w-4.5" />
              </div>

              {/* Text details */}
              <div className="pt-0.5">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  {lvl.label}
                </div>
                <div className="text-xs font-semibold text-slate-800 mt-0.5 leading-snug">
                  {lvl.value || 'Not Specified'}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
