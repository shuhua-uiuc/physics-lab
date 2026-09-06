import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  User,
  Zap,
  Target,
  Swords,
  Users,
  Crown,
  Star,
  Sparkles,
  Lock,
  BookOpen,
  FlaskConical,
  Puzzle,
  Code,
  ShieldCheck,
  Handshake,
  Trophy,
  Rocket,
  CheckCircle2,
  Calendar,
  Award,
  Flag,
} from 'lucide-react';
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar as ReRadar,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from 'recharts';
import MissionShell from '@/components/layout/MissionShell';
import Checkbox from '@/components/ui/Checkbox';
import { useGroupStore } from '@/store/groupStore';
import { useAuthStore } from '@/store/authStore';
import { useUIStore } from '@/store/uiStore';
import { authApi } from '@/lib/apiService';
import { cn } from '@/lib/utils';

function useTicker(target: number, duration = 900) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    let raf: number;
    const t0 = performance.now();
    const step = (now: number) => {
      const p = Math.min(1, (now - t0) / duration);
      const ease = 1 - Math.pow(1 - p, 3);
      setVal(Math.round(target * ease));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return val;
}

const BADGES = [
  { id: 'b1', name: '安全先锋', grad: 'from-mission-400 to-mission-600', icon: ShieldCheck },
  { id: 'b2', name: '出题大师', grad: 'from-energy-400 to-energy-600', icon: Puzzle },
  { id: 'b3', name: '实验能手', grad: 'from-growth-400 to-growth-600', icon: FlaskConical },
  { id: 'b4', name: '代码达人', grad: 'from-nova-400 to-nova-600', icon: Code },
  { id: 'b5', name: '理论王者', grad: 'from-alert-400 to-alert-600', icon: BookOpen },
  { id: 'b6', name: '协作之星', grad: 'from-mission-400 to-nova-500', icon: Handshake },
  { id: 'b7', name: '挑战之王', grad: 'from-danger-400 to-energy-500', icon: Swords },
  { id: 'b8', name: '招募达人', grad: 'from-cyan-400 to-cyan-600', icon: Users },
  { id: 'b9', name: '项目交付', grad: 'from-growth-400 to-mission-500', icon: Trophy },
  { id: 'b10', name: '全勤学者', grad: 'from-energy-400 to-nova-500', icon: Rocket },
];

interface TimelineEvent {
  id: string;
  date: string;
  type: 'challenge' | 'project' | 'exam' | 'recruit';
  title: string;
  desc: string;
  coins: number;
}

function buildTimeline(): TimelineEvent[] {
  const types: Array<TimelineEvent['type']> = ['challenge', 'project', 'exam', 'recruit'];
  const titles: Record<TimelineEvent['type'], string[]> = {
    challenge: ['电磁学高阶对决', '力学基础挑战赛', '光学概念速答', '综合知识杯'],
    project: ['磁悬浮列车模型', '太阳能效率对比', '驻波共振演示', '云室径迹观测', '霍尔效应扫描'],
    exam: ['电学安全考核', '光学安全考核', '热学安全考核', '力学理论考核'],
    recruit: ['跨组协助硬件搭建', '数据分析兼职', '文档撰写协助', '实验操作支援'],
  };
  const list: TimelineEvent[] = [];
  for (let i = 0; i < 20; i++) {
    const t = types[i % 4];
    const variants = titles[t];
    const d = new Date(Date.now() - i * 5 * 86400000);
    const label = `${d.getMonth() + 1}/${d.getDate()}`;
    list.push({
      id: `e-${i + 1}`,
      date: label,
      type: t,
      title: variants[i % variants.length],
      desc:
        t === 'challenge'
          ? '答题准确率 88%，击败同年级 78% 挑战者'
          : t === 'project'
            ? '小组内分工完成数据分析与误差讨论章节'
            : t === 'exam'
              ? '92 分通过，安全知识已掌握'
              : '成功中标并提前 1 天交付',
      coins: t === 'project' ? 120 + (i % 3) * 40 : t === 'challenge' ? 60 + (i % 4) * 20 : 40 + (i % 5) * 10,
    });
  }
  return list;
}

const SKILL_RADAR = [
  { skill: '理论基础', A: 92 },
  { skill: '实验操作', A: 86 },
  { skill: '出题能力', A: 78 },
  { skill: '编程建模', A: 80 },
  { skill: '安全规范', A: 95 },
  { skill: '团队协作', A: 88 },
];

