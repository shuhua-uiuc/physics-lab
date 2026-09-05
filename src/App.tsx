import { useEffect } from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useLocation,
  useNavigate,
} from 'react-router-dom';
import {
  Home as HomeIcon,
  Library,
  ShieldCheck,
  AlertTriangle,
  Sparkles,
} from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { initMockData } from '@/data/mockData';
import { apiEnabled, getToken } from '@/lib/apiClient';
import { bootstrapFromApi } from '@/lib/bootstrap';

import MissionShell from '@/components/layout/MissionShell';
import { useUIStore, ToastType } from '@/store/uiStore';
import { AnimatePresence, motion } from 'framer-motion';
import { cn } from '@/lib/utils';

import Login from '@/pages/Login';
import Dashboard from '@/pages/Dashboard';
import LearningHub from '@/pages/LearningHub';
import KnowledgeGalaxy from '@/pages/KnowledgeGalaxy';
import ProjectCenter from '@/pages/ProjectCenter';
import SafetyLab from '@/pages/SafetyLab';
import ResearchMarketplace from '@/pages/ResearchMarketplace';
import ResearchLeague from '@/pages/ResearchLeague';
import AchievementHall from '@/pages/AchievementHall';
import ResearchProfile from '@/pages/ResearchProfile';
import TeacherOverview from '@/pages/TeacherOverview';
import TeacherGroups from '@/pages/TeacherGroups';
import AdminConsole from '@/pages/AdminConsole';
import StudentRoster from '@/pages/StudentRoster';
import TeacherSafety from '@/pages/TeacherSafety';
import GroupCommunicator from '@/pages/GroupCommunicator';

import QuizPage from '@/pages/QuizPage';
import TheoryChallenge from '@/pages/TheoryChallenge';
import SafetyExam from '@/pages/SafetyExam';

function TeacherOnly({ children }: { children: React.ReactNode }) {
  const { role } = useAuthStore();
  const location = useLocation();
  if (role !== 'teacher' && role !== 'admin') {
    return <Navigate to={role ? '/dashboard' : '/login'} replace state={{ from: location.pathname }} />;
  }
  return <>{children}</>;
}

function AdminOnly({ children }: { children: React.ReactNode }) {
  const { role } = useAuthStore();
  const location = useLocation();
  if (role !== 'admin') {
    return <Navigate to={role === 'teacher' ? '/teacher/overview' : role ? '/dashboard' : '/login'} replace state={{ from: location.pathname }} />;
  }
  return <>{children}</>;
}

function Placeholder({
  title,
  subtitle,
  icon: Icon,
  tint = 'mission',
  children,
}: {
  title: string;
  subtitle?: string;
  icon: any;
  tint?: 'mission' | 'growth' | 'energy' | 'nova' | 'alert' | 'danger' | 'ink';
  children?: React.ReactNode;
}) {
  const tintGrad: Record<string, string> = {
    mission: 'from-mission-400 via-mission-500 to-mission-600',
    growth: 'from-growth-400 via-growth-500 to-growth-600',
    energy: 'from-energy-400 via-energy-500 to-alert-500',
    nova: 'from-nova-400 via-nova-500 to-nova-600',
    alert: 'from-alert-400 via-alert-500 to-alert-600',
    danger: 'from-danger-400 via-danger-500 to-danger-600',
    ink: 'from-ink-400 to-ink-600',
  };
  const tintCard: Record<string, string> = {
    mission: 'text-mission-600 bg-mission-50 border-mission-100',
    growth: 'text-growth-600 bg-growth-50 border-growth-100',
    energy: 'text-energy-600 bg-energy-50 border-energy-100',
    nova: 'text-nova-600 bg-nova-50 border-nova-100',
    alert: 'text-alert-600 bg-alert-50 border-alert-100',
    danger: 'text-danger-600 bg-danger-50 border-danger-100',
    ink: 'text-ink-600 bg-ink-50 border-ink-100',
  };
  return (
    <div className="w-full min-h-[60vh] flex items-center justify-center p-6">
      <div className="glass-card max-w-2xl w-full p-10 text-center shadow-soft">
        <div
          className={cn(
            'w-20 h-20 rounded-3xl mx-auto mb-6 flex items-center justify-center text-white shadow-glowMission bg-gradient-to-br relative overflow-hidden',
            tintGrad[tint],
          )}
        >
          <div className="absolute inset-0 bg-gradient-to-tr from-white/20 to-transparent" />
          <Icon className="w-10 h-10 relative z-10" strokeWidth={2} />
        </div>
        <h2 className="text-3xl font-extrabold text-ink-800 tracking-tight mb-2">{title}</h2>
        {subtitle && <p className="text-ink-500 mb-6">{subtitle}</p>}
        {children || (
          <span
            className={cn(
              'inline-flex items-center gap-2 text-sm font-semibold chip-pill border px-4 py-2',
              tintCard[tint],
            )}
          >
            <Sparkles className="w-4 h-4" />
            功能开发中 · 已有骨架占位
          </span>
        )}
      </div>
    </div>
  );
}

