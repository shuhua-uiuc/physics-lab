import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * 图表纵轴刻度格式化：数值小于 1000 时直接显示原值，否则用 "1.2k"。
 *
 * 不能无脑写成 `${(v/1000).toFixed(0)}k`——小组能量币经常只有个位数，
 * 那样会把 10、5、0 全部显示成 "0k"，整个纵轴看起来像坏了。
 */
export function formatAxisTick(v: number): string {
  return Math.abs(v) >= 1000 ? `${(v / 1000).toFixed(1)}k` : `${v}`
}
