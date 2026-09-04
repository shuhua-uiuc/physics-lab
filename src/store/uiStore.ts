import { create } from 'zustand';
import { useAuthStore } from './authStore';

export type ToastType = 'info' | 'success' | 'warning' | 'error';

export interface Toast {
  id: string;
  type: ToastType;
  msg: string;
}

/**
 * 欢迎通知（角色区分）：学生看挑战邀请与能量币消息，
 * 教师/管理员看项目进度与安全认证提醒。
 */
const STUDENT_WELCOME_TOASTS: Toast[] = [
  { id: 't1', type: 'success', msg: '「磁悬浮实验」项目完成度 +15%，继续加油！' },
  { id: 't2', type: 'info', msg: '爱因斯坦脑洞组 向你发起了挑战邀请' },
  { id: 't4', type: 'success', msg: '+180⚡ 能量币到账，来自挑战大厅结算' },
];

const TEACHER_WELCOME_TOASTS: Toast[] = [
  { id: 't1', type: 'success', msg: '「磁悬浮实验」项目完成度 +15%，继续加油！' },
  { id: 't3', type: 'warning', msg: '安全认证即将过期，建议本周内完成复核' },
];

const initialToasts = (): Toast[] => {
  const role = useAuthStore.getState().role;
  return role === 'teacher' || role === 'admin' ? TEACHER_WELCOME_TOASTS : STUDENT_WELCOME_TOASTS;
};

interface UIState {
  sidebarCollapsed: boolean;
  toasts: Toast[];
  toggleSidebar: () => void;
  pushToast: (msg: string, type?: ToastType) => void;
  removeToast: (id: string) => void;
  clearToasts: () => void;
}

const uid = () => Math.random().toString(36).slice(2, 10);

export const useUIStore = create<UIState>((set) => ({
  sidebarCollapsed: false,
  toasts: initialToasts(),

  toggleSidebar: () => {
    set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed }));
  },

  pushToast: (msg, type = 'info') => {
    const id = uid();
    set((s) => ({ toasts: [...s.toasts, { id, type, msg }] }));
    setTimeout(() => {
      set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
    }, 6000);
  },

  removeToast: (id) => {
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
  },

  clearToasts: () => {
    set({ toasts: [] });
  },
}));