function NotFound() {
  const navigate = useNavigate();
  return (
    <div className="min-h-[60vh] flex items-center justify-center p-6">
      <div className="glass-card max-w-md w-full p-10 text-center shadow-soft">
        <div className="w-24 h-24 rounded-full bg-danger-50 flex items-center justify-center mx-auto mb-6 border border-danger-100">
          <AlertTriangle className="w-12 h-12 text-danger-500" strokeWidth={1.8} />
        </div>
        <div className="font-mono text-6xl font-black text-mission-200 mb-2 tracking-tight">404</div>
        <h2 className="text-2xl font-extrabold text-ink-800 mb-2">坐标偏离航道</h2>
        <p className="text-ink-500 mb-6">你访问的研究舱可能已被迁移或不存在。</p>
        <div className="flex items-center justify-center gap-3">
          <button className="btn-mission" onClick={() => navigate('/dashboard')}>
            <HomeIcon className="w-4 h-4" /> 返回指挥中心
          </button>
          <button className="btn-ghost-mission" onClick={() => navigate(-1)}>
            返回上一站
          </button>
        </div>
      </div>
    </div>
  );
}

function TeacherQBPlaceholder() {
  return (
    <Placeholder
      title="题库审核中心"
      subtitle="所有学生创作的高质量题库，等待你的审阅与发布。"
      icon={Library}
      tint="mission"
    >
      <span className="chip-mission inline-flex mt-2 gap-2">
        <Sparkles className="w-4 h-4" />
        演示模式：所有小组挑战自动通过
      </span>
    </Placeholder>
  );
}

function DashboardRoleGate() {
  const { role } = useAuthStore();
  if (role === 'teacher') return <Navigate to="/teacher/overview" replace />;
  if (role === 'admin') return <Navigate to="/admin" replace />;
  return <Dashboard />;
}

