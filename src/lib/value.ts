import type { Field } from '../types'

export function displayValue(value: unknown, field?: Field): string {
  if (value === null || value === undefined || value === '') return ''
  if (field?.type === 'checkbox') return value ? 'Yes' : 'No'
  if (Array.isArray(value)) return value.join(', ')
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}
