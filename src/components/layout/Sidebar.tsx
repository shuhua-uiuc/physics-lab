import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  BookOpen,
  ChevronDown,
  ChevronRight,
  Atom,
  Swords,
  FolderKanban,
  Store,
  Coins,
  Sparkles,
  GraduationCap,
  LogOut,
  PanelLeftClose,
  PanelLeft,
  Crown,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useUIStore } from '@/store/uiStore';
import { useAuthStore } from '@/store/authStore';
import { useGroupStore } from '@/store/groupStore';
import { cn } from '@/lib/utils';

interface MenuItem {
  key: string;
  label: string;
  to: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface MenuGroup {
  key: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  to?: string;
  children?: MenuItem[];
}

const menuGroups: MenuGroup[] = [
  {
    key: 'dashboard',
    label: '仪表盘',
    to: '/dashboard',
    icon: LayoutDashboard,
  },
  {
    key: 'group',
    label: '小组中心',
    to: '/group',
    icon: Users,
  },
  {
    key: 'theory',
    label: '理论学习',
    icon: BookOpen,
    children: [
      { key: 'outline', label: '主题大纲', to: '/theory/outline', icon: Atom },
      { key: 'challenge', label: '挑战大厅', to: '/theory/challenge', icon: Swords },
    ],
  },
  {
    key: 'project',
    label: '项目中心',
    icon: FolderKanban,
    children: [
      { key: 'kanban', label: '项目看板', to: '/project/kanban', icon: FolderKanban },
      { key: 'recruit', label: '招募市场', to: '/project/recruit', icon: Store },
    ],
  },
  {
    key: 'coin',
    label: '能量币',
    to: '/coin',
    icon: Coins,
  },
  {
    key: 'showcase',
    label: '成果展示',
    to: '/showcase',
    icon: Sparkles,
  },
  {
    key: 'teacher',
    label: '教师后台',
    to: '/teacher',
    icon: GraduationCap,
  },
];

export default function Sidebar() {
  const { sidebarCollapsed, toggleSidebar } = useUIStore();
  const { role, userId, logout } = useAuthStore();
  const { getUserById, getGroupById } = useGroupStore();
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState<Record<string, boolean>>({
    theory: true,
    project: true,
  });

  const user = userId ? getUserById(userId) : undefined;
  const group = user?.groupId ? getGroupById(user.groupId) : undefined;

  const toggleGroup = (key: string) => {
    setExpanded((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <motion.aside
      initial={false}
      animate={{ width: sidebarCollapsed ? 72 : 248 }}
      transition={{ type: 'spring', stiffness: 260, damping: 28 }}
      className="relative h-screen bg-white border-r border-physics-100 shadow-sm flex flex-col shrink-0 z-20"
    >
      <div className="h-16 flex items-center justify-between px-4 border-b border-physics-50 shrink-0">
        <AnimatePresence initial={false} mode="wait">
          {!sidebarCollapsed ? (
            <motion.div
              key="expanded-logo"
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
              className="flex items-center gap-2.5"
            >
              <div className="w-9 h-9 rounded-xl2 bg-grad-physics flex items-center justify-center shadow-md">
                <Atom className="w-5 h-5 text-white" />
              </div>
              <div className="leading-tight">
                <p className="font-serif font-bold text-physics-900 text-[15px] tracking-tight">
                  物理实验室
                </p>
                <p className="text-[10px] text-ink-400 font-mono">Physics Lab</p>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="collapsed-logo"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="w-full flex justify-center"
            >
              <div className="w-10 h-10 rounded-xl2 bg-grad-physics flex items-center justify-center shadow-md">
                <Atom className="w-6 h-6 text-white" />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <button
          onClick={toggleSidebar}
          className="ml-auto shrink-0 w-8 h-8 rounded-lg text-ink-400 hover:text-physics-600 hover:bg-physics-50 flex items-center justify-center transition-colors"
        >
          {sidebarCollapsed ? (
            <PanelLeft className="w-4 h-4" />
          ) : (
            <PanelLeftClose className="w-4 h-4" />
          )}
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto scroll-thin py-3 px-2 space-y-1">
        {menuGroups.map((group) => {
          const GroupIcon = group.icon;
          if (group.children && group.children.length > 0) {
            const isExpanded = expanded[group.key];
            return (
              <div key={group.key} className="space-y-0.5">
                <button
                  onClick={() => toggleGroup(group.key)}
                  className={cn(
                    'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all text-ink-600 hover:bg-physics-50 hover:text-physics-700',
                    sidebarCollapsed && 'justify-center px-2'
                  )}
                >
                  <GroupIcon className="w-5 h-5 shrink-0" />
                  {!sidebarCollapsed && (
                    <>
                      <span className="flex-1 text-left">{group.label}</span>
                      {isExpanded ? (
                        <ChevronDown className="w-4 h-4 text-ink-400" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-ink-400" />
                      )}
                    </>
                  )}
                </button>
                <AnimatePresence initial={false}>
                  {isExpanded && !sidebarCollapsed && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden pl-6 space-y-0.5"
                    >
                      {group.children.map((child) => {
                        const ChildIcon = child.icon;
                        return (
                          <NavLink
                            key={child.key}
                            to={child.to}
                            className={({ isActive }) =>
                              cn(
                                'flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium transition-all',
                                isActive
                                  ? 'bg-grad-physics text-white shadow-md'
                                  : 'text-ink-500 hover:bg-physics-50 hover:text-physics-700'
                              )
                            }
                          >
                            <ChildIcon className="w-4 h-4 shrink-0" />
                            <span>{child.label}</span>
                          </NavLink>
                        );
                      })}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          }
          return (
            <NavLink
              key={group.key}
              to={group.to || '/'}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all',
                  sidebarCollapsed && 'justify-center px-2',
                  isActive
                    ? 'bg-grad-physics text-white shadow-md'
                    : 'text-ink-600 hover:bg-physics-50 hover:text-physics-700'
                )
              }
            >
              <GroupIcon className="w-5 h-5 shrink-0" />
              {!sidebarCollapsed && <span>{group.label}</span>}
            </NavLink>
          );
        })}
      </nav>

      <div className="border-t border-physics-50 shrink-0">
        <div className="p-3">
          {user ? (
            <div
              className={cn(
                'rounded-xl2 bg-gradient-to-br from-physics-50 to-white border border-physics-100 p-3',
                sidebarCollapsed && 'p-2'
              )}
            >
              <div className="flex items-center gap-2.5">
                <div className="relative shrink-0">
                  <img
                    src={user.avatar}
                    alt={user.name}
                    className={cn(
                      'rounded-full ring-2 ring-white shadow-sm object-cover',
                      sidebarCollapsed ? 'w-9 h-9' : 'w-10 h-10'
                    )}
                  />
                  {user.role === 'leader' && (
                    <Crown
                      className="absolute -top-1 -right-1 w-3.5 h-3.5 text-yellow-400"
                      fill="#FACC15"
                      strokeWidth={2}
                    />
                  )}
                </div>
                {!sidebarCollapsed && (
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-ink-800 truncate flex items-center gap-1.5">
                      {user.name}
                      {role === 'teacher' && (
                        <span className="chip-physics !px-1.5 !py-0.5 !text-[10px]">教师</span>
                      )}
                    </p>
                    <p className="text-xs text-ink-500 truncate">
                      {group?.name || '未加入小组'}
                    </p>
                  </div>
                )}
              </div>
              {!sidebarCollapsed && (
                <button
                  onClick={handleLogout}
                  className="mt-3 w-full flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium text-risk-600 hover:bg-risk-50 transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>退出登录</span>
                </button>
              )}
            </div>
          ) : (
            <div
              className={cn(
                'rounded-xl2 border border-dashed border-physics-200 p-3 text-center',
                sidebarCollapsed && 'p-2'
              )}
            >
              {sidebarCollapsed ? (
                <LogOut className="w-5 h-5 text-ink-400 mx-auto" />
              ) : (
                <p className="text-xs text-ink-500">未登录</p>
              )}
            </div>
          )}
        </div>
      </div>
    </motion.aside>
  );
}
