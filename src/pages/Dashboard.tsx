import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUIStore } from '../store/uiStore';
import { useAuthStore } from '../store/authStore';
import { useGroupStore } from '../store/groupStore';
import { useTheoryStore } from '../store/theoryStore';
import { useProjectStore } from '../store/projectStore';
import { useCoinStore } from '../store/coinStore';
import {
  Rocket,
  Brain,
  FlaskConical,
  ShieldCheck,
  Swords,
  Zap,
  Sparkles,
  Users,
  Target,
  Award,
  TrendingUp,
  CalendarDays,
  Clock,
  CheckCircle2,
  Lock,
  CircleDot,
  ArrowRight,
  Trophy,
  Crown,
  Star,
  Clock3,
  Coins,
  Plus,
  Eye,
  AlertTriangle,
  BookOpen,
  UserPlus,
  X,
} from 'lucide-react';
import CollapsibleSection from '@/components/ui/CollapsibleSection';
import { classesApi } from '@/lib/apiService';
import { cn } from '@/lib/utils';
import type { User } from '@/data/mockData';

function useCountUp(target: number, duration = 1800, start = 0) {
  const [value, setValue] = useState(start);
  useEffect(() => {
    let raf = 0;
    const startTime = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - startTime) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setValue(Math.round(start + (target - start) * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    const t = setTimeout(() => {
      raf = requestAnimationFrame(tick);
    }, 200);
    return () => {
      clearTimeout(t);
      cancelAnimationFrame(raf);
    };
  }, [target, duration, start]);
  return value;
}

function ProgressRing({ size = 70, stroke = 10, progress = 82, colorFrom = '#4F7CFF', colorTo = '#8B5CF6' }: {
  size?: number; stroke?: number; progress?: number; colorFrom?: string; colorTo?: string;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const off = c - (progress / 100) * c;
  return (
    <svg width={size} height={size} className="-rotate-90">
      <defs>
        <linearGradient id={`pr-${colorFrom}-${colorTo}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={colorFrom} />
          <stop offset="100%" stopColor={colorTo} />
        </linearGradient>
      </defs>
      <circle cx={size / 2} cy={size / 2} r={r} stroke="#E2E8F0" strokeWidth={stroke} fill="none" />
      <circle
        cx={size / 2} cy={size / 2} r={r}
        stroke={`url(#pr-${colorFrom}-${colorTo})`}
        strokeWidth={stroke} fill="none"
        strokeDasharray={c} strokeDashoffset={off}
        strokeLinecap="round"
        style={{ transition: 'stroke-dashoffset 1.5s ease-out' }}
      />
    </svg>
  );
}

interface TaskCardProps {
  icon: any;
  title: string;
  progress: number;
  reward: number;
  status: '进行中' | '已解锁' | '待认证' | '开放';
  tint: 'mission' | 'energy' | 'nova' | 'growth';
  onClick?: () => void;
}

const TINT_BG: Record<string, string> = {
  mission: 'from-mission-400/20 via-mission-500/15 to-nova-400/20 text-mission-600',
  energy: 'from-energy-400/20 via-alert-400/15 to-energy-500/20 text-energy-600',
  nova: 'from-nova-400/20 via-nova-500/15 to-nova-600/20 text-nova-600',
  growth: 'from-growth-400/20 via-growth-500/15 to-growth-600/20 text-growth-600',
};
const TINT_PROGRESS: Record<string, string> = {
  mission: 'from-mission-400 to-nova-500',
  energy: 'from-energy-400 to-alert-500',
  nova: 'from-nova-400 to-nova-600',
  growth: 'from-growth-400 to-growth-600',
};
const STATUS_CHIP: Record<string, string> = {
  '进行中': 'chip-mission',
  '已解锁': 'chip-growth',
  '待认证': 'chip-alert',
  '开放': 'chip-nova',
};

function TaskCard({ icon: Icon, title, progress, reward, status, tint, onClick }: TaskCardProps) {
  return (
    <button type="button" onClick={onClick} className={`glass-card glass-card-hover p-3.5 w-[152px] shrink-0 text-left !appearance-none border-0 outline-none focus:ring-2 focus:ring-mission-400/40 ${onClick ? 'cursor-pointer' : ''}`}>
      <div className={`w-11 h-11 rounded-2xl bg-gradient-to-br ${TINT_BG[tint]} flex items-center justify-center mb-3 shadow-sm`}>
        <Icon size={20} strokeWidth={2.3} />
      </div>
      <div className="text-[13px] font-bold text-ink-800 leading-tight mb-2">{title}</div>
      <div className="h-1.5 w-full rounded-full bg-ink-100 overflow-hidden mb-2">
        <div className={`h-full bg-gradient-to-r ${TINT_PROGRESS[tint]} rounded-full`} style={{ width: `${progress}%` }} />
      </div>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1 text-[11px] font-bold text-gradient-energy">
          <Zap size={11} />+{reward}
        </div>
        <span className={`${STATUS_CHIP[status]} !py-0.5 !px-1.5 !text-[10px]`}>{status}</span>
      </div>
    </button>
  );
}

const LEARNING_PATH_CONFIG = [
  { id: 'ai_learn', name: 'AI学习', badge: false },
  { id: 'knowledge_organize', name: '知识整理', badge: false },
  { id: 'ai_test', name: 'AI检测', badge: false },
  { id: 'intensive_training', name: '强化训练', badge: false },
  { id: 'pass_80', name: '80%通过', badge: true },
  { id: 'create_quiz', name: '创作题库', badge: false },
  { id: 'challenge_other', name: '挑战其他小组', badge: false },
  { id: 'earn_energy', name: '获得能量', badge: false },
  { id: 'project_dev', name: '项目研发', badge: false },
  { id: 'experiment', name: '实验', badge: false },
  { id: 'showcase', name: '成果展示', badge: false },
];

const LAB_NEWS = [
  { time: '09:25', group: '牛顿组', event: '完成磁悬浮实验', coin: 180, variant: 'growth' },
  { time: '09:40', group: '爱因斯坦组', event: '发布招募：电路专家', coin: 120, variant: 'mission' },
  { time: '10:10', group: '法拉第组', event: '挑战「电磁学」成功', coin: 60, variant: 'nova' },
  { time: '10:35', group: '特斯拉组', event: '提交安全认证', coin: 0, variant: 'alert' },
  { time: '11:02', group: '伽利略组', event: '项目文档上传', coin: 40, variant: 'growth' },
];

const PROJECTS = [
  {
    name: '磁悬浮实验', color: 'mission',
    colorHex: ['#4F7CFF', '#8FAEFF'],
    members: 5, progress: 72, owner: '牛顿组', daysLeft: 3, daysUsed: 7,
  },
  {
    name: '太阳能效率', color: 'growth',
    colorHex: ['#22C55E', '#6CE9A6'],
    members: 4, progress: 55, owner: '伽利略组', daysLeft: 5, daysUsed: 9,
  },
  {
    name: '云室观察径迹', color: 'energy',
    colorHex: ['#FF8A34', '#FFC695'],
    members: 6, progress: 38, owner: '薛定谔猫队', daysLeft: 8, daysUsed: 4,
  },
  {
    name: '霍尔效应测量', color: 'nova',
    colorHex: ['#8B5CF6', '#B692F6'],
    members: 4, progress: 88, owner: '麦克斯韦队', daysLeft: 2, daysUsed: 12,
  },
];

const RECRUITS = [
  { title: '数据分析专家', project: '霍尔效应测量', role: '算法建模', reward: 120, daysLeft: 2 },
  { title: '硬件搭建助手', project: '驻波共振演示', role: '仪器操作', reward: 90, daysLeft: 4 },
  { title: '3D建模设计师', project: '光纤通信模拟', role: 'CAD绘图', reward: 150, daysLeft: 1 },
];

const TEAMS = [
  { rank: 1, name: '爱因斯坦脑洞组', level: 'LV7', coins: 4820, projects: 8, avatarBg: 'from-gold-400 to-amber-500' },
  { rank: 2, name: '牛顿先锋队', level: 'LV6', coins: 4210, projects: 7, avatarBg: 'from-slate-300 to-slate-500' },
  { rank: 3, name: '特斯拉电流团', level: 'LV6', coins: 3980, projects: 6, avatarBg: 'from-orange-400 to-amber-600' },
  { rank: 4, name: '麦克斯韦闪电队', level: 'LV5', coins: 3420, projects: 5 },
  { rank: 5, name: '伽利略观测站', level: 'LV5', coins: 3180, projects: 5 },
  { rank: 6, name: '薛定谔猫队', level: 'LV4', coins: 2860, projects: 4 },
];

const ACHIEVEMENT_SEEDS = [101, 102, 103, 104, 105, 106];
const ACHIEVEMENT_TITLES = [
  '自制电动机成品',
  '弹簧振子实验台',
  '云室粒子径迹',
  '太阳能测试阵列',
  '驻波共振装置',
  '霍尔效应电路板',
];

const CLASS_STATS = [
  { label: '总人数', value: 30, suffix: '人', tint: 'mission' },
  { label: '总小组', value: 6, suffix: '组', tint: 'nova' },
  { label: '完成项目', value: 8, suffix: '个', tint: 'growth' },
  { label: '进行中', value: 4, suffix: '个', tint: 'mission' },
  { label: '失败项目', value: 1, suffix: '个', tint: 'danger' },
  { label: 'AI学习完成率', value: 87, suffix: '%', tint: 'energy' },
  { label: '安全通过率', value: 90, suffix: '%', tint: 'growth' },
  { label: '能量流通', value: 22400, suffix: '⚡', tint: 'alert' },
];

export default function Dashboard() {
  const navigate = useNavigate();
  const pushToast = useUIStore((s) => s.pushToast);
  const { userId, role, groupId, classId } = useAuthStore();
  const setGroupId = useAuthStore((s) => s.setGroupId);
  const getUserById = useGroupStore((s) => s.getUserById);
  const groups = useGroupStore((s) => s.groups);
  const joinGroup = useGroupStore((s) => s.joinGroup);

  // 同班同学弹窗
  const [showClassmates, setShowClassmates] = useState(false);
  const [classmates, setClassmates] = useState<User[]>([]);
  const [loadingClassmates, setLoadingClassmates] = useState(false);

  const openClassmates = async () => {
    if (!classId) return;
    setShowClassmates(true);
    setLoadingClassmates(true);
    try {
      const list = await classesApi.listStudents(classId);
      setClassmates(list);
    } catch {
      pushToast('加载同学名单失败', 'error');
    } finally {
      setLoadingClassmates(false);
    }
  };

  // 学生只能看到并加入本班的小组（无 classId 的旧数据回退为全部可见）
  const joinableGroups = useMemo(
    () => (classId ? groups.filter((g) => g.classId === classId) : groups),
    [groups, classId]
  );
  const { quizSessions, challenges } = useTheoryStore();
  const { projects, showcaseItems } = useProjectStore();
  const { coinTxs } = useCoinStore();

  // 学生自助加入小组的本地状态
  const [pendingGroupId, setPendingGroupId] = useState('');
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState('');

  const needsGroup = role === 'student' && !groupId;

  const handleJoinGroup = async () => {
    if (!userId || !pendingGroupId) {
      setJoinError('请选择要加入的小组');
      return;
    }
    setJoining(true);
    setJoinError('');
    try {
      await joinGroup(userId, pendingGroupId);
      setGroupId(pendingGroupId);
      const g = groups.find((x) => x.id === pendingGroupId);
      pushToast(`🚀 已加入小组「${g?.name || ''}」，开始你的研究之旅！`, 'success');
    } catch (err: any) {
      setJoinError(err?.message || '加入失败，请稍后重试或联系老师');
    } finally {
      setJoining(false);
    }
  };

  const currentUser = useMemo(() => {
    if (!userId) return null;
    if (role === 'teacher') return { name: '杨静老师' };
    return getUserById(userId);
  }, [userId, role, getUserById]);

  // 当前学生所属项目组（用于欢迎语展示）
  const getGroupById = useGroupStore((s) => s.getGroupById);
  const myGroup = useMemo(() => {
    if (!groupId) return null;
    return getGroupById(groupId) || null;
  }, [groupId, getGroupById]);

  const learningPathProgress = useMemo(() => {
    const hasQuizSession = quizSessions.length > 0;
    const hasPassedQuiz = quizSessions.some((s) => s.passed);
    const hasBlindPoints = quizSessions.some((s) => s.blindPoints.length > 0);
    const hasCreatedChallenge = challenges.length > 0;
    const hasSubmittedChallenge = challenges.some((c) => c.submissions.length > 0);
    const hasCoinTransaction = coinTxs.length > 0;
    const hasProject = projects.length > 0;
    const hasProjectInProgress = projects.some((p) => p.progress > 50);
    const hasShowcase = showcaseItems.length > 0;

    const progressMap: Record<string, { done: boolean; active: boolean }> = {
      ai_learn: { done: hasQuizSession, active: !hasQuizSession && false },
      knowledge_organize: { done: hasQuizSession, active: false },
      ai_test: { done: hasQuizSession, active: false },
      intensive_training: { done: hasBlindPoints, active: hasQuizSession && !hasBlindPoints },
      pass_80: { done: hasPassedQuiz, active: hasQuizSession && !hasPassedQuiz },
      create_quiz: { done: hasCreatedChallenge, active: hasPassedQuiz && !hasCreatedChallenge },
      challenge_other: { done: hasSubmittedChallenge, active: hasCreatedChallenge && !hasSubmittedChallenge },
      earn_energy: { done: hasCoinTransaction, active: hasSubmittedChallenge && !hasCoinTransaction },
      project_dev: { done: hasProject, active: hasCoinTransaction && !hasProject },
      experiment: { done: hasProjectInProgress, active: hasProject && !hasProjectInProgress },
      showcase: { done: hasShowcase, active: hasProjectInProgress && !hasShowcase },
    };

    let firstIncompleteIndex = -1;
    LEARNING_PATH_CONFIG.forEach((step, index) => {
      if (!progressMap[step.id].done && firstIncompleteIndex === -1) {
        firstIncompleteIndex = index;
      }
    });

    if (firstIncompleteIndex > 0) {
      progressMap[LEARNING_PATH_CONFIG[firstIncompleteIndex].id].active = true;
    }

    return progressMap;
  }, [quizSessions, challenges, coinTxs, projects, showcaseItems]);

  const completedSteps = useMemo(() => {
    return LEARNING_PATH_CONFIG.filter((step) => learningPathProgress[step.id]?.done).length;
  }, [learningPathProgress]);

  const coinTotal = useCountUp(3650, 1800);
  const coinToday = useCountUp(248, 1600);
  const coinWeek = useCountUp(1260, 2000);
  const upgradeNeed = useCountUp(1280, 1800);
  const newsCoin1 = useCountUp(180);
  const newsCoin2 = useCountUp(120);
  const newsCoin3 = useCountUp(60);
  const newsCoin5 = useCountUp(40);

  const maxTeamCoin = useMemo(() => Math.max(...TEAMS.slice(3).map((t) => t.coins)), []);
  const recruit0 = useCountUp(RECRUITS[0].reward);
  const recruit1 = useCountUp(RECRUITS[1].reward);
  const recruit2 = useCountUp(RECRUITS[2].reward);
  const teamCoin0 = useCountUp(TEAMS[0].coins);
  const teamCoin1 = useCountUp(TEAMS[1].coins);
  const teamCoin2 = useCountUp(TEAMS[2].coins);
  const teamCoin3 = useCountUp(TEAMS[3].coins);
  const teamCoin4 = useCountUp(TEAMS[4].coins);
  const teamCoin5 = useCountUp(TEAMS[5].coins);
  const statValues = CLASS_STATS.map((s) => useCountUp(s.value, 1400 + CLASS_STATS.indexOf(s) * 120));

  return (
    <div className="w-full space-y-6">
      {/* ============ 待分配小组提示（仅未分组学生可见） ============ */}
      {needsGroup && (
        <section className="rounded-[28px] p-6 relative overflow-hidden bg-gradient-to-br from-alert-50/90 via-white/95 to-energy-50/70 border-2 border-alert-200/70">
          <div className="absolute -right-16 -top-16 w-72 h-72 rounded-full bg-gradient-to-br from-alert-400/15 via-energy-400/10 to-transparent blur-3xl pointer-events-none" />
          <div className="relative flex flex-col lg:flex-row lg:items-center gap-5">
            <div className="flex items-start gap-4 flex-1 min-w-0">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-alert-400 to-energy-500 flex items-center justify-center text-white shadow-lg shrink-0">
                <UserPlus size={26} strokeWidth={2.2} />
              </div>
              <div className="min-w-0">
                <span className="mission-label">Pending Assignment · 待分配</span>
                <h2 className="mt-2 text-[22px] md:text-[24px] font-extrabold text-ink-900 leading-tight">
                  你还没有加入任何小组
                </h2>
                <p className="mt-1.5 text-[13.5px] text-ink-500 font-medium leading-relaxed">
                  选择一个小组自助加入即可开始，也可以等待老师为你分配。加入后即可参与挑战、项目与能量币结算。
                </p>
                {joinError && (
                  <p className="mt-2 text-[12.5px] font-semibold text-danger-600 flex items-center gap-1">
                    <AlertTriangle size={13} />{joinError}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2.5 shrink-0">
              {joinableGroups.length === 0 ? (
                <span className="text-[13px] text-ink-500 font-medium bg-white/70 border border-ink-100 rounded-xl px-4 py-2.5">
                  本班暂无可加入的小组，请等待老师创建
                </span>
              ) : (
                <>
                  <select
                    value={pendingGroupId}
                    onChange={(e) => { setPendingGroupId(e.target.value); setJoinError(''); }}
                    className="bg-white border border-ink-200 focus:border-mission-400 rounded-xl px-4 py-2.5 text-[14px] font-semibold text-ink-800 focus:outline-none focus:ring-2 focus:ring-mission-400/30 cursor-pointer min-w-[180px]"
                  >
                    <option value="">选择小组…</option>
                    {joinableGroups.map((g) => (
                      <option key={g.id} value={g.id}>{g.name}</option>
                    ))}
                  </select>
                  <button
                    onClick={handleJoinGroup}
                    disabled={joining || !pendingGroupId}
                    className="btn-energy inline-flex items-center gap-2 !py-2.5 disabled:opacity-60"
                  >
                    <Rocket size={16} />
                    {joining ? '加入中…' : '加入小组'}
                  </button>
                </>
              )}
            </div>
          </div>
        </section>
      )}

      {/* ============ ROW 1: HERO ============ */}
      <section className="grid grid-cols-12 gap-5" style={{ minHeight: 240 }}>
        {/* Welcome Hero - 左8列 */}
        <div className="col-span-12 lg:col-span-8 rounded-[28px] p-6 relative overflow-hidden bg-gradient-to-br from-mission-50/80 via-white/90 to-nova-50/60 border border-mission-100/50">
          <div className="absolute -right-20 -top-20 w-80 h-80 rounded-full bg-gradient-to-br from-mission-400/15 via-nova-400/10 to-transparent blur-3xl pointer-events-none" />
          <div className="absolute left-1/3 -bottom-16 w-64 h-64 rounded-full bg-gradient-to-tr from-energy-400/10 via-alert-400/10 to-transparent blur-3xl pointer-events-none" />

          <div className="relative flex items-start justify-between mb-4">
            <div>
              <span className="mission-label">Welcome Back, Researcher</span>
              <h1 className="mt-4 text-[40px] leading-[1.15] font-extrabold tracking-tight text-ink-900">
                {currentUser?.name || '研究员'}，欢迎回到
                <span className="text-gradient-mission"> 物理实验室指挥中心</span>
                {role === 'student' && myGroup && (
                  <>
                    <span className="block mt-1 text-[22px] md:text-[24px] font-bold text-ink-600">
                      所属项目组 · <span className="text-gradient-energy">{myGroup.name}</span>
                    </span>
                  </>
                )}
              </h1>
              <p className="mt-3 text-[15px] text-ink-500 font-medium">
                今日任务进度 <span className="text-mission-600 font-bold">82%</span>，
                距离晋升 <span className="chip-nova !py-0.5 !px-2 mx-0.5">LV9</span> 还需
                <span className="text-gradient-energy font-bold ml-1"> {upgradeNeed}⚡</span>
              </p>
            </div>
          </div>

          <div className="relative flex gap-4 mt-6 overflow-x-auto scroll-thin pb-1">
            <div className="rounded-[20px] bg-gradient-to-br from-mission-50/80 via-white/95 to-nova-50/50 border border-mission-100/60 p-4">
              <TaskCard onClick={() => { navigate('/theory/topics'); pushToast('进入 AI 自学中心 · 今天也加油 🚀', 'info'); }} icon={Brain} title="AI理论学习" progress={68} reward={80} status="进行中" tint="mission" />
            </div>
            <div className="rounded-[20px] bg-gradient-to-br from-energy-50/80 via-white/95 to-alert-50/50 border border-energy-100/60 p-4">
              <TaskCard onClick={() => { navigate('/projects'); pushToast('进入项目管理中心 · 任务已就绪', 'info'); }} icon={FlaskConical} title="项目研发" progress={72} reward={200} status="进行中" tint="energy" />
            </div>
            <div className="rounded-[20px] bg-gradient-to-br from-growth-50/80 via-white/95 to-emerald-50/50 border border-growth-100/60 p-4">
              <TaskCard onClick={() => { navigate('/safety-lab'); pushToast('进入安全实验中心 · 请完成待认证项目', 'info'); }} icon={ShieldCheck} title="安全认证" progress={100} reward={50} status="待认证" tint="growth" />
            </div>
            <div className="rounded-[20px] bg-gradient-to-br from-nova-50/80 via-white/95 to-mission-50/50 border border-nova-100/60 p-4">
              <TaskCard onClick={() => { navigate('/theory/challenge'); pushToast('进入挑战大厅 · 准备好迎接知识挑战了吗？', 'info'); }} icon={Swords} title="挑战大厅" progress={0} reward={120} status="开放" tint="nova" />
            </div>
          </div>
        </div>

        {/* Today Mission Progress - 右4列 */}
        <div className="col-span-12 lg:col-span-4 rounded-[28px] p-6 bg-gradient-to-br from-energy-50/80 via-white/90 to-alert-50/60 border border-energy-100/50">
          <div className="flex items-center justify-between mb-1">
            <span className="chip-ink !px-2.5 !py-1">Current Rank</span>
            <span className="chip-nova !py-1 !px-2.5">LV8</span>
          </div>
          <h3 className="mt-2 text-[18px] font-extrabold text-ink-800">今日任务进度</h3>

          <div className="flex items-center justify-center my-5">
            <div className="relative">
              <ProgressRing size={160} stroke={10} progress={82} />
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <div className="text-[44px] font-black text-gradient-mission leading-none tabular-nums">82%</div>
                <div className="text-[11px] text-ink-500 font-semibold mt-1.5 tracking-wide">TODAY PROGRESS</div>
              </div>
            </div>
          </div>

          <div className="space-y-2.5">
            {[
              { label: 'AI学习：电磁学·第3章', done: true },
              { label: '检测：15题 正确率 93%', done: true },
              { label: '项目：磁悬浮 搭建进度', done: true, active: true },
              { label: '挑战：回复2组邀请', done: false },
            ].map((step, i) => (
              <div key={i} className="flex items-center gap-3 group">
                <div className={`w-5 h-5 rounded-lg flex items-center justify-center shrink-0 transition-all ${
                  step.done
                    ? 'bg-gradient-to-br from-growth-400 to-growth-600 text-white shadow-sm'
                    : step.active
                      ? 'bg-gradient-to-br from-mission-400 to-nova-500 text-white ring-2 ring-mission-200/50 animate-pulse'
                      : 'bg-ink-100 text-ink-400'
                }`}>
                  {step.done ? <CheckCircle2 size={13} strokeWidth={3} /> : step.active ? <CircleDot size={12} /> : <Lock size={11} />}
                </div>
                <div className={`text-[12.5px] font-medium leading-tight ${step.done ? 'text-ink-600 line-through decoration-ink-200' : step.active ? 'text-ink-900 font-semibold' : 'text-ink-400'}`}>
                  {step.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============ ROW 2: LEARNING PATH ============ */}
      <section className="rounded-[28px] p-6 bg-gradient-to-br from-growth-50/80 via-white/90 to-mission-50/60 border border-growth-100/50">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <span className="mission-label">Physics Learning Path</span>
            <h2 className="text-[20px] font-extrabold text-ink-800">全周期学习路径 · 实时追踪</h2>
          </div>
          <div className="flex items-center gap-2 text-[12px] text-ink-500 font-medium">
            <span className="w-2 h-2 rounded-full bg-growth-500" />已完成 {completedSteps}/{LEARNING_PATH_CONFIG.length}
            <span className="w-px h-3 bg-ink-200 mx-1" />
            <span className="w-2 h-2 rounded-full bg-mission-500 animate-pulse" />进行中
          </div>
        </div>

        <div className="relative flex items-center justify-between gap-1 px-2 py-2 overflow-x-auto scroll-thin">
          <svg className="absolute inset-0 w-full h-full pointer-events-none" preserveAspectRatio="none">
            <defs>
              <linearGradient id="flowGrad" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#22C55E" />
                <stop offset="45%" stopColor="#4F7CFF" />
                <stop offset="55%" stopColor="#94A3B8" stopOpacity="0.5" />
                <stop offset="100%" stopColor="#CBD5E1" stopOpacity="0.4" />
              </linearGradient>
            </defs>
            <line x1="4%" y1="50%" x2="96%" y2="50%" stroke="url(#flowGrad)" strokeWidth="2" strokeDasharray="8 8" className="animate-flowDash" />
          </svg>

          {LEARNING_PATH_CONFIG.map((node, i) => {
            const progress = learningPathProgress[node.id];
            const isDone = progress?.done || false;
            const isActive = progress?.active || false;
            return (
              <div key={node.id} className="flex flex-col items-center gap-2 shrink-0 relative z-10" style={{ minWidth: 88 }}>
                <div className={`node-badge ${isDone ? 'done' : isActive ? 'active' : 'pending'} ${node.badge ? 'ring-4 ring-growth-200/60' : ''}`}>
                  {isDone ? <CheckCircle2 size={20} strokeWidth={2.6} /> : isActive ? <Sparkles size={18} /> : <span className="text-[14px] font-black opacity-60">{i + 1}</span>}
                </div>
                <div className={`text-[11.5px] font-bold leading-tight text-center ${isDone ? 'text-growth-700' : isActive ? 'text-mission-700' : 'text-ink-400'}`}>
                  <div className="font-mono text-[9px] opacity-70 mb-0.5">STEP {String(i + 1).padStart(2, '0')}</div>
                  {node.name}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ============ ROW 3: Energy + Galaxy + News - Collapsible ============ */}
      <CollapsibleSection
        title="能量与项目概览"
        subtitle="Energy Center & Project Galaxy"
        icon={
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-energy-400/20 to-alert-400/20 flex items-center justify-center">
            <Zap size={18} className="text-energy-600" />
          </div>
        }
        defaultOpen={true}
      >
        <div className="grid grid-cols-12 gap-5">
          {/* 左 3 Energy Center */}
          <div className="col-span-12 lg:col-span-3 rounded-[24px] bg-gradient-to-br from-energy-50/70 via-white/85 to-alert-50/50 border border-energy-100/50 p-5">
            <div className="relative flex items-center justify-center mb-4" style={{ height: 140 }}>
              <div className="absolute w-40 h-40 rounded-full bg-gradient-to-br from-energy-300/25 via-alert-300/20 to-transparent blur-2xl animate-floatSlow" />
              <div className="orbit-ring w-[150px] h-[150px] animate-spin" style={{ animationDuration: '18s', borderStyle: 'dashed', borderColor: 'rgba(255,138,52,0.4)' }} />
              <div className="orbit-ring w-[110px] h-[110px] animate-spin" style={{ animationDuration: '12s', animationDirection: 'reverse', borderColor: 'rgba(245,158,11,0.5)' }} />
              <div className="relative w-20 h-20 rounded-full bg-gradient-to-br from-energy-300 via-energy-500 to-alert-500 shadow-glowEnergy flex items-center justify-center animate-pulseRing">
                <div className="w-11 h-11 rounded-full bg-gradient-to-br from-white/70 via-energy-100/50 to-transparent" />
                <Zap size={28} className="absolute text-white fill-white/40" strokeWidth={2.5} />
              </div>
            </div>

            <div className="space-y-3">
              <div className="rounded-xl bg-gradient-to-br from-energy-50/70 to-alert-50/50 border border-energy-100/60 p-3.5">
                <div className="text-[11px] font-bold text-ink-500 tracking-wider uppercase">Current Energy</div>
                <div className="flex items-end justify-between mt-1">
                  <div className="text-[32px] font-black text-gradient-energy tabular-nums leading-none">{coinTotal}</div>
                  <Zap size={18} className="text-energy-500 mb-1" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                <div className="p-3 rounded-xl bg-growth-50/60 border border-growth-100/60">
                  <div className="text-[10px] font-bold text-ink-500 uppercase">今日</div>
                  <div className="text-[18px] font-black text-growth-600 tabular-nums mt-0.5">+{coinToday}</div>
                </div>
                <div className="p-3 rounded-xl bg-nova-50/60 border border-nova-100/60">
                  <div className="text-[10px] font-bold text-ink-500 uppercase">本周</div>
                  <div className="text-[18px] font-black text-nova-600 tabular-nums mt-0.5">+{coinWeek}</div>
                </div>
              </div>
              <div className="p-3.5 rounded-xl bg-gradient-to-br from-mission-50/70 to-nova-50/60 border border-mission-100/60">
                <div className="flex items-center justify-between mb-2">
                  <span className="chip-mission !py-0.5 !px-2 !text-[10px]">LV8 Researcher</span>
                  <span className="text-[11px] font-bold text-ink-500">距升级 {upgradeNeed}⚡</span>
                </div>
                <div className="h-2.5 w-full rounded-full bg-ink-100 overflow-hidden">
                  <div className="h-full rounded-full bg-gradient-to-r from-mission-400 via-mission-500 to-nova-500" style={{ width: '62%' }} />
                </div>
                <div className="flex justify-between mt-1 text-[10px] font-mono text-ink-400">
                  <span>0</span><span className="font-bold text-mission-600">62%</span><span>100</span>
                </div>
              </div>
            </div>
          </div>

          {/* 中 5 Project Galaxy */}
          <div className="col-span-12 lg:col-span-5 rounded-[24px] bg-gradient-to-br from-mission-50/70 via-white/85 to-nova-50/50 border border-mission-100/50 p-5">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <span className="mission-label">Project Galaxy</span>
                <h3 className="text-[18px] font-extrabold text-ink-800">进行中任务 · 4 颗星球</h3>
              </div>
              <button className="btn-ghost !py-1.5 !px-3 text-[12px]" onClick={() => { navigate('/projects'); pushToast('进入项目中心 · 已自动创建新项目草稿 ✏️', 'success'); }}>
                <Plus size={14} />创建项目
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {PROJECTS.map((p, idx) => (
                <div key={p.name} onClick={() => { navigate('/projects'); pushToast(`进入《${p.name}》指挥中心 · ${p.owner}`, 'info'); }} role="button" tabIndex={0} className="planet-card group relative rounded-2xl overflow-hidden cursor-pointer outline-none focus:ring-2 focus:ring-mission-400/50" style={{ minHeight: 200 }}>
                  <div className="absolute inset-0 bg-gradient-to-br p-[1px] rounded-2xl" style={{ background: `linear-gradient(135deg, ${p.colorHex[0]}40, ${p.colorHex[1]}20 60%, transparent)` }}>
                    <div className="w-full h-full rounded-2xl bg-gradient-to-br from-white/90 via-white/75 to-ink-50/70 backdrop-blur-xl p-4 flex flex-col">
                      <div className="flex items-center justify-between">
                        <span className={`chip-${p.color} !py-0.5 !px-2 !text-[10px]`}>
                          <Target size={10} className="mr-0.5" />PROJ-{String(idx + 1).padStart(2, '0')}
                        </span>
                        <div className="flex -space-x-1.5">
                          {Array.from({ length: Math.min(3, p.members) }).map((_, j) => (
                            <div key={j} className="w-5 h-5 rounded-full ring-2 ring-white shadow-sm" style={{ background: `linear-gradient(135deg, ${p.colorHex[0]}, ${p.colorHex[1]})` }} />
                          ))}
                          {p.members > 3 && (
                            <div className="w-5 h-5 rounded-full ring-2 ring-white bg-ink-100 text-[9px] font-bold text-ink-600 flex items-center justify-center">+{p.members - 3}</div>
                          )}
                        </div>
                      </div>

                      <div className="relative flex-1 flex items-center justify-center my-2">
                        <div className="planet-halo rounded-full" style={{ background: `radial-gradient(circle, ${p.colorHex[0]}50, transparent 70%)` }} />
                        <div className="relative">
                          <div className="planet-ring" />
                          <div className="w-16 h-16 rounded-full shadow-lg flex items-center justify-center relative" style={{ background: `radial-gradient(circle at 30% 30%, ${p.colorHex[1]}, ${p.colorHex[0]})` }}>
                            <span className="text-[11px] font-black text-white drop-shadow text-center leading-tight px-1">{p.name}</span>
                          </div>
                        </div>
                      </div>

                      <div className="mt-auto">
                        <div className="flex items-end justify-between mb-1.5">
                          <div>
                            <div className="text-[13px] font-extrabold text-ink-800">{p.owner}</div>
                            <div className="text-[10px] text-ink-500 font-mono flex items-center gap-1 mt-0.5">
                              <Clock3 size={9} />剩 {p.daysLeft} 天 · 已用 {p.daysUsed} 天
                            </div>
                          </div>
                          <div className="relative">
                            <ProgressRing size={48} stroke={6} progress={p.progress} colorFrom={p.colorHex[0]} colorTo={p.colorHex[1]} />
                            <div className="absolute inset-0 flex items-center justify-center text-[11px] font-black tabular-nums text-ink-800">{p.progress}%</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 右 4 Stack: Lab News + Safety */}
          <div className="col-span-12 lg:col-span-4 flex flex-col gap-4">
            {/* Lab News Timeline */}
            <div className="rounded-[24px] bg-gradient-to-br from-teal-50/70 via-white/85 to-cyan-50/50 border border-teal-100/50 p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-mission-400/20 to-nova-400/20 flex items-center justify-center">
                    <CalendarDays size={18} className="text-mission-600" />
                  </div>
                  <h3 className="text-[16px] font-extrabold text-ink-800">Lab News · 时间轴</h3>
                </div>
                <span className="chip-ink !py-0.5 !px-2 !text-[10px]">实时</span>
              </div>

              <div className="space-y-3 pr-1">
                {LAB_NEWS.map((n, i) => (
                  <div key={i} className="flex items-start gap-3 group">
                    <div className="flex flex-col items-center shrink-0 pt-1">
                      <div className="text-[10px] font-mono font-black text-ink-500 bg-ink-100 rounded-md px-1.5 py-0.5">{n.time}</div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className={`chip-${n.variant} !py-0.5 !px-1.5 !text-[10px]`}>{n.group}</span>
                        {i === 0 && <span className="chip-growth !py-0.5 !px-1.5 !text-[9px]"><TrendingUp size={8} className="mr-0.5" />HOT</span>}
                      </div>
                      <div className="text-[12.5px] text-ink-700 font-medium leading-snug">{n.event}</div>
                    </div>
                    {n.coin > 0 && (
                      <div className="shrink-0 flex items-center gap-0.5 text-gradient-energy font-black tabular-nums text-[13px]">
                        <Zap size={12} />
                        +{[newsCoin1, newsCoin2, newsCoin3, 0, newsCoin5][i]}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Safety Center */}
            <div className="rounded-[24px] bg-gradient-to-br from-growth-50/70 via-white/85 to-teal-50/50 border border-growth-100/50 p-5 relative overflow-hidden">
              <div className="absolute right-[-60px] top-[-60px] w-44 h-44 rounded-full bg-gradient-to-br from-growth-400/20 via-mission-400/15 to-transparent blur-3xl pointer-events-none" />
              <div className="relative flex items-start gap-4">
                <div className="shrink-0 relative">
                  <svg width="72" height="80" viewBox="0 0 72 80">
                    <defs>
                      <linearGradient id="shieldGrad" x1="0" y1="0" x2="1" y2="1">
                        <stop offset="0%" stopColor="#22C55E" />
                        <stop offset="60%" stopColor="#4F7CFF" />
                        <stop offset="100%" stopColor="#8B5CF6" />
                      </linearGradient>
                    </defs>
                    <path d="M36 2 L68 18 L68 50 Q68 70 36 78 Q4 70 4 50 L4 18 Z"
                      fill="url(#shieldGrad)" opacity="0.15" />
                    <path d="M36 2 L68 18 L68 50 Q68 70 36 78 Q4 70 4 50 L4 18 Z"
                      fill="none" stroke="url(#shieldGrad)" strokeWidth="2.5" strokeLinejoin="round" />
                    <text x="36" y="48" textAnchor="middle" fontSize="24" fontWeight="900" fill="url(#shieldGrad)">
                      <ShieldCheck size={26} x={23} y={27} />
                    </text>
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <span className="mission-label">Safety Center</span>
                  <h3 className="mt-2 text-[17px] font-extrabold text-ink-800 leading-tight">安全认证仪表盘</h3>

                  <div className="grid grid-cols-3 gap-2 mt-4">
                    <div className="text-center p-2 rounded-xl bg-alert-50/70 border border-alert-100/60">
                      <div className="text-[20px] font-black text-alert-600 tabular-nums leading-none">2</div>
                      <div className="text-[9.5px] font-bold text-ink-500 uppercase mt-1">待认证</div>
                    </div>
                    <div className="text-center p-2 rounded-xl bg-growth-50/70 border border-growth-100/60">
                      <div className="text-[20px] font-black text-growth-600 tabular-nums leading-none">18</div>
                      <div className="text-[9.5px] font-bold text-ink-500 uppercase mt-1">已完成</div>
                    </div>
                    <div className="text-center p-2 rounded-xl bg-danger-50/70 border border-danger-100/60">
                      <div className="text-[20px] font-black text-danger-600 tabular-nums leading-none">1</div>
                      <div className="text-[9.5px] font-bold text-ink-500 uppercase mt-1">冻结</div>
                    </div>
                  </div>

                  <button className="btn-mission w-full mt-4 !py-2.5 !text-[13px]" onClick={() => { navigate('/safety-lab'); pushToast('进入安全实验室 · 请通过认证后继续 🛡️', 'info'); }}>
                    <ShieldCheck size={15} />进入安全考核
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </CollapsibleSection>

      {/* ============ ROW 4: Marketplace + Top Teams - Collapsible ============ */}
      <CollapsibleSection
        title="招募与排行"
        subtitle="Recruitment & Leaderboard"
        icon={
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-mission-400/20 to-nova-400/20 flex items-center justify-center">
            <Trophy size={18} className="text-mission-600" />
          </div>
        }
        defaultOpen={false}
      >
        <div className="grid grid-cols-12 gap-5">
          {/* 左7 Research Marketplace */}
          <div className="col-span-12 lg:col-span-7 rounded-[24px] bg-gradient-to-br from-cyan-50/70 via-white/85 to-blue-50/50 border border-cyan-100/50 p-5">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <span className="mission-label">RECRUITMENT DESK</span>
                <h3 className="text-[20px] font-extrabold text-ink-800">招募大厅 · 专家悬赏</h3>
              </div>
              <button className="btn-ghost text-[12px] !py-1.5 !px-3" onClick={() => { navigate('/recruit/market'); pushToast('招募市场已展开 · 共 6 条新任务待接取 🧑‍🚀', 'info'); }}>
                查看全部<ArrowRight size={13} />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-4">
              {RECRUITS.map((r, i) => (
                <div key={r.title} className="rounded-2xl bg-gradient-to-br from-white/95 to-ink-50/80 p-4 border border-ink-100/50 relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-24 h-24 rounded-full opacity-30 blur-2xl pointer-events-none"
                    style={{ background: i === 0 ? '#4F7CFF' : i === 1 ? '#22C55E' : '#FF8A34' }} />
                  <div className="relative">
                    <div className="flex items-center justify-between">
                      <span className={`${i === 0 ? 'chip-mission' : i === 1 ? 'chip-growth' : 'chip-energy'} !py-0.5 !px-2 !text-[10px]`}>
                        {r.role}
                      </span>
                      <span className="chip-alert !py-0.5 !px-2 !text-[10px] flex items-center gap-1">
                        <Clock size={10} />{r.daysLeft}天
                      </span>
                    </div>
                    <h4 className="mt-3 text-[15px] font-extrabold text-ink-800 leading-tight">{r.title}</h4>
                    <p className="text-[11.5px] text-ink-500 mt-1 font-medium">项目：<span className="text-ink-700">{r.project}</span></p>

                    <div className="mt-4 pt-3 border-t border-ink-100/80">
                      <div className="flex items-end justify-between">
                        <div>
                          <div className="text-[9.5px] font-bold text-ink-400 uppercase tracking-wider">Reward</div>
                          <div className="flex items-center gap-1 text-gradient-energy font-black text-[22px] tabular-nums leading-none mt-0.5">
                            <Zap size={16} />
                            {[recruit0, recruit1, recruit2][i]}
                          </div>
                        </div>
                        <button className={`${i === 0 ? 'btn-mission' : i === 1 ? 'bg-gradient-to-br from-growth-400 to-growth-600 text-white rounded-xl px-3 py-2 text-[11.5px] font-bold shadow-lg shadow-growth-500/20 hover:brightness-110 transition' : 'btn-energy'} !py-2 !px-3 !text-[11.5px]`}
                          onClick={() => pushToast(`已申请《${r.title}》· 等待 ${r.project} 项目组确认 · 24h 内通知 ✉️`, 'success')}
                        >
                          立即加入
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 右5 Top Research Teams */}
          <div className="col-span-12 lg:col-span-5 rounded-[24px] bg-gradient-to-br from-amber-50/70 via-white/85 to-yellow-50/50 border border-amber-100/50 p-5">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <span className="mission-label">Top Research Teams</span>
                <h3 className="text-[18px] font-extrabold text-ink-800">TOP 3 战队排行榜</h3>
              </div>
              <Trophy size={20} className="text-alert-500" />
            </div>

            {/* Podium */}
            <div className="flex items-end justify-center gap-3 mb-6 px-2">
              {/* 2nd - Silver */}
              <div className="flex flex-col items-center flex-1">
                <div className="w-12 h-12 rounded-2xl podium-silver flex items-center justify-center mb-2 relative">
                  <Crown size={18} className="text-slate-600" />
                  <Star size={8} className="absolute -top-1.5 -right-1 text-slate-500 fill-slate-400" />
                </div>
                <div className="text-[12px] font-bold text-ink-800 text-center leading-tight truncate w-full px-1">{TEAMS[1].name}</div>
                <div className="text-[10px] text-ink-500 mt-0.5 font-mono">{TEAMS[1].level} · {TEAMS[1].projects}项目</div>
                <div className="mt-2 flex items-center gap-0.5 text-gradient-energy font-black text-[16px] tabular-nums">
                  <Zap size={12} />{teamCoin1}
                </div>
                <div className="podium-silver w-full mt-2 rounded-t-xl flex items-end justify-center" style={{ height: 80 }}>
                  <div className="text-[20px] font-black text-slate-700 pb-2">2</div>
                </div>
              </div>

              {/* 1st - Gold */}
              <div className="flex flex-col items-center flex-1 -mt-6">
                <div className="w-14 h-14 rounded-2xl podium-gold flex items-center justify-center mb-2 relative shadow-xl">
                  <Crown size={22} className="text-amber-700" />
                  <Star size={10} className="absolute -top-2 -right-2 text-alert-500 fill-alert-400 animate-pulse" />
                  <Star size={7} className="absolute -top-1 -left-2 text-alert-400 fill-alert-300" />
                </div>
                <div className="text-[13px] font-black text-ink-900 text-center leading-tight truncate w-full px-1">{TEAMS[0].name}</div>
                <div className="text-[10.5px] text-ink-500 mt-0.5 font-mono font-bold">{TEAMS[0].level} · {TEAMS[0].projects}项目</div>
                <div className="mt-2 flex items-center gap-0.5 text-gradient-energy font-black text-[20px] tabular-nums">
                  <Zap size={15} />{teamCoin0}
                </div>
                <div className="podium-gold w-full mt-2 rounded-t-xl flex items-end justify-center" style={{ height: 112 }}>
                  <div className="text-[28px] font-black text-amber-800 pb-2">1</div>
                </div>
              </div>

              {/* 3rd - Bronze */}
              <div className="flex flex-col items-center flex-1">
                <div className="w-12 h-12 rounded-2xl podium-bronze flex items-center justify-center mb-2 relative">
                  <Crown size={18} className="text-orange-700" />
                </div>
                <div className="text-[12px] font-bold text-ink-800 text-center leading-tight truncate w-full px-1">{TEAMS[2].name}</div>
                <div className="text-[10px] text-ink-500 mt-0.5 font-mono">{TEAMS[2].level} · {TEAMS[2].projects}项目</div>
                <div className="mt-2 flex items-center gap-0.5 text-gradient-energy font-black text-[16px] tabular-nums">
                  <Zap size={12} />{teamCoin2}
                </div>
                <div className="podium-bronze w-full mt-2 rounded-t-xl flex items-end justify-center" style={{ height: 64 }}>
                  <div className="text-[20px] font-black text-orange-800 pb-2">3</div>
                </div>
              </div>
            </div>

            {/* 4-6 list */}
            <div className="space-y-2.5">
              {TEAMS.slice(3).map((t, i) => {
                const coins = [teamCoin3, teamCoin4, teamCoin5][i];
                return (
                  <div key={t.rank} className="flex items-center gap-3 p-2.5 rounded-2xl hover:bg-mission-50/40 transition-colors">
                    <div className="w-8 h-8 rounded-xl bg-ink-100 flex items-center justify-center text-[12px] font-black text-ink-600 shrink-0">
                      #{t.rank}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[13px] font-bold text-ink-800 truncate">{t.name}</span>
                        <span className="chip-ink !py-0 !px-1.5 !text-[9.5px]">{t.level}</span>
                      </div>
                      <div className="mt-1.5 h-1.5 w-full rounded-full bg-ink-100 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-mission-400 via-mission-500 to-nova-500"
                          style={{ width: `${(coins / maxTeamCoin) * 100}%` }}
                        />
                      </div>
                    </div>
                    <div className="flex items-center gap-0.5 text-gradient-energy font-black tabular-nums shrink-0 text-[14px]">
                      <Zap size={12} />{coins}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </CollapsibleSection>

      {/* ============ ROW 5: Achievement + Stats - Collapsible ============ */}
      <CollapsibleSection
        title="成果展示与数据统计"
        subtitle="Achievement Hall & Statistics"
        icon={
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-growth-400/20 to-mission-400/20 flex items-center justify-center">
            <Award size={18} className="text-growth-600" />
          </div>
        }
        defaultOpen={false}
      >
        <div className="grid grid-cols-12 gap-5">
          {/* 左7 Achievement Hall */}
          <div className="col-span-12 lg:col-span-7 rounded-[24px] bg-gradient-to-br from-growth-50/70 via-white/85 to-emerald-50/50 border border-growth-100/50 p-5">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <span className="mission-label">Achievement Hall</span>
                <h3 className="text-[19px] font-extrabold text-ink-800">成果展示 · 精选瀑布</h3>
              </div>
              <button className="btn-ghost text-[12px] !py-1.5 !px-3" onClick={() => { navigate('/showcase'); pushToast('进入成果展览馆 · 6 份新作品已更新 🏆', 'info'); }}>
                <Eye size={13} className="mr-1" />查看大厅
              </button>
            </div>

            <div className="grid grid-cols-3 gap-3">
              {ACHIEVEMENT_SEEDS.map((seed, i) => (
                <div
                  key={seed}
                  className={`group relative rounded-2xl overflow-hidden shadow-sm ${i === 0 || i === 4 ? 'row-span-2' : ''}`}
                  style={{ height: i === 0 || i === 4 ? 220 : 106 }}
                >
                  <img
                    src={`https://picsum.photos/seed/${seed}/400/${i === 0 || i === 4 ? 600 : 300}`}
                    alt={ACHIEVEMENT_TITLES[i]}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-ink-900/85 via-ink-900/20 to-transparent opacity-90 group-hover:opacity-100 transition-opacity" />
                  <div className="absolute inset-0 p-3.5 flex flex-col justify-end">
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <span className={`chip-${['mission', 'growth', 'energy', 'nova', 'mission', 'growth'][i]} !py-0.5 !px-1.5 !text-[9.5px] !text-white bg-opacity-80`}>
                        <Award size={8} />A{String(i + 1).padStart(2, '0')}
                      </span>
                      <span className="chip-ink !py-0.5 !px-1.5 !text-[9.5px]">
                        <Users size={8} className="mr-0.5" />{4 + (i % 3)}人
                      </span>
                    </div>
                    <div className="text-[12.5px] font-bold text-white drop-shadow leading-tight">
                      {ACHIEVEMENT_TITLES[i]}
                    </div>
                  </div>
                  <div className="absolute top-2.5 right-2.5 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-1 group-hover:translate-y-0">
                    <div className="w-7 h-7 rounded-full bg-white/90 backdrop-blur flex items-center justify-center shadow-lg">
                      <ArrowRight size={13} className="text-mission-600" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 右5 Class Statistics */}
          <div className="col-span-12 lg:col-span-5 rounded-[24px] bg-gradient-to-br from-nova-50/70 via-white/85 to-mission-50/50 border border-nova-100/50 p-5">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <span className="mission-label">Class Statistics</span>
                <h3 className="text-[19px] font-extrabold text-ink-800">班级运行数据</h3>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {CLASS_STATS.map((s, i) => (
                <div
                  key={s.label}
                  onClick={s.label === '总人数' ? openClassmates : undefined}
                  className={cn(
                    'rounded-2xl p-4 border border-ink-100/50 group hover:shadow-glowMission transition-all',
                    s.label === '总人数' && 'cursor-pointer hover:border-mission-300/60'
                  )}
                  style={{
                    background: i % 2 === 0
                      ? `linear-gradient(135deg, rgba(var(--${s.tint === 'danger' ? 'alert' : s.tint}-rgb, 79,124,255), 0.04), rgba(255,255,255,0.9))`
                      : 'rgba(255,255,255,0.8)',
                  }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className={`w-8 h-8 rounded-xl bg-gradient-to-br ${
                      s.tint === 'mission' ? 'from-mission-400/20 to-mission-500/10 text-mission-600'
                      : s.tint === 'energy' ? 'from-energy-400/20 to-alert-400/10 text-energy-600'
                      : s.tint === 'growth' ? 'from-growth-400/20 to-growth-500/10 text-growth-600'
                      : s.tint === 'nova' ? 'from-nova-400/20 to-nova-500/10 text-nova-600'
                      : s.tint === 'alert' ? 'from-alert-400/20 to-alert-500/10 text-alert-600'
                      : 'from-danger-400/20 to-danger-500/10 text-danger-600'
                    } flex items-center justify-center`}>
                      {s.tint === 'mission' && <Users size={14} />}
                      {s.tint === 'energy' && <Brain size={14} />}
                      {s.tint === 'growth' && <CheckCircle2 size={14} />}
                      {s.tint === 'nova' && <FlaskConical size={14} />}
                      {s.tint === 'alert' && <Coins size={14} />}
                      {s.tint === 'danger' && <AlertTriangle size={14} />}
                    </div>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className={`text-[26px] font-black tabular-nums leading-none ${
                      s.tint === 'mission' ? 'text-mission-600'
                      : s.tint === 'energy' ? 'text-gradient-energy'
                      : s.tint === 'growth' ? 'text-growth-600'
                      : s.tint === 'nova' ? 'text-nova-600'
                      : s.tint === 'alert' ? 'text-alert-600'
                      : 'text-danger-600'
                    }`}>
                      {statValues[i]}
                    </span>
                    <span className="text-[12px] font-bold text-ink-500">{s.suffix}</span>
                  </div>
                  <div className="mt-1.5 text-[11px] font-semibold text-ink-600">{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </CollapsibleSection>

      {/* 同班同学弹窗 */}
      {showClassmates && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-ink-900/50 backdrop-blur-sm"
          onClick={() => setShowClassmates(false)}
        >
          <div
            className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-xl max-h-[70vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-lg text-ink-800 flex items-center gap-2">
                <Users size={18} className="text-mission-500" /> 同班同学
              </h3>
              <button
                onClick={() => setShowClassmates(false)}
                className="p-1.5 rounded-lg hover:bg-ink-100 transition-colors"
              >
                <X size={20} className="text-ink-500" />
              </button>
            </div>
            {loadingClassmates ? (
              <div className="flex items-center justify-center py-8 text-ink-400 text-sm">
                加载中…
              </div>
            ) : classmates.length === 0 ? (
              <div className="flex items-center justify-center py-8 text-ink-400 text-sm">
                暂无同学数据
              </div>
            ) : (
              <div className="overflow-y-auto flex-1 -mx-2 px-2">
                <div className="grid grid-cols-2 gap-2">
                  {classmates.map((s, idx) => {
                    const groupName = groups.find((g) => g.id === s.groupId)?.name || '未分组';
                    return (
                      <div
                        key={s.id}
                        className="flex items-center gap-2.5 rounded-xl border border-ink-100/60 px-3 py-2 hover:bg-mission-50/40 transition-colors"
                      >
                        <img
                          src={s.avatar}
                          alt={s.name}
                          className="w-8 h-8 rounded-lg object-cover bg-mission-100 shrink-0"
                        />
                        <div className="min-w-0">
                          <div className="text-[13px] font-semibold text-ink-700 truncate">
                            {idx + 1}. {s.name}
                          </div>
                          <div className="text-[10px] text-ink-400 truncate">{groupName}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            <div className="mt-4 pt-3 border-t border-ink-100 text-center text-[11px] text-ink-400">
              共 {classmates.length} 名同学
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
