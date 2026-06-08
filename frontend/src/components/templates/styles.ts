import { Template, TemplateStyles } from './types'

export const templateStyles: Record<Template, TemplateStyles> = {
  default: {
    inputClass: 'h-11 rounded-md bg-transparent border-border/40 shadow-none focus-visible:border-[#009CE1] focus-visible:ring-1 focus-visible:ring-[#009CE1]/20 transition-all text-sm px-3',
    labelClass: 'text-sm font-medium text-foreground',
    buttonPrimary: 'bg-[#009CE1] hover:bg-[#007AB5] text-white',
    buttonOutline: '',
    buttonGhost: '',
    cardClass: 'bg-muted/20 rounded-md border border-border/40',
    summaryCardClass: 'bg-muted/20 rounded-md border border-border/40',
    summaryTitleClass: 'text-muted-foreground',
  },
  modern: {
    inputClass: 'h-11 rounded-lg bg-white border-slate-200 shadow-sm focus-visible:border-[#009CE1] focus-visible:ring-1 focus-visible:ring-[#009CE1]/20 transition-all text-sm px-4',
    labelClass: 'text-sm font-semibold text-slate-700',
    buttonPrimary: 'bg-[#009CE1] hover:bg-[#007AB5] text-white rounded-lg shadow-md hover:shadow-lg',
    buttonOutline: 'border-slate-200 text-slate-600 hover:bg-slate-50 rounded-lg',
    buttonGhost: '',
    cardClass: 'bg-white rounded-xl border border-slate-200 shadow-sm',
    summaryCardClass: 'bg-white rounded-xl border border-slate-200 shadow-sm',
    summaryTitleClass: 'text-slate-500',
  },
  classic: {
    inputClass: 'h-11 rounded-lg bg-white border-slate-200 shadow-sm focus-visible:border-[#009CE1] focus-visible:ring-1 focus-visible:ring-[#009CE1]/20 transition-all text-sm px-4',
    labelClass: 'text-sm font-semibold text-slate-700',
    buttonPrimary: 'bg-[#009CE1] hover:bg-[#007AB5] text-white rounded-lg shadow-sm',
    buttonOutline: 'border-slate-200 text-slate-600 hover:bg-slate-50 rounded-lg',
    buttonGhost: 'text-slate-500 hover:text-slate-700',
    cardClass: 'bg-white rounded-xl border border-slate-200 shadow-sm',
    summaryCardClass: 'bg-white rounded-xl border border-slate-200 shadow-sm',
    summaryTitleClass: 'text-slate-500',
  },
  minimal: {
    inputClass: 'h-11 rounded-none bg-transparent border-0 border-b-2 border-gray-200 shadow-none focus-visible:border-[#009CE1] focus-visible:ring-0 transition-all text-sm px-0',
    labelClass: 'text-xs font-medium text-gray-500 uppercase tracking-widest',
    buttonPrimary: 'bg-[#009CE1] hover:bg-[#007AB5] text-white rounded-none tracking-wider text-xs uppercase',
    buttonOutline: 'border-0 text-gray-500 hover:text-gray-900 rounded-none text-xs uppercase tracking-wider',
    buttonGhost: 'text-gray-400 hover:text-gray-600 text-xs uppercase tracking-wider',
    cardClass: 'bg-transparent rounded-none border-0',
    summaryCardClass: 'bg-gray-50 rounded-none border border-gray-200',
    summaryTitleClass: 'text-gray-400',
  },
}
