import type { ReactNode } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import {
  LayoutDashboard,
  BookOpen,
  Sparkles,
  FolderKanban,
  ShieldCheck,
  ShoppingCart,
  Trophy,
  Medal,
  Users,
  UsersRound,
  Rocket,
  Bell,
  LogOut,
  Zap,
  Info,
  CheckCircle2,
  AlertTriangle,
  X,
  Camera,
  Gauge,
  ClipboardList,
  Shield,
  Menu,
} from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { useGroupStore } from '@/store/groupStore';
import { useUIStore } from '@/store/uiStore';
import { cn } from '@/lib/utils';

interface MissionShellProps {
  children: ReactNode;
  requireAuth?: boolean;
}

/**
 * 把用户选的照片压成小尺寸正方形的 data URL。
 *
 * 头像最终以字符串存进数据库 `users.avatar`，而 `/api/users` 每次登录都会整表返回，
 * 所以必须在客户端压到位——否则一张手机原图（数 MB）会让这个接口直接爆掉。
 * 128×128 JPEG 约 3–8KB，48 人全上传时接口约增加 0.2–0.4MB，可接受。
 */
async function compressImageToDataUrl(file: File, size = 128, quality = 0.75): Promise<string> {
  const bitmap = await createImageBitmap(file);
  try {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('无法创建画布');
    // 居中裁剪成正方形，避免照片被拉变形
    const edge = Math.min(bitmap.width, bitmap.height);
    const sx = (bitmap.width - edge) / 2;
    const sy = (bitmap.height - edge) / 2;
    ctx.drawImage(bitmap, sx, sy, edge, edge, 0, 0, size, size);
    return canvas.toDataURL('image/jpeg', quality);
  } finally {
    bitmap.close?.();
  }
}

const AVATAR_OPTIONS = [  'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix&backgroundColor=ffdfbf',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Aneka&backgroundColor=cbf3f0',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Bailey&backgroundColor=e0f2fe',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Charlie&backgroundColor=ede9fe',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Diana&backgroundColor=fce7f3',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Ethan&backgroundColor=dcfce7',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Fiona&backgroundColor=fff7ed',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=George&backgroundColor=f0fdfa',
];

interface NavItem {
  id: string;
  label: string;
  icon: any;
  to: string;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, to: '/dashboard' },
  { id: 'team', label: 'My Team', icon: UsersRound, to: '/my-team' },
  { id: 'learning', label: 'Learning Hub', icon: BookOpen, to: '/theory/topics' },
  { id: 'galaxy', label: 'Knowledge Galaxy', icon: Sparkles, to: '/theory/challenge' },
  { id: 'communicator', label: 'Group Communicator', icon: Users, to: '/communicator' },
  { id: 'project', label: 'Project Center', icon: FolderKanban, to: '/projects' },
  { id: 'safety', label: 'Safety Lab', icon: ShieldCheck, to: '/safety-lab' },
  { id: 'market', label: 'Research Marketplace', icon: ShoppingCart, to: '/recruit/market' },
  { id: 'league', label: 'Research League', icon: Trophy, to: '/coins' },
  { id: 'achievement', label: 'Achievement Hall', icon: Medal, to: '/showcase' },
];

/** 教师 / 管理员控制台专属导航（学生端不可见） */
const TEACHER_NAV_ITEMS: NavItem[] = [
  { id: 't-overview', label: 'Mission Overview', icon: Gauge, to: '/teacher/overview' },
  { id: 't-groups', label: 'Fleet Management', icon: Users, to: '/teacher/groups' },
  { id: 't-projects', label: 'Project & Recruitment', icon: FolderKanban, to: '/teacher/projects' },
  { id: 't-roster', label: 'Student Roster', icon: ClipboardList, to: '/teacher/roster' },
  { id: 't-question', label: 'Question Bank', icon: BookOpen, to: '/teacher/question-bank' },
  { id: 't-safety', label: 'Safety Center', icon: ShieldCheck, to: '/teacher/safety' },
];