function LegacyToastBridge() {
  const { toasts, removeToast } = useUIStore();
  const typeStyles: Record<ToastType, string> = {
    info: 'from-mission-400 to-mission-600 shadow-glowMission',
    success: 'from-growth-400 to-growth-600 shadow-[0_0_0_1px_rgba(34,197,94,0.2),0_12px_40px_rgba(34,197,94,0.18)]',
    warning: 'from-alert-400 to-alert-600 shadow-glowEnergy',
    error: 'from-danger-400 to-danger-600 shadow-[0_0_0_1px_rgba(239,68,68,0.25),0_12px_40px_rgba(239,68,68,0.22)]',
  };
  if (!toasts.length) return null;
  return (
    <div className="fixed top-[90px] right-4 z-[120] w-full max-w-sm space-y-2.5 pointer-events-none">
      <AnimatePresence initial={false}>
        {toasts.slice(-3).map((t) => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, x: 40, scale: 0.93 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 40, scale: 0.93 }}
            transition={{ type: 'spring', damping: 24, stiffness: 270 }}
            className={cn(
              'pointer-events-auto rounded-2xl text-white p-4 flex items-start gap-3 bg-gradient-to-br',
              typeStyles[t.type],
            )}
          >
            <div className="flex-1 min-w-0 text-sm font-semibold leading-relaxed">{t.msg}</div>
            <button
              onClick={() => removeToast(t.id)}
              className="shrink-0 w-7 h-7 rounded-xl hover:bg-white/20 flex items-center justify-center transition"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.6} strokeLinecap="round">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

export default function App() {
  const initAuth = useAuthStore((s) => s.init);

  useEffect(() => {
    initMockData();
    initAuth();
    // 后端模式下，若已有 token（非首次登录/刷新页面），需重新拉取全量数据，
    // 否则 groupStore.groups 仅来自 localStorage/mock，groupId 无法匹配到真实小组。
    if (apiEnabled && getToken()) {
      bootstrapFromApi();
    }
  }, [initAuth]);

  return (
    <Router>
      <LegacyToastBridge />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<Navigate to="/dashboard" replace />} />

        <Route
          path="/dashboard"
          element={
            <MissionShell>
              <DashboardRoleGate />
            </MissionShell>
          }
        />

        <Route
          path="/theory/topics"
          element={
            <MissionShell>
              <LearningHub />
            </MissionShell>
          }
        />
        <Route path="/theory/topics/:id" element={<Navigate to="/theory/topics" replace />} />

        <Route
          path="/theory/quiz/:sessionId"
          element={
            <MissionShell>
              <QuizPage mode="quiz" />
            </MissionShell>
          }
        />

        <Route
          path="/theory/challenge"
          element={
            <MissionShell>
              <KnowledgeGalaxy />
            </MissionShell>
          }
        />
        <Route
          path="/theory/challenge/:id/accept"
          element={
            <MissionShell>
              <QuizPage mode="challenge" />
            </MissionShell>
          }
        />
        <Route
          path="/theory/challenges"
          element={
            <MissionShell>
              <TheoryChallenge />
            </MissionShell>
          }
        />

        <Route
          path="/projects"
          element={
            <MissionShell>
              <ProjectCenter />
            </MissionShell>
          }
        />
        <Route path="/projects/:id" element={<Navigate to="/projects" replace />} />
        <Route
          path="/projects/:id/safety"
          element={
            <MissionShell>
              <SafetyExam />
            </MissionShell>
          }
        />
        <Route
          path="/projects/:id/recruit/:rid"
          element={
            <MissionShell>
              <ResearchMarketplace />
            </MissionShell>
          }
        />

        <Route
          path="/safety-lab"
          element={
            <MissionShell>
              <SafetyLab />
            </MissionShell>
          }
        />

        <Route
          path="/safety-exam/:category"
          element={
            <MissionShell>
              <SafetyExam />
            </MissionShell>
          }
        />

        <Route
          path="/recruit/market"
          element={
            <MissionShell>
              <ResearchMarketplace />
            </MissionShell>
          }
        />

        <Route
          path="/coins"
          element={
            <MissionShell>
              <ResearchLeague />
            </MissionShell>
          }
        />

        <Route
          path="/showcase"
          element={
            <MissionShell>
              <AchievementHall />
            </MissionShell>
          }
        />

        <Route
          path="/profile"
          element={
            <MissionShell>
              <ResearchProfile />
            </MissionShell>
          }
        />

        <Route path="/group" element={<Navigate to="/communicator" replace />} />

        <Route
          path="/communicator"
          element={
            <MissionShell>
              <GroupCommunicator />
            </MissionShell>
          }
        />

        <Route
          path="/admin"
          element={
            <AdminOnly>
              <MissionShell>
                <AdminConsole />
              </MissionShell>
            </AdminOnly>
          }
        />

        <Route
          path="/teacher/overview"
          element={
            <TeacherOnly>
              <MissionShell>
                <TeacherOverview />
              </MissionShell>
            </TeacherOnly>
          }
        />
        <Route
          path="/teacher/groups"
          element={
            <TeacherOnly>
              <MissionShell>
                <TeacherGroups />
              </MissionShell>
            </TeacherOnly>
          }
        />
        <Route
          path="/teacher/roster"
          element={
            <TeacherOnly>
              <MissionShell>
                <StudentRoster />
              </MissionShell>
            </TeacherOnly>
          }
        />
        <Route
          path="/teacher/question-bank"
          element={
            <TeacherOnly>
              <MissionShell>
                <TeacherQBPlaceholder />
              </MissionShell>
            </TeacherOnly>
          }
        />
        <Route
          path="/teacher/safety"
          element={
            <TeacherOnly>
              <MissionShell>
                <TeacherSafety />
              </MissionShell>
            </TeacherOnly>
          }
        />

        <Route
          path="*"
          element={
            <MissionShell requireAuth={false}>
              <NotFound />
            </MissionShell>
          }
        />
      </Routes>
    </Router>
  );
}
