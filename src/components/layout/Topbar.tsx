import { useState } from 'react';
import { useLocation, Link, useNavigate } from 'react-router-dom';
import {
  ChevronRight,
  Home,
  User,
  GraduationCap,
  UserRound,
  LogOut,
  Camera,
  X,
  CheckCircle2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/authStore';
import { useGroupStore } from '@/store/groupStore';
import CoinBadge from '@/components/ui/CoinBadge';

const AVATAR_OPTIONS = [
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix&backgroundColor=ffdfbf',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Aneka&backgroundColor=cbf3f0',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Bailey&backgroundColor=e0f2fe',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Charlie&backgroundColor=ede9fe',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Diana&backgroundColor=fce7f3',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Ethan&backgroundColor=dcfce7',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Fiona&backgroundColor=fff7ed',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=George&backgroundColor=f0fdfa',
];

const routeLabels: Record<string, string> = {
  dashboard: '仪表盘',
  group: '小组中心',
  theory: '理论学习',
  outline: '主题大纲',
  challenge: '挑战大厅',
  project: '项目中心',
  kanban: '项目看板',
  recruit: '招募市场',
  coin: '能量币',
  showcase: '成果展示',
  teacher: '教师后台',
};

export default function Topbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { role, userId, logout } = useAuthStore();
  const { getUserById, getGroupById, updateUserAvatar } = useGroupStore();
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [selectedAvatar, setSelectedAvatar] = useState('');

  const pathParts = location.pathname.split('/').filter(Boolean);
  const breadcrumbs = pathParts.map((part, idx) => ({
    label: routeLabels[part] || part,
    to: '/' + pathParts.slice(0, idx + 1).join('/'),
  }));

  const user = userId ? getUserById(userId) : undefined;
  const group = user?.groupId ? getGroupById(user.groupId) : undefined;
  const userCoins = user?.personalCoins || 0;

  const handleAvatarChange = () => {
    if (selectedAvatar && userId) {
      updateUserAvatar(userId, selectedAvatar);
      setShowAvatarModal(false);
      setSelectedAvatar('');
    }
  };

  const handleLoginAs = (targetRole: 'teacher' | 'student') => {
    if (targetRole === 'teacher') {
      useAuthStore.getState().loginTeacher();
    } else {
      if (userId) {
        useAuthStore.getState().loginStudent({
          userId,
          groupId: user?.groupId || '',
        });
      }
    }
    navigate('/dashboard');
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="h-16 bg-white/80 backdrop-blur-md border-b border-physics-100 shrink-0 sticky top-0 z-10">
      <div className="h-full px-6 flex items-center justify-between gap-6">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <nav className="flex items-center gap-1.5 text-sm text-ink-500 min-w-0">
            <Link
              to="/dashboard"
              className="w-8 h-8 rounded-lg flex items-center justify-center text-ink-400 hover:text-physics-600 hover:bg-physics-50 transition-colors shrink-0"
            >
              <Home className="w-4 h-4" />
            </Link>
            {breadcrumbs.length > 0 && (
              <ChevronRight className="w-3.5 h-3.5 text-ink-300 shrink-0" />
            )}
            {breadcrumbs.map((crumb, idx) => (
              <div key={crumb.to} className="flex items-center gap-1.5 min-w-0">
                {idx > 0 && (
                  <ChevronRight className="w-3.5 h-3.5 text-ink-300 shrink-0" />
                )}
                {idx === breadcrumbs.length - 1 ? (
                  <span className="font-semibold text-physics-800 truncate">
                    {crumb.label}
                  </span>
                ) : (
                  <Link
                    to={crumb.to}
                    className="hover:text-physics-600 transition-colors truncate"
                  >
                    {crumb.label}
                  </Link>
                )}
              </div>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <div className="hidden sm:flex items-center gap-2 pr-3 border-r border-physics-100">
            {role === 'teacher' ? (
              <button
                onClick={() => handleLoginAs('student')}
                className="btn-outline !py-2 !px-3 !text-xs"
              >
                <UserRound className="w-3.5 h-3.5" />
                切换学生视角
              </button>
            ) : (
              <button
                onClick={() => handleLoginAs('teacher')}
                className="btn-outline !py-2 !px-3 !text-xs"
              >
                <GraduationCap className="w-3.5 h-3.5" />
                教师入口
              </button>
            )}
          </div>

          <CoinBadge amount={userCoins} size="sm" className="pr-1" />

          <div className="relative group">
            <button className="flex items-center gap-2.5 pl-3 pr-2 py-1.5 rounded-xl2 hover:bg-physics-50 transition-colors">
              <div className="flex items-center gap-2">
                {user ? (
                  <img
                    src={user.avatar}
                    alt={user.name}
                    className="w-9 h-9 rounded-full ring-2 ring-white shadow-sm object-cover"
                  />
                ) : (
                  <div className="w-9 h-9 rounded-full bg-ink-100 flex items-center justify-center">
                    <User className="w-5 h-5 text-ink-400" />
                  </div>
                )}
                <div className="hidden md:block text-left leading-tight">
                  <p className="text-sm font-semibold text-ink-800">
                    {user?.name || '访客'}
                  </p>
                  <p className="text-[11px] text-ink-500">
                    {role === 'teacher'
                      ? '教师'
                      : group?.name || '未加入小组'}
                  </p>
                </div>
              </div>
            </button>

            <div
              className={cn(
                'absolute right-0 top-full mt-2 w-56 rounded-xl2 bg-white shadow-cardLifted border border-physics-100 py-1.5 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 translate-y-1 group-hover:translate-y-0 z-50'
              )}
            >
              <div className="px-4 py-3 border-b border-physics-50">
                <div className="flex items-center gap-2.5">
                  {user ? (
                    <img
                      src={user.avatar}
                      alt={user.name}
                      className="w-10 h-10 rounded-full object-cover ring-2 ring-physics-50"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-ink-100 flex items-center justify-center">
                      <User className="w-5 h-5 text-ink-400" />
                    </div>
                  )}
                  <div className="leading-tight">
                    <p className="font-semibold text-sm text-ink-800">
                      {user?.name || '访客用户'}
                    </p>
                    <p className="text-[11px] text-ink-500">
                      {role === 'teacher' ? '教师账号' : '学生账号'}
                    </p>
                  </div>
                </div>
                {user && (
                  <div className="mt-3 flex items-center justify-between rounded-lg bg-physics-50/60 px-3 py-2">
                    <span className="text-xs text-ink-600">个人能量币</span>
                    <CoinBadge amount={userCoins} size="sm" />
                  </div>
                )}
              </div>
              <div className="py-1">
                <button
                  onClick={() => setShowAvatarModal(true)}
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-mission-600 hover:bg-mission-50 transition-colors"
                >
                  <Camera className="w-4 h-4" />
                  <span>更换头像</span>
                </button>
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-risk-600 hover:bg-risk-50 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  <span>退出登录</span>
                </button>
              </div>
            </div>
          </div>

          {showAvatarModal && (
            <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-ink-900/50 backdrop-blur-sm">
              <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl">
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
        </div>
      </div>
    </header>
  );
}