function RequireAuth({ children, allowRoles }: { children: ReactNode; allowRoles?: Array<'student' | 'teacher' | 'admin'> }) {
  const { role } = useAuthStore();
  const location = useLocation();
  if (!role) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  if (allowRoles && !allowRoles.includes(role as 'student' | 'teacher' | 'admin')) {
    if (role === 'admin') return <Navigate to="/admin" replace />;
    return <Navigate to={role === 'teacher' ? '/teacher/overview' : '/dashboard'} replace />;
  }
  return <>{children}</>;
}

function MissionHeader({ onOpenNav }: { onOpenNav: () => void }) {
  const navigate = useNavigate();
  const { role, logout, userId } = useAuthStore();
  const { getGroupById, getUserById, updateUserAvatar } = useGroupStore();
  const groupId = useAuthStore((s) => s.groupId);
  const currentUser = userId && userId !== 'teacher' && userId !== 'admin' ? getUserById(userId) : undefined;
  const currentGroup = groupId ? getGroupById(groupId) : undefined;
  const coreCoins = Math.max(0, currentGroup?.totalCoins || 0);
  const level = Math.max(1, Math.min(12, Math.floor(Math.log10(Math.max(1, coreCoins)) * 2)));

  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [selectedAvatar, setSelectedAvatar] = useState('');
  const [avatarErr, setAvatarErr] = useState('');
  const [compressing, setCompressing] = useState(false);

  /** 选照片 → 客户端压缩成小图 data URL，再走原有的「确认更换」保存 */
  const handleAvatarFile = async (file: File | undefined) => {
    if (!file) return;
    setAvatarErr('');
    if (!file.type.startsWith('image/')) {
      setAvatarErr('请选择图片文件（jpg / png 等）');
      return;
    }
    setCompressing(true);
    try {
      setSelectedAvatar(await compressImageToDataUrl(file));
    } catch {
      setAvatarErr('图片处理失败，请换一张试试');
    } finally {
      setCompressing(false);
    }
  };

  const handleAvatarChange = () => {
    if (selectedAvatar && userId) {
      updateUserAvatar(userId, selectedAvatar);
      setShowAvatarModal(false);
      setSelectedAvatar('');
    }
  };

  const todayStr = new Date().toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  });

  return (
    <>
    <header
      className="fixed top-0 left-0 right-0 z-50 h-16 glass-card rounded-none !border-t-0 !border-l-0 !border-r-0 border-b border-mission-100/60 flex items-center gap-2 px-3 md:gap-4 md:px-8"
    >
      {/* 移动端汉堡：桌面端已有常驻侧边栏，故隐藏 */}
      <button
        onClick={onOpenNav}
        aria-label="打开导航菜单"
        className="md:hidden shrink-0 w-10 h-10 rounded-xl flex items-center justify-center text-ink-600 hover:bg-mission-50/70 hover:text-mission-600 transition-colors"
      >
        <Menu size={20} />
      </button>

      <div className="flex items-center gap-2.5 md:gap-4 md:w-[380px] min-w-0">
        <div className="relative w-11 h-11 flex items-center justify-center shrink-0">
          <div className="orbit-ring w-[72px] h-[72px] animate-spin" style={{ animationDuration: '20s' }} />
          <div className="orbit-ring w-[56px] h-[56px] animate-spin" style={{ animationDuration: '14s', animationDirection: 'reverse' }} />
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-mission-400 via-mission-500 to-mission-600 shadow-glowMission flex items-center justify-center relative z-10">
            <div className="w-3 h-3 rounded-full bg-white/90 animate-pulseRing" />
          </div>
        </div>
        <div className="leading-tight min-w-0">
          <div className="text-[15px] font-extrabold text-ink-800 tracking-tight truncate">
            <span className="hidden sm:inline">Physics Mission Control</span>
            <span className="sm:hidden">物理实验室</span>
          </div>
          <div className="hidden sm:block text-[11px] text-ink-500 font-medium tracking-wide mt-0.5">
            PBL Learning Platform · v2.6
          </div>
        </div>
      </div>

      <div className="flex-1 hidden lg:flex justify-center">
        <div className="glass-card glass-card-hover px-5 py-2.5 flex items-center gap-4 rounded-2xl">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-mission-500 to-nova-500 flex items-center justify-center shadow-lg shadow-mission-500/20">
            <Rocket size={18} className="text-white" />
          </div>
          <div className="leading-tight">
            <div className="text-[11px] font-mono font-semibold text-mission-600 tracking-wider uppercase">
              Today&apos;s Mission
            </div>
            <div className="text-[14px] font-semibold text-ink-800 mt-0.5">
              {todayStr} · <span className="text-mission-600">特色班</span>
            </div>
          </div>
          {/* 这里原有一个写死的 "Today 82%" 进度条与徽章——对所有角色、任何时候都显示
              82%，且与首页真实的「今日任务进度」重复，已移除。 */}
        </div>
      </div>

      <div className="flex items-center gap-2 md:gap-3 md:w-[380px] justify-end ml-auto shrink-0">
        {/* 窄屏放不下能量卡，手机上隐藏（能量在 Dashboard / 我的小组里都有） */}
        <div className="hidden md:flex glass-card px-3.5 py-2 rounded-2xl items-center gap-2.5 group cursor-pointer">
          <div className="relative">
            <div className="absolute inset-0 rounded-full bg-energy-400/30 blur-md animate-pulse" />
            <Zap size={18} className="text-energy-500 relative z-10 fill-energy-400/30" />
          </div>
          <div className="text-[16px] font-extrabold text-gradient-energy leading-none tabular-nums">
            {coreCoins}
          </div>
          <div className="text-[10px] text-ink-400 font-medium">⚡CORE</div>
        </div>

        

        <div className="flex items-center gap-2.5">
          <div className="relative group">
            {currentUser ? (
              <button onClick={() => setShowAvatarModal(true)} className="relative" title="点击更换头像">
                <img
                  src={currentUser.avatar}
                  alt={currentUser.name}
                  className="w-10 h-10 rounded-2xl ring-2 ring-white shadow-soft object-cover bg-gradient-to-br from-mission-100 to-nova-100"
                />
                <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-mission-500 flex items-center justify-center ring-2 ring-white opacity-0 group-hover:opacity-100 transition-opacity">
                  <Camera size={11} className="text-white" />
                </span>
              </button>
            ) : (
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-mission-400 to-nova-500 flex items-center justify-center text-white font-bold ring-2 ring-white shadow-soft">
                {role === 'admin' ? 'A' : role === 'teacher' ? 'T' : 'Y'}
              </div>
            )}
          </div>
          <div className="hidden sm:flex chip-nova !py-1 !px-2.5 items-center gap-1">
            <span className="text-[10px] font-black tracking-wider">LV{level}</span>
            <span className="text-[11px] font-semibold">Researcher</span>
          </div>
        </div>

        <button
          onClick={() => {
            logout();
            navigate('/login');
          }}
          className="w-9 h-9 rounded-xl glass-card glass-card-hover flex items-center justify-center text-ink-500 hover:text-danger-600"
          title="退出登录"
        >
          <LogOut size={16} />
        </button>
      </div>
      </header>

      {/* 头像弹窗必须放在 <header> 之外：header 用了 glass-card（backdrop-filter），
          而 backdrop-filter 会让该元素成为内部 position:fixed 的定位基准——弹窗会被
          「困」在 64px 高的 header 里，垂直居中后被顶出屏幕（实测 top:-125px）。
          加 max-h + overflow-y-auto 兜底矮屏。 */}
      {showAvatarModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-ink-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-lg text-ink-800">选择头像</h3>
              <button
                onClick={() => { setShowAvatarModal(false); setSelectedAvatar(''); }}
                className="p-1.5 rounded-lg hover:bg-ink-100 transition-colors"
              >
                <X size={20} className="text-ink-500" />
              </button>
            </div>
            <div className="grid grid-cols-4 gap-3 mb-6">
              {AVATAR_OPTIONS.map((avatar, idx) => (
                <button
                  key={idx}
                  onClick={() => setSelectedAvatar(avatar)}
                  className={cn(
                    'relative rounded-xl overflow-hidden border-2 transition-all',
                    selectedAvatar === avatar
                      ? 'border-mission-500 ring-2 ring-mission-200 scale-105'
                      : 'border-transparent hover:border-mission-200'
                  )}
                >
                  <img
                    src={avatar}
                    alt={`头像 ${idx + 1}`}
                    className="w-full aspect-square object-cover"
                  />
                  {selectedAvatar === avatar && (
                    <div className="absolute inset-0 bg-mission-500/20 flex items-center justify-center">
                      <CheckCircle2 size={20} className="text-mission-500" />
                    </div>
                  )}
                </button>
              ))}
            </div>

            {/* 上传真人照片：客户端压成 128×128 JPEG 再入库，避免 /api/users 体积爆炸 */}
            <div className="mb-6">
              <label className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl border-2 border-dashed border-mission-200 text-[13px] font-bold text-mission-600 hover:bg-mission-50/60 cursor-pointer transition-colors">
                <Camera size={15} />
                {compressing ? '处理中…' : '上传自己的照片'}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    void handleAvatarFile(e.target.files?.[0]);
                    e.target.value = '';
                  }}
                />
              </label>
              {avatarErr && (
                <p className="mt-2 text-[12px] font-semibold text-danger-600 flex items-center gap-1">
                  <AlertTriangle size={11} />{avatarErr}
                </p>
              )}
              {selectedAvatar.startsWith('data:') && (
                <div className="mt-3 flex items-center gap-2.5 p-2 rounded-xl bg-mission-50/70 border border-mission-100">
                  <img src={selectedAvatar} alt="已选照片" className="w-10 h-10 rounded-lg object-cover" />
                  <span className="text-[12px] font-semibold text-ink-600">已选照片，点「确认更换」保存</span>
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => { setShowAvatarModal(false); setSelectedAvatar(''); }}
                className="flex-1 btn-outline !py-2.5"
              >
                取消
              </button>
              <button
                onClick={handleAvatarChange}
                disabled={!selectedAvatar}
                className={cn(
                  'flex-1 btn-primary !py-2.5',
                  !selectedAvatar && 'opacity-50 cursor-not-allowed'
                )}
              >
                确认更换
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function NavRail({ open, onClose }: { open: boolean; onClose: () => void }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { role } = useAuthStore();
  const [hovered, setHovered] = useState<string | null>(null);

  // 教师使用控制台专属导航，学生使用学习端导航
  const baseItems: NavItem[] =
    role === 'teacher' || role === 'admin' ? TEACHER_NAV_ITEMS : NAV_ITEMS;
  const adminItems: NavItem[] = role === 'admin'
    ? [{ id: 'admin', label: 'Admin Console', icon: Shield, to: '/admin' }]
    : [];

  return (
    <>
      {/* 移动端抽屉遮罩：点击关闭 */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-ink-900/40 backdrop-blur-sm md:hidden"
          />
        )}
      </AnimatePresence>

      <nav
        className={cn(
          'fixed z-50 glass-card flex flex-col py-4 gap-1.5 transition-transform duration-300 ease-out',
          // 桌面：常驻左侧竖排图标条
          'md:left-5 md:top-20 md:w-[76px] md:h-[calc(100vh-100px)] md:items-center md:rounded-2xl md:translate-x-0',
          // 移动：左侧抽屉。触屏没有 hover，所以文字标签必须常显（桌面靠悬停气泡）
          'left-0 top-0 h-full w-[248px] items-stretch px-3 rounded-r-3xl',
          open ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        )}
      >
      {[...baseItems, ...adminItems].map((item, idx) => {
        const Icon = item.icon;
        const active = location.pathname.startsWith(item.to) || (idx === 0 && location.pathname === '/');
        const isHovered = hovered === item.id;
        return (
          <div
            key={item.id}
            className="relative w-full flex justify-center"
            onMouseEnter={() => setHovered(item.id)}
            onMouseLeave={() => setHovered(null)}
          >
            <button
              onClick={() => { navigate(item.to); onClose(); }}
              aria-label={item.label}
              className={cn(
                'relative rounded-2xl flex items-center transition-all duration-300 group',
                'gap-3 px-3 h-12 w-full justify-start',
                'md:w-[56px] md:h-[56px] md:px-0 md:justify-center',
                active
                  ? 'bg-gradient-to-br from-mission-400 via-mission-500 to-mission-600 text-white shadow-glowMission md:scale-105'
                  : 'text-ink-400 hover:text-mission-600 hover:bg-mission-50/60'
              )}
            >
              {active && (
                <>
                  <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/20 to-transparent" />
                  <div className="absolute -left-1 w-1 h-6 rounded-r-full bg-gradient-to-b from-mission-300 to-nova-400" />
                </>
              )}
              <Icon size={22} strokeWidth={active ? 2.4 : 2} className="relative z-10 shrink-0" />
              <span className="md:hidden relative z-10 text-[13.5px] font-bold truncate">{item.label}</span>
            </button>

            <AnimatePresence>
              {isHovered && (
                <motion.div
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -8 }}
                  transition={{ duration: 0.18 }}
                  className="absolute left-full top-1/2 -translate-y-1/2 ml-3 z-50 pointer-events-none"
                >
                  <div className="glass-card px-3 py-2 rounded-xl whitespace-nowrap shadow-glowMission">
                    <div className="text-[12px] font-bold text-ink-800">{item.label}</div>
                    <div className="text-[10px] text-ink-500 font-mono mt-0.5">CMD-{String(idx + 1).padStart(2, '0')}</div>
                  </div>
                  <div className="absolute left-[-5px] top-1/2 -translate-y-1/2 w-2.5 h-2.5 rotate-45 glass-card !rounded-sm !border-r-0 !border-t-0" />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}

      <div className="flex-1" />

      <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-energy-400/20 via-alert-400/15 to-transparent flex items-center justify-center cursor-pointer group hover:shadow-glowEnergy transition-all">
        <Zap size={20} className="text-energy-500 group-hover:scale-110 transition-transform" />
      </div>
    </nav>
    </>
  );
}

function ToastStack() {
  const { toasts, removeToast, clearToasts } = useUIStore();
  const [isOpen, setIsOpen] = useState(true);
  const [hasAutoCollapsed, setHasAutoCollapsed] = useState(false);
  const prevCountRef = useRef(toasts.length);

  // 新通知到达时自动弹出面板（如转账成功提醒），5 秒后自动收起
  useEffect(() => {
    if (toasts.length > prevCountRef.current) {
      setIsOpen(true);
      const timer = setTimeout(() => setIsOpen(false), 5000);
      prevCountRef.current = toasts.length;
      return () => clearTimeout(timer);
    }
    prevCountRef.current = toasts.length;
  }, [toasts.length]);

  useEffect(() => {
    if (toasts.length > 0 && !hasAutoCollapsed) {
      const timer = setTimeout(() => {
        setIsOpen(false);
        setHasAutoCollapsed(true);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [toasts.length, hasAutoCollapsed]);

  // 点击小喇叭：有未读消息时直接清除（让消息消失）；无消息时再切换面板开合。
  const toggleToasts = () => {
    if (toasts.length > 0) {
      clearToasts();
      setIsOpen(false);
    } else {
      setIsOpen(true);
    }
  };

  const markAllRead = () => {
    clearToasts();
    setIsOpen(false);
  };

  const typeIcon = {
    info: Info,
    success: CheckCircle2,
    warning: AlertTriangle,
    error: AlertTriangle,
  };
  const typeColor = {
    info: 'from-mission-400 to-mission-600 text-mission-600 bg-mission-50',
    success: 'from-growth-400 to-growth-600 text-growth-600 bg-growth-50',
    warning: 'from-alert-400 to-alert-600 text-alert-600 bg-alert-50',
    error: 'from-danger-400 to-danger-600 text-danger-600 bg-danger-50',
  };

  return (
    <>
      <button
        onClick={toggleToasts}
        className="fixed top-[60px] right-6 z-100 w-10 h-10 rounded-2xl glass-card glass-card-hover flex items-center justify-center text-ink-600 hover:text-mission-600 transition-all hover:scale-105"
      >
        <Bell size={18} />
        {toasts.length > 0 && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-1 -right-1 min-w-[20px] h-[20px] rounded-full bg-danger-500 text-white text-[10px] font-bold flex items-center justify-center px-1.5 ring-2 ring-white"
          >
            {toasts.length}
          </motion.div>
        )}
      </button>

      <AnimatePresence>
        {isOpen && toasts.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-99"
            onClick={() => setIsOpen(false)}
          />
        )}
      </AnimatePresence>

      <div className={`toast-container ${isOpen ? '' : 'opacity-0 pointer-events-none'}`}>
        <AnimatePresence>
          {isOpen &&
            toasts.slice().reverse().map((t, i) => {
              const Icon = typeIcon[t.type];
              return (
                <motion.div
                  key={t.id}
                  layout
                  initial={{ opacity: 0, x: 40, y: 20, scale: 0.92 }}
                  animate={{ opacity: 1, x: 0, y: i * -4, scale: 1 }}
                  exit={{ opacity: 0, x: 60, scale: 0.9 }}
                  transition={{ type: 'spring', damping: 26, stiffness: 280, delay: i * 0.06 }}
                  className="toast-item"
                >
                  <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${typeColor[t.type]} flex items-center justify-center shrink-0`}>
                    <Icon size={17} className="text-white" />
                  </div>
                  <div className="flex-1 min-w-0 text-[13px] leading-relaxed text-ink-700 font-medium">
                    {t.msg}
                  </div>
                  <button
                    onClick={() => removeToast(t.id)}
                    className="shrink-0 w-6 h-6 rounded-lg hover:bg-ink-100 flex items-center justify-center text-ink-400 hover:text-ink-600 transition"
                  >
                    <X size={13} strokeWidth={2.5} />
                  </button>
                </motion.div>
              );
            })}
          {isOpen && toasts.length > 0 && (
            <motion.div
              key="mark-all"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex justify-end pt-2"
            >
              <button
                onClick={markAllRead}
                className="text-[12px] text-mission-600 font-medium hover:text-mission-700 transition"
              >
                全部已读
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}

export default function MissionShell({ children, requireAuth = true }: MissionShellProps) {
  const location = useLocation();
  const { userId, init } = useAuthStore();
  // 移动端抽屉开合；桌面端导航常驻，此状态不影响布局
  const [navOpen, setNavOpen] = useState(false);

  useEffect(() => {
    init();
  }, [init]);

  if (requireAuth && !userId) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  const allowRoles: Array<'student' | 'teacher' | 'admin'> = ['student', 'teacher', 'admin'];
  return (
    <RequireAuth allowRoles={allowRoles}>
      <div className="min-h-screen w-full relative">
        <MissionHeader onOpenNav={() => setNavOpen(true)} />
        <NavRail open={navOpen} onClose={() => setNavOpen(false)} />
        <ToastStack />

        {/* 移动端不留左侧空间、内边距收窄；桌面端为常驻导航让出 120px */}
        <main className="md:ml-[120px] px-4 md:px-8 pt-[72px] md:pt-20 pb-10">
          <div className="max-w-[1440px] mx-auto w-full box-border">
            <AnimatePresence mode="wait">
              <motion.div
                key={location.pathname}
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                className="min-h-[calc(100vh-140px)]"
              >
                {children}
              </motion.div>
            </AnimatePresence>
          </div>
        </main>
      </div>
    </RequireAuth>
  );
}
