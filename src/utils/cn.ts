import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

/** Классовый хелпер дизайн-системы HavalDesign (cn): объединяет
 *  базовые классы компонента и переопределения вызывающей стороны. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
