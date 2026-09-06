import { create } from 'zustand';

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
  // 不再在 store 初始化时预置欢迎通知：登录前 role 为空，会导致未登录也能看到通知，
  // 且角色不匹配。改为登录成功后由 App 按当前角色注入（见 App.tsx 的 setWelcomeToasts）。
  return [];
};

interface UIState {
  sidebarCollapsed: boolean;
  toasts: Toast[];
  toggleSidebar: () => void;
  pushToast: (msg: string, type?: ToastType) => void;
  removeToast: (id: string) => void;
  clearToasts: () => void;
  /** 登录后按角色注入欢迎通知（仅对已登录用户展示）。 */
  setWelcomeToasts: (role: string | null) => void;
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

  setWelcomeToasts: (role) => {
    const list =
      role === 'teacher' || role === 'admin' ? TEACHER_WELCOME_TOASTS : STUDENT_WELCOME_TOASTS;
    set({ toasts: list });
  },
}));
