import { create } from 'zustand';

export type ToastType = 'info' | 'success' | 'warning' | 'error';

export interface Toast {
  id: string;
  type: ToastType;
  msg: string;
}

// 这里曾有一组写死的「欢迎通知」（学生看挑战邀请/能量币到账，教师看项目进度/安全提醒）。
// 已移除：它们对每个学生每次登录都显示完全相同的假消息，其中「+180⚡ 能量币到账」
// 更是声称发生了并不存在的入账（余额不会变），属于误导。
// 现在提示只由真实操作触发（pushToast）。

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
  toasts: [],

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
