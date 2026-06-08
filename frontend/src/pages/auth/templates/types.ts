export type Template = 'default' | 'modern' | 'classic' | 'minimal'

export interface Field {
  key: string
  label: string
  required: boolean
  enabled: boolean
}

export interface Step {
  id: number
  label: string
}

export interface TemplateStyles {
  inputClass: string
  labelClass: string
  buttonPrimary: string
  buttonOutline: string
  buttonGhost: string
  cardClass: string
  summaryCardClass: string
  summaryTitleClass: string
}