const SEMESTER_GOALS = [
  { id: 'g1', text: '完成 ≥ 3 个项目式学习课题', checked: true },
  { id: 'g2', text: '至少赢下 2 场对外知识挑战', checked: true },
  { id: 'g3', text: '通过全部 6 类安全考核（含辐射）', checked: true },
  { id: 'g4', text: '在招募市场完成 ≥ 5 次跨组协助', checked: false },
  { id: 'g5', text: '个人能量币赛季累计突破 3000⚡', checked: false },
];

export default function ResearchProfile() {
  const { users, groups } = useGroupStore();
  const authUserId = useAuthStore((s) => s.userId);
  const me = users.find((u) => u.id === authUserId) || users[0];
  const myGroup = groups.find((g) => g.id === me.groupId);
  const timeline = useMemo(() => buildTimeline(), []);
  const [goals, setGoals] = useState<Record<string, boolean>>(
    Object.fromEntries(SEMESTER_GOALS.map((g) => [g.id, g.checked]))
  );
  const doneCount = Object.values(goals).filter(Boolean).length;

  const pushToast = useUIStore((s) => s.pushToast);
  const [pwdOpen, setPwdOpen] = useState(false);
  const [oldPwd, setOldPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [pwdErr, setPwdErr] = useState('');
  const [changingPwd, setChangingPwd] = useState(false);

  const handleChangePassword = async () => {
    if (!oldPwd || !newPwd) {
      setPwdErr('请填写原密码与新密码');
      return;
    }
    if (newPwd.length < 6) {
      setPwdErr('新密码至少 6 位');
      return;
    }
    if (newPwd !== confirmPwd) {
      setPwdErr('两次输入的新密码不一致');
      return;
    }
    setPwdErr('');
    setChangingPwd(true);
    try {
      await authApi.changePassword(oldPwd, newPwd);
      pushToast('密码已修改，下次请用新密码登录', 'success');
      setPwdOpen(false);
      setOldPwd('');
      setNewPwd('');
      setConfirmPwd('');
    } catch (err: any) {
      setPwdErr(err?.message || '修改失败，请重试');
    } finally {
      setChangingPwd(false);
    }
  };

  const timelineCfg: Record<TimelineEvent['type'], { grad: string; chip: string; icon: any }> = {
    challenge: { grad: 'from-nova-400 to-mission-500', chip: 'chip-nova', icon: Swords },
    project: { grad: 'from-growth-400 to-mission-500', chip: 'chip-growth', icon: Target },
    exam: { grad: 'from-mission-400 to-cyan-500', chip: 'chip-mission', icon: ShieldCheck },
    recruit: { grad: 'from-energy-400 to-alert-500', chip: 'chip-energy', icon: Users },
  };

  return (
    <MissionShell>
      <div className="space-y-6">
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="glass-card p-6 md:p-8 rounded-[28px] relative overflow-hidden"
        >
          <div className="absolute -top-16 -right-10 w-80 h-80 rounded-full bg-mission-400/15 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 left-32 w-80 h-80 rounded-full bg-nova-400/10 blur-3xl pointer-events-none" />
          <div className="absolute top-10 right-48 w-56 h-56 rounded-full bg-energy-400/10 blur-3xl pointer-events-none" />
          <div className="relative z-10 space-y-5">
            <div className="flex justify-end">
              <button
                onClick={() => setPwdOpen(true)}
                className="btn-ghost !py-1.5 !px-3 text-[12px] inline-flex items-center gap-1.5"
              >
                <Lock size={13} className="text-mission-500" />
                修改密码
              </button>
            </div>
            <div className="grid grid-cols-12 gap-6 items-start">
              <div className="col-span-12 md:col-span-7 flex items-start gap-5">
                <div className="relative shrink-0">
                  <div className="absolute -inset-2 rounded-[36px] bg-gradient-to-br from-mission-400/30 via-nova-400/20 to-energy-400/20 blur-lg" />
                  <div className="relative w-24 h-24 md:w-28 md:h-28 rounded-[32px] overflow-hidden ring-4 ring-white shadow-glowMission bg-gradient-to-br from-mission-100 to-nova-100">
                    {me.avatar ? (
                      <img src={me.avatar} alt={me.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <User size={44} className="text-mission-600" />
                      </div>
                    )}
                  </div>
                  <div className="absolute -bottom-2 -right-2 badge-ring">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-mission-400 via-nova-500 to-energy-400 flex items-center justify-center ring-4 ring-white shadow-lg">
                      <Sparkles size={16} className="text-white" />
                    </div>
                  </div>
                </div>
                <div className="pt-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <span className="chip-nova !py-1 !px-3 !text-[11px]">
                      <Star size={10} fill="currentColor" />
                      LV8 Researcher
                    </span>
                    {me.role === 'leader' && (
                      <span className="chip-energy !py-1 !px-3 !text-[11px]">
                        <Crown size={10} />
                        组长
                      </span>
                    )}
                  </div>
                  <h1 className="text-[28px] md:text-[32px] font-extrabold text-ink-900 leading-[1.1] tracking-tight">
                    {me.name || '杨静'}
                    <span className="block text-[14px] md:text-[15px] font-semibold text-ink-500 mt-1 flex items-center gap-1.5">
                      <Flag size={14} className="text-mission-500" />
                      {myGroup?.name || '牛顿先锋队'}
                      <span className="text-ink-300 mx-1">·</span>
                      <span className="italic text-gradient-mission font-serif">「大胆假设，小心求证」</span>
                    </span>
                  </h1>
                </div>
              </div>

              <div className="col-span-12 md:col-span-5 grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { label: '总能量', val: 2380, unit: '⚡', grad: 'from-energy-400 to-alert-500', icon: Zap },
                  { label: '完成课题', val: 8, unit: '项', grad: 'from-growth-400 to-growth-600', icon: Target },
                  { label: '发起挑战', val: 12, unit: '场', grad: 'from-nova-400 to-nova-600', icon: Swords },
                  { label: '招募帮助', val: 6, unit: '次', grad: 'from-mission-400 to-mission-600', icon: Users },
                ].map((s, i) => {
                  const Icon = s.icon;
                  return (
                    <motion.div
                      key={s.label}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.35, delay: 0.1 + i * 0.05 }}
                      className="glass-card !shadow-none p-3 rounded-2xl relative overflow-hidden"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div
                          className={cn('w-8 h-8 rounded-lg bg-gradient-to-br flex items-center justify-center text-white shadow-md', s.grad)}
                        >
                          <Icon size={14} />
                        </div>
                        <span className="text-[10px] text-ink-400 font-mono">{s.unit}</span>
                      </div>
                      <div className="ticker ticker-anim text-[24px] font-extrabold text-ink-800 leading-none tabular-nums">
                        <StatTicker val={s.val} />
                      </div>
                      <div className="text-[11px] text-ink-500 mt-1 font-medium">{s.label}</div>
                    </motion.div>
                  );
                })}
              </div>
            </div>

            <div className="pt-3 space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="chip-growth !py-0.5 !px-2 !text-[11px]">升级进度</span>
                    <span className="text-[12px] text-ink-500">距离 LV9 Researcher</span>
                  </div>
                  <span className="text-[12px] font-bold text-gradient-mission tabular-nums">94%</span>
                </div>
                <div className="h-2.5 w-full rounded-full bg-ink-100 overflow-hidden relative">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: '94%' }}
                    transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1], delay: 0.2 }}
                    className="h-full rounded-full bg-gradient-to-r from-mission-400 via-nova-500 to-energy-400 relative"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer" />
                  </motion.div>
                </div>
                <div className="flex items-center justify-between mt-1 text-[11px] text-ink-400 font-mono">
                  <span>4700 / 5000 EXP</span>
                  <span>还需 300 EXP · 约 2 个课题</span>
                </div>
              </div>

              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Award size={15} className="text-alert-500" />
                  <span className="text-[13px] font-bold text-ink-800">徽章墙</span>
                  <span className="text-[11px] text-ink-400 font-mono">10 / 24</span>
                </div>
                <div className="flex flex-wrap gap-3">
                  {BADGES.map((b, i) => {
                    const Icon = b.icon;
                    return (
                      <motion.div
                        key={b.id}
                        initial={{ opacity: 0, scale: 0.7 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.35, delay: 0.15 + i * 0.04, type: 'spring' }}
                        className="relative group cursor-pointer"
                        title={b.name}
                      >
                        <div className="absolute -inset-1 rounded-full bg-gradient-to-br opacity-30 blur-md group-hover:opacity-60 transition-opacity"
                          style={{ backgroundImage: `linear-gradient(135deg, var(--tw-gradient-stops))` }}
                        />
                        <div className={cn(
                          'badge-ring relative w-12 h-12 rounded-full flex items-center justify-center text-white shadow-lg',
                          'bg-gradient-to-br',
                          b.grad
                        )}>
                          <Icon size={20} strokeWidth={2.2} />
                        </div>
                        <div className="absolute left-1/2 -translate-x-1/2 top-full mt-1.5 whitespace-nowrap text-[10px] font-semibold text-ink-600 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                          {b.name}
                        </div>
                      </motion.div>
                    );
                  })}
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div
                      key={`lock-${i}`}
                      className="w-12 h-12 rounded-full bg-ink-100 border-2 border-dashed border-ink-200 flex items-center justify-center text-ink-300"
                    >
                      <Star size={16} />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </motion.section>

        <div className="grid grid-cols-12 gap-6">
          <div className="col-span-12 lg:col-span-6">
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: 0.1 }}
              className="glass-card p-5 md:p-6 rounded-[24px] h-full"
            >
              <div className="flex items-center justify-between mb-5">
                <h2 className="flex items-center gap-2 text-[17px] font-bold text-ink-800">
                  <Calendar size={19} className="text-nova-500" />
                  学习与研究路径
                </h2>
                <span className="chip-nova !py-0.5 !px-2 !text-[10px]">近 100 天 · 20 条</span>
              </div>
              <div className="relative pl-1">
                <div
                  className="absolute left-[18px] top-2 bottom-2 w-0.5 rounded-full"
                  style={{
                    background:
                      'linear-gradient(180deg, rgba(79,124,255,0.45) 0%, rgba(139,92,246,0.35) 35%, rgba(255,138,52,0.3) 70%, rgba(34,197,94,0.35) 100%)',
                  }}
                />
                <div className="space-y-4 max-h-[720px] overflow-y-auto pr-2 scroll-thin">
                  {timeline.map((e, i) => {
                    const cfg = timelineCfg[e.type];
                    const Icon = cfg.icon;
                    return (
                      <motion.div
                        key={e.id}
                        initial={{ opacity: 0, x: -12 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.35, delay: 0.12 + i * 0.025 }}
                        className="relative pl-10 group"
                      >
                        <div
                          className={cn(
                            'absolute left-0 top-1.5 w-4 h-4 rounded-full ring-4 ring-white flex items-center justify-center shadow-md bg-gradient-to-br',
                            cfg.grad
                          )}
                        >
                          <Icon size={8} className="text-white" strokeWidth={3} />
                        </div>
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className={cn(cfg.chip, '!py-0.5 !px-2 !text-[10.5px]')}>{e.title}</span>
                          <span className="text-[11px] text-ink-400 font-mono">{e.date}</span>
                          <span className="text-[11px] font-bold text-gradient-energy tabular-nums ml-auto">
                            +{e.coins}⚡
                          </span>
                        </div>
                        <p className="text-[12.5px] text-ink-600 leading-relaxed">{e.desc}</p>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            </motion.section>
          </div>

          <div className="col-span-12 lg:col-span-6 space-y-6">
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: 0.15 }}
              className="glass-card p-5 md:p-6 rounded-[24px]"
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="flex items-center gap-2 text-[17px] font-bold text-ink-800">
                  <Radar size={19} className="text-mission-500" />
                  Skill Radar · 能力六维图
                </h2>
                <span className="chip-mission !py-0.5 !px-2 !text-[10px]">综合 B+</span>
              </div>
              <div className="h-[300px] -mx-2">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={SKILL_RADAR} outerRadius="78%">
                    <defs>
                      <linearGradient id="radarFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#4F7CFF" stopOpacity={0.55} />
                        <stop offset="100%" stopColor="#8B5CF6" stopOpacity={0.3} />
                      </linearGradient>
                    </defs>
                    <PolarGrid stroke="#E2E8F0" />
                    <PolarAngleAxis
                      dataKey="skill"
                      tick={{ fontSize: 11, fill: '#334155', fontWeight: 600 }}
                    />
                    <PolarRadiusAxis
                      angle={90}
                      domain={[0, 100]}
                      tick={{ fontSize: 9, fill: '#94A3B8' }}
                      axisLine={false}
                      tickCount={5}
                    />
                    <ReRadar
                      name="得分"
                      dataKey="A"
                      stroke="#4F7CFF"
                      strokeWidth={2.5}
                      fill="url(#radarFill)"
                      dot={{ r: 3.5, fill: '#8B5CF6', stroke: '#fff', strokeWidth: 2 }}
                    />
                    <Tooltip
                      contentStyle={{
                        borderRadius: 12,
                        fontSize: 12,
                        border: '1px solid rgba(255,255,255,0.9)',
                        background: 'rgba(255,255,255,0.95)',
                        backdropFilter: 'blur(10px)',
                        boxShadow: '0 8px 24px rgba(15,23,42,0.1)',
                      }}
                      formatter={(v: any) => [`${v} / 100`, '得分']}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-2">
                {SKILL_RADAR.map((s, i) => {
                  const palette = ['#4F7CFF', '#FF8A34', '#22C55E', '#8B5CF6', '#F59E0B', '#06B6D4'];
                  const c = palette[i % 6];
                  return (
                    <div key={s.skill} className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ background: c }} />
                      <span className="text-[11.5px] text-ink-600 flex-1">{s.skill}</span>
                      <span className="text-[12px] font-bold tabular-nums" style={{ color: c }}>
                        {s.A}
                      </span>
                    </div>
                  );
                })}
              </div>
            </motion.section>

            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: 0.22 }}
              className="glass-card p-5 md:p-6 rounded-[24px]"
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="flex items-center gap-2 text-[17px] font-bold text-ink-800">
                  <Target size={19} className="text-growth-500" />
                  本学期目标
                </h2>
                <span className="chip-growth !py-0.5 !px-2 !text-[10px]">
                  <CheckCircle2 size={10} />
                  {doneCount} / {SEMESTER_GOALS.length}
                </span>
              </div>
              <div className="mb-4">
                <div className="flex justify-between text-[11px] text-ink-400 font-mono mb-1">
                  <span>完成度</span>
                  <span className="font-bold text-growth-600">
                    {Math.round((doneCount / SEMESTER_GOALS.length) * 100)}%
                  </span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-ink-100 overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${(doneCount / SEMESTER_GOALS.length) * 100}%` }}
                    transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1], delay: 0.3 }}
                    className="h-full rounded-full bg-gradient-to-r from-growth-400 to-mission-500"
                  />
                </div>
              </div>
              <div className="space-y-2.5">
                {SEMESTER_GOALS.map((g, i) => (
                  <motion.div
                    key={g.id}
                    initial={{ opacity: 0, x: 8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: 0.3 + i * 0.05 }}
                    className={cn(
                      'p-3 rounded-xl border transition-all',
                      goals[g.id]
                        ? 'bg-gradient-to-r from-growth-50/60 to-mission-50/40 border-growth-100'
                        : 'bg-ink-50/50 border-ink-100 hover:bg-ink-50'
                    )}
                  >
                    <Checkbox
                      checked={!!goals[g.id]}
                      onCheckedChange={(c) =>
                        setGoals((prev) => ({ ...prev, [g.id]: c }))
                      }
                      label={g.text}
                      id={`goal-${g.id}`}
                    />
                  </motion.div>
                ))}
              </div>
            </motion.section>
          </div>
        </div>
      </div>
      {pwdOpen && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-ink-900/40 backdrop-blur-sm p-4"
          onClick={() => setPwdOpen(false)}
        >
          <div
            className="glass-card w-full max-w-sm p-6 rounded-[24px] shadow-soft relative"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-extrabold text-ink-800 text-[18px] mb-1 flex items-center gap-2">
              <Lock size={18} className="text-mission-500" />
              修改密码
            </h3>
            <p className="text-[12px] text-ink-500 mb-4">修改后请用新密码登录</p>
            <div className="space-y-3">
              <input
                type="password"
                placeholder="原密码"
                className="input"
                value={oldPwd}
                onChange={(e) => setOldPwd(e.target.value)}
              />
              <input
                type="password"
                placeholder="新密码（至少 6 位）"
                className="input"
                value={newPwd}
                onChange={(e) => setNewPwd(e.target.value)}
              />
              <input
                type="password"
                placeholder="确认新密码"
                className="input"
                value={confirmPwd}
                onChange={(e) => setConfirmPwd(e.target.value)}
              />
              {pwdErr && <p className="text-[12px] text-danger-600">{pwdErr}</p>}
            </div>
            <div className="flex gap-2 mt-5">
              <button className="btn-ghost flex-1" onClick={() => setPwdOpen(false)}>
                取消
              </button>
              <button
                className="btn-mission flex-1"
                onClick={handleChangePassword}
                disabled={changingPwd}
              >
                {changingPwd ? '提交中…' : '确认修改'}
              </button>
            </div>
          </div>
        </div>
      )}
    </MissionShell>
  );
}

function StatTicker({ val }: { val: number }) {
  const v = useTicker(val);
  return (
    <span className="ticker tabular-nums">
      {v.toLocaleString()}
    </span>
  );
}

function Radar({ size, className }: { size?: number; className?: string }) {
  return (
    <div className={cn('inline-flex', className)}>
      <svg width={size || 20} height={size || 20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2L2 19h20L12 2z" />
        <circle cx="12" cy="14" r="2" />
      </svg>
    </div>
  );
}
