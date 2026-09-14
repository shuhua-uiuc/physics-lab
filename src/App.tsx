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
  ShieldCheck,
  AlertTriangle,
  Sparkles,
} from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { initMockData } from '@/data/mockData';
import { apiEnabled, getToken } from '@/lib/apiClient';
import { bootstrapFromApi } from '@/lib/bootstrap';

import MissionShell from '@/components/layout/MissionShell';
import { useUIStore } from '@/store/uiStore';
import { cn } from '@/lib/utils';

import Login from '@/pages/Login';
import Dashboard from '@/pages/Dashboard';
import MyTeam from '@/pages/MyTeam';
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
import TeacherProjects from '@/pages/TeacherProjects';
import AdminConsole from '@/pages/AdminConsole';
import StudentRoster from '@/pages/StudentRoster';
import TeacherSafety from '@/pages/TeacherSafety';
import TeacherQuestionBank from '@/pages/TeacherQuestionBank';
import TeacherShowcaseReview from '@/pages/TeacherShowcaseReview';
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

function DashboardRoleGate() {
  const { role } = useAuthStore();
  if (role === 'teacher') return <Navigate to="/teacher/overview" replace />;
  if (role === 'admin') return <Navigate to="/admin" replace />;
  return <Dashboard />;
}

export default function App() {
  const initAuth = useAuthStore((s) => s.init);
  const role = useAuthStore((s) => s.role);
  const userId = useAuthStore((s) => s.userId);

  useEffect(() => {
    initMockData();
    initAuth();
    // 后端模式下，若已有 token（非首次登录/刷新页面），需重新拉取全量数据，
    // 否则 groupStore.groups 仅来自 localStorage/mock，groupId 无法匹配到真实小组。
    if (apiEnabled && getToken()) {
      bootstrapFromApi();
    }
  }, [initAuth]);

  // 登出（或未登录）时清空残留提示。登录后不再注入写死的"欢迎通知"——那些消息对
  // 每个学生每次登录都完全相同，且「+180⚡ 能量币到账」声称了并未发生的入账。
  useEffect(() => {
    if (!userId || !role) useUIStore.getState().clearToasts();
  }, [userId, role]);

  return (
    <Router>
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
          path="/my-team"
          element={
            <MissionShell>
              <MyTeam />
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
          element={<ResearchMarketplace />}
        />

        <Route
          path="/coins"
          element={<ResearchLeague />}
        />

        <Route
          path="/showcase"
          element={<AchievementHall />}
        />

        <Route
          path="/profile"
          element={<ResearchProfile />}
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
              <TeacherOverview />
            </TeacherOnly>
          }
        />
        <Route
          path="/teacher/groups"
          element={
            <TeacherOnly>
              <TeacherGroups />
            </TeacherOnly>
          }
        />
        <Route
          path="/teacher/projects"
          element={
            <TeacherOnly>
              <MissionShell>
                <TeacherProjects />
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
                <TeacherQuestionBank />
              </MissionShell>
            </TeacherOnly>
          }
        />
        <Route
          path="/teacher/showcase"
          element={
            <TeacherOnly>
              <MissionShell>
                <TeacherShowcaseReview />
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
