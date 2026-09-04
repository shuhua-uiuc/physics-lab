import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Radar,
  Users,
  FolderKanban,
  CheckCircle2,
  Loader2,
  XCircle,
  Snowflake,
  Zap,
  BarChart3,
  PieChart,
  AlertTriangle,
  ShieldAlert,
  Clock,
  Bell,
  ArrowRightLeft,
  ChevronRight,
  FileCheck,
  TimerReset,
  Send,
  LineChart,
  Activity,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart as RePieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import MissionShell from '@/components/layout/MissionShell';
import { useGroupStore } from '@/store/groupStore';
import { bootstrapFromApi } from '@/lib/bootstrap';
import { CoinSource } from '@/data/mockData';
import { cn } from '@/lib/utils';

type TabKey = 'overview' | 'coins' | 'safety' | 'analytics';

const TABS: Array<{ key: TabKey; label: string }> = [
  { key: 'overview', label: '全班概览' },
  { key: 'coins', label: '能量流通' },
  { key: 'safety', label: '安全态势' },
  { key: 'analytics', label: '学习分析' },
];

const GROUP_NAMES6 = ['牛顿先锋队', '麦克斯韦闪电队', '爱因斯坦脑洞组', '特斯拉电流团', '伽利略观测站', '薛定谔猫队'];
const GROUP_COLORS = ['#4F7CFF', '#FF8A34', '#22C55E', '#8B5CF6', '#F59E0B', '#06B6D4'];

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

const BAR_DATA = GROUP_NAMES6.map((n, i) => ({
  name: n.slice(0, 2),
  coins: [6820, 6410, 5860, 5320, 4980, 4710][i],
}));

const PIE_DATA = [
  { name: '已完成', value: 8, color: '#22C55E' },
  { name: '进行中', value: 4, color: '#4F7CFF' },
  { name: '评审中', value: 1, color: '#8B5CF6' },
  { name: '失败', value: 1, color: '#F04438' },
  { name: '冻结', value: 2, color: '#F59E0B' },
];

const TX_DATA = [
  { id: 1, time: '12:45', group: '牛顿先锋队', source: 'project' as CoinSource, delta: 200, balance: 6820, note: '磁悬浮项目阶段二奖励' },
  { id: 2, time: '11:30', group: '麦克斯韦闪电队', source: 'challenge' as CoinSource, delta: 150, balance: 6410, note: '电磁学高阶对决胜利' },
  { id: 3, time: '10:12', group: '爱因斯坦脑洞组', source: 'teacher_set' as CoinSource, delta: -50, balance: 5860, note: '实验器材损坏赔偿' },
  { id: 4, time: '09:48', group: '特斯拉电流团', source: 'recruit' as CoinSource, delta: 180, balance: 5320, note: '跨组协助结算' },
  { id: 5, time: '昨天 21:15', group: '伽利略观测站', source: 'project' as CoinSource, delta: 240, balance: 4980, note: '云室项目结题' },
  { id: 6, time: '昨天 19:30', group: '薛定谔猫队', source: 'penalty' as CoinSource, delta: -30, balance: 4710, note: '迟交实验报告' },
  { id: 7, time: '昨天 17:02', group: '牛顿先锋队', source: 'challenge' as CoinSource, delta: -60, balance: 6620, note: '力学挑战赛失利' },
  { id: 8, time: '昨天 15:40', group: '麦克斯韦闪电队', source: 'teacher_set' as CoinSource, delta: 100, balance: 6260, note: '课堂表现优秀奖励' },
  { id: 9, time: '昨天 14:18', group: '爱因斯坦脑洞组', source: 'recruit' as CoinSource, delta: 120, balance: 5910, note: '数据分析兼职结算' },
  { id: 10, time: '昨天 11:06', group: '特斯拉电流团', source: 'project' as CoinSource, delta: 180, balance: 5140, note: '霍尔效应阶段结算' },
  { id: 11, time: '昨天 09:25', group: '伽利略观测站', source: 'challenge' as CoinSource, delta: 80, balance: 4740, note: '光学速答胜利' },
  { id: 12, time: '前天 20:10', group: '薛定谔猫队', source: 'project' as CoinSource, delta: 160, balance: 4740, note: '光纤通信进度奖励' },
];

const FROZEN_PROJECTS = [
  { id: 'fp-1', name: '黑体辐射实验 · 组3', reason: '缺少辐射防护导师签字', frozenDays: 6, group: 'g-3' },
  { id: 'fp-2', name: '密立根油滴 · 组6', reason: '实验器材校准单丢失', frozenDays: 4, group: 'g-6' },
];

const PENDING_QUESTIONS = [
  { id: 'pq-1', author: '杨静', subject: '电磁学', stem: '关于动生电动势方向判断，以下说法正确的是？', difficulty: 2 },
  { id: 'pq-2', author: '赵磊', subject: '光学', stem: '以下哪种现象可用于说明光的横波性质？', difficulty: 2 },
  { id: 'pq-3', author: '马超', subject: '近代物理', stem: '康普顿效应主要验证了光的哪种特性？', difficulty: 3 },
];

const OVERDUE_RECRUITS = [
  { id: 'or-1', title: '数据建模师招募', owner: '牛顿先锋队', postedDays: 12, bids: 5 },
  { id: 'or-2', title: '硬件调试专家', owner: '特斯拉电流团', postedDays: 9, bids: 2 },
];

function formatCoinDelta(delta: number) {
  const sign = delta >= 0 ? '+' : '';
  return `${sign}${delta}`;
}

const SOURCE_CONFIG: Record<CoinSource, { label: string; chip: string; icon: any }> = {
  challenge: { label: '挑战', chip: 'chip-nova', icon: SwordsIcon },
  project: { label: '项目', chip: 'chip-growth', icon: FolderKanban },
  recruit: { label: '招募', chip: 'chip-energy', icon: Users },
  teacher_set: { label: '教师发放', chip: 'chip-mission', icon: ArrowRightLeft },
  penalty: { label: '扣罚', chip: 'chip-danger', icon: XCircle },
  transfer: { label: '组间转账', chip: 'chip-nova', icon: ArrowRightLeft },
};

function SwordsIcon(props: any) {
  return (
    <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M14.5 17.5L3 6V3h3l11.5 11.5" />
      <path d="M13 19l6-6" />
      <path d="M16 16l4 4" />
      <path d="M19 21l2-2" />
    </svg>
  );
}

export default function TeacherOverview() {
  const navigate = useNavigate();
  const { groups, users } = useGroupStore();
  const [tab, setTab] = useState<TabKey>('overview');
  const totalStudents = users.length;
  const totalGroups = groups.length;

  // 挂载时从后端拉取最新数据，确保总人数等统计实时更新
  useEffect(() => {
    bootstrapFromApi(true);
  }, []);

  return (
    <MissionShell>
      <div className="space-y-6">
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="glass-card p-6 md:p-8 rounded-[28px] relative overflow-hidden"
        >
          <div className="absolute -top-16 right-0 w-96 h-96 rounded-full bg-mission-400/12 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-20 left-0 w-80 h-80 rounded-full bg-danger-400/8 blur-3xl pointer-events-none" />
          <div className="relative z-10 flex flex-wrap items-end justify-between gap-6">
            <div className="flex flex-wrap items-center gap-4">
              <div className="relative shrink-0">
                <div className="w-20 h-20 rounded-[24px] flex items-center justify-center">
                  <div className="relative w-full h-full">
                    <div className="orbit-ring w-[110px] h-[110px] animate-spin" style={{ animationDuration: '24s' }} />
                    <div className="orbit-ring w-[86px] h-[86px] animate-spin" style={{ animationDuration: '16s', animationDirection: 'reverse' }} />
                    <div className="absolute inset-0 rounded-[24px] bg-gradient-to-br from-mission-400 via-nova-500 to-mission-600 flex items-center justify-center shadow-glowMission">
                      <Radar size={28} className="text-white" />
                    </div>
                  </div>
                </div>
              </div>
              <div>
                <span className="mission-label">
                  <Bell size={12} />
                  COMMAND CENTER · 指挥总控台
                </span>
                <h1 className="mt-3 text-[30px] md:text-[34px] font-extrabold text-ink-900 leading-[1.1] tracking-tight">
                  Mission Control
                  <span className="block text-gradient-mission mt-1">闽西职业技术学院特色班 · 实时总览</span>
                </h1>
              </div>
            </div>
            <div className="glass-card !shadow-none p-1.5 rounded-2xl border-mission-100/70 flex flex-wrap gap-1">
              {TABS.map((t) => (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  className={cn(
                    'px-4 py-2 rounded-xl text-[13px] font-semibold transition-all',
                    tab === t.key
                      ? 'bg-gradient-to-br from-mission-500 to-nova-500 text-white shadow-glowMission'
                      : 'text-ink-600 hover:bg-mission-50/60 hover:text-mission-700'
                  )}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>
        </motion.section>

        <div className="grid grid-cols-12 gap-6">
          <div className="col-span-12 xl:col-span-8 space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: 0.08 }}
              className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4"
            >
              {[
                { label: '总人数', val: totalStudents, unit: '人', icon: Users, grad: 'from-mission-400 to-mission-600', clickable: true },
                { label: '总小组', val: totalGroups, unit: '组', icon: FolderKanban, grad: 'from-nova-400 to-nova-600', clickable: false },
                { label: '已完成', val: 8, unit: '项', icon: CheckCircle2, grad: 'from-growth-400 to-growth-600', clickable: false },
                { label: '进行中', val: 4, unit: '项', icon: Loader2, grad: 'from-energy-400 to-energy-600', clickable: false },
                { label: '失败', val: 1, unit: '项', icon: XCircle, grad: 'from-danger-400 to-danger-600', clickable: false },
                { label: '冻结', val: 2, unit: '项', icon: Snowflake, grad: 'from-alert-400 to-alert-600', clickable: false },
              ].map((s, i) => {
                const Icon = s.icon;
                return (
                  <motion.div
                    key={s.label}
                    initial={{ opacity: 0, scale: 0.92 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.35, delay: 0.1 + i * 0.05, type: 'spring' }}
                    className={cn(
                      'glass-card glass-card-hover p-4 rounded-[20px] relative overflow-hidden',
                      s.clickable && 'cursor-pointer ring-1 ring-mission-200/50 hover:ring-mission-400/40'
                    )}
                    onClick={s.clickable ? () => navigate('/teacher/roster') : undefined}
                  >
                    <div className={cn('absolute -top-4 -right-4 w-20 h-20 rounded-full opacity-20 blur-xl bg-gradient-to-br', s.grad)} />
                    <div className="flex items-center justify-between mb-3 relative z-10">
                      <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-md bg-gradient-to-br', s.grad)}>
                        <Icon size={18} />
                      </div>
                      <span className="text-[11px] text-ink-400 font-mono">{s.unit}</span>
                    </div>
                    <div className="ticker ticker-anim text-[30px] font-extrabold text-ink-800 leading-none tabular-nums relative z-10">
                      <NumTicker val={s.val} />
                    </div>
                    <div className="text-[12px] text-ink-500 mt-1.5 font-medium relative z-10">{s.label}</div>
                  </motion.div>
                );
              })}
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: 0.15 }}
              className="grid grid-cols-12 gap-4"
            >
              <div className="col-span-12 lg:col-span-8 glass-card p-5 rounded-[24px]">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="flex items-center gap-2 text-[16px] font-bold text-ink-800">
                    <BarChart3 size={18} className="text-mission-500" />
                    6 小组能量币对比
                  </h3>
                  <span className="chip-mission !py-0.5 !px-2 !text-[10px]">单位 ⚡</span>
                </div>
                <div className="h-[220px] -mx-3">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={BAR_DATA} margin={{ top: 6, right: 12, left: -10, bottom: 0 }}>
                      <defs>
                        <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#4F7CFF" />
                          <stop offset="50%" stopColor="#6D91FF" />
                          <stop offset="100%" stopColor="#FF8A34" />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                      <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#475569', fontWeight: 600 }} tickLine={false} axisLine={false} />
                      <YAxis tick={{ fontSize: 10, fill: '#94A3B8' }} tickLine={false} axisLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                      <Tooltip
                        contentStyle={{
                          borderRadius: 12,
                          fontSize: 12,
                          border: '1px solid rgba(255,255,255,0.9)',
                          background: 'rgba(255,255,255,0.96)',
                          backdropFilter: 'blur(12px)',
                          boxShadow: '0 8px 24px rgba(15,23,42,0.12)',
                        }}
                        formatter={(v: any) => [`${Number(v).toLocaleString()} ⚡`, '能量币']}
                      />
                      <Bar dataKey="coins" fill="url(#barGrad)" radius={[8, 8, 0, 0]} barSize={36} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="col-span-12 lg:col-span-4 glass-card p-5 rounded-[24px]">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="flex items-center gap-2 text-[16px] font-bold text-ink-800">
                    <PieChart size={18} className="text-nova-500" />
                    项目状态分布
                  </h3>
                  <span className="chip-nova !py-0.5 !px-2 !text-[10px]">共 16 项</span>
                </div>
                <div className="h-[220px] -mx-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <RePieChart>
                      <Pie
                        data={PIE_DATA}
                        cx="50%"
                        cy="50%"
                        innerRadius={46}
                        outerRadius={78}
                        paddingAngle={3}
                        dataKey="value"
                        stroke="#fff"
                        strokeWidth={2}
                      >
                        {PIE_DATA.map((entry, idx) => (
                          <Cell key={idx} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          borderRadius: 12,
                          fontSize: 12,
                          border: '1px solid rgba(255,255,255,0.9)',
                          background: 'rgba(255,255,255,0.96)',
                          boxShadow: '0 8px 24px rgba(15,23,42,0.12)',
                        }}
                        formatter={(v: any, n: any) => [`${v} 项`, n]}
                      />
                      <Legend
                        wrapperStyle={{ fontSize: 11 }}
                        formatter={(v) => <span className="text-ink-600 font-medium">{v}</span>}
                        iconType="circle"
                      />
                    </RePieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </motion.div>

            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: 0.22 }}
              className="glass-card p-5 md:p-6 rounded-[24px]"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="flex items-center gap-2 text-[17px] font-bold text-ink-800">
                  <LineChart size={19} className="text-energy-500" />
                  Top 20 · 能量币流水
                </h3>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-ink-400 font-mono">最近 48h</span>
                  <button className="btn-ghost !py-1.5 !px-2 text-[11px]">
                    导出 CSV
                    <ChevronRight size={12} />
                  </button>
                </div>
              </div>
              <div className="overflow-x-auto max-h-[420px] overflow-y-auto scroll-thin">
                <table className="w-full text-[13px] min-w-[680px]">
                  <thead className="sticky top-0 z-10 bg-gradient-to-b from-white/95 to-white/80 backdrop-blur-sm">
                    <tr className="text-[11px] text-ink-400 font-semibold uppercase tracking-wider">
                      <th className="text-left py-2.5 px-3 font-medium">时间</th>
                      <th className="text-left py-2.5 px-3 font-medium">小组</th>
                      <th className="text-left py-2.5 px-3 font-medium">来源</th>
                      <th className="text-right py-2.5 px-3 font-medium">±能量</th>
                      <th className="text-right py-2.5 px-3 font-medium">余额</th>
                      <th className="text-left py-2.5 px-3 font-medium">备注</th>
                    </tr>
                  </thead>
                  <tbody>
                    {TX_DATA.map((tx, i) => {
                      const sc = SOURCE_CONFIG[tx.source];
                      const SrcIcon = sc.icon;
                      const deltaCls = tx.delta >= 0 ? 'text-growth-700' : 'text-danger-700';
                      return (
                        <motion.tr
                          key={tx.id}
                          initial={{ opacity: 0, x: -8 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ duration: 0.3, delay: 0.24 + i * 0.025 }}
                          className="border-t border-ink-100/60 hover:bg-mission-50/30 transition"
                        >
                          <td className="py-2.5 px-3 font-mono text-[11.5px] text-ink-500 whitespace-nowrap">{tx.time}</td>
                          <td className="py-2.5 px-3">
                            <span className="font-semibold text-ink-700 whitespace-nowrap">{tx.group}</span>
                          </td>
                          <td className="py-2.5 px-3">
                            <span className={cn(sc.chip, '!py-0.5 !px-2 !text-[10.5px] inline-flex items-center gap-1')}>
                              <SrcIcon size={10} />
                              {sc.label}
                            </span>
                          </td>
                          <td className={cn('py-2.5 px-3 text-right font-bold tabular-nums ticker', deltaCls)}>
                            {formatCoinDelta(tx.delta)} ⚡
                          </td>
                          <td className="py-2.5 px-3 text-right font-bold tabular-nums text-ink-700">
                            {tx.balance.toLocaleString()}
                          </td>
                          <td className="py-2.5 px-3 text-[12px] text-ink-500">{tx.note}</td>
                        </motion.tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </motion.section>
          </div>

          <div className="col-span-12 xl:col-span-4 space-y-5">
            <motion.section
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.45, delay: 0.1 }}
              className="glass-card p-5 rounded-[24px] border border-danger-200/70 relative overflow-hidden"
              style={{ boxShadow: '0 0 0 1px rgba(240,68,56,0.15) inset, 0 0 40px rgba(240,68,56,0.06)' }}
            >
              <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full bg-danger-400/20 blur-xl pointer-events-none" />
              <div className="flex items-center gap-2.5 mb-4 relative z-10">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-danger-400 to-danger-600 flex items-center justify-center text-white shadow-lg shadow-danger-500/20 animate-pulse">
                  <AlertTriangle size={18} />
                </div>
                <div>
                  <h3 className="font-bold text-ink-800 text-[15px] flex items-center gap-1.5">
                    冻结项目预警
                    <span className="chip-danger !py-0.5 !px-2 !text-[10px]">{FROZEN_PROJECTS.length} 项</span>
                  </h3>
                  <p className="text-[11px] text-ink-400">超过 3 天未解冻将自动扣除押金</p>
                </div>
              </div>
              <div className="space-y-3 relative z-10">
                {FROZEN_PROJECTS.map((p, i) => (
                  <motion.div
                    key={p.id}
                    initial={{ opacity: 0, x: 8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: 0.15 + i * 0.05 }}
                    className="p-3.5 rounded-xl bg-gradient-to-br from-danger-50/80 via-white/60 to-alert-50/50 border border-danger-200/60 relative overflow-hidden"
                  >
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-danger-400 to-alert-500" />
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <h4 className="font-bold text-[13px] text-ink-800 leading-snug pr-2">{p.name}</h4>
                      <span className="chip-danger !py-0.5 !px-2 !text-[10px] shrink-0 whitespace-nowrap">
                        <Clock size={10} />
                        {p.frozenDays} 天
                      </span>
                    </div>
                    <p className="text-[11.5px] text-ink-500 mb-3 flex items-start gap-1">
                      <ShieldAlert size={12} className="mt-0.5 shrink-0 text-danger-500" />
                      {p.reason}
                    </p>
                    <button className="btn-mission w-full !py-2 !px-3 text-[12px]">
                      <Send size={12} />
                      一键提醒对应组长
                    </button>
                  </motion.div>
                ))}
              </div>
            </motion.section>

            <motion.section
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.45, delay: 0.18 }}
              className="glass-card p-5 rounded-[24px] relative overflow-hidden"
            >
              <div className="absolute -top-6 right-0 w-24 h-24 rounded-full bg-mission-400/15 blur-xl pointer-events-none" />
              <div className="flex items-center gap-2.5 mb-4 relative z-10">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-mission-400 to-mission-600 flex items-center justify-center text-white shadow-lg shadow-mission-500/20">
                  <FileCheck size={18} />
                </div>
                <div>
                  <h3 className="font-bold text-ink-800 text-[15px] flex items-center gap-1.5">
                    待审核题库
                    <span className="chip-mission !py-0.5 !px-2 !text-[10px]">{PENDING_QUESTIONS.length} 条</span>
                  </h3>
                  <p className="text-[11px] text-ink-400">一键通过将立即纳入挑战题库</p>
                </div>
              </div>
              <div className="space-y-3 relative z-10">
                {PENDING_QUESTIONS.map((q, i) => {
                  const diffColors = ['', 'chip-growth', 'chip-energy', 'chip-danger'];
                  const diffLabel = ['', '简单', '中等', '困难'];
                  return (
                    <motion.div
                      key={q.id}
                      initial={{ opacity: 0, x: 8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.3, delay: 0.22 + i * 0.05 }}
                      className="p-3 rounded-xl bg-gradient-to-br from-mission-50/60 to-white/70 border border-mission-100/60"
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-semibold text-mission-700 chip-mission !py-0.5 !px-2 !text-[10px]">{q.subject}</span>
                          <span className={cn(diffColors[q.difficulty], '!py-0.5 !px-2 !text-[10px]')}>
                            {diffLabel[q.difficulty]}
                          </span>
                        </div>
                        <span className="text-[11px] text-ink-400">by {q.author}</span>
                      </div>
                      <p className="text-[12.5px] text-ink-700 leading-snug line-clamp-2 mb-2.5">
                        {q.stem}
                      </p>
                      <div className="flex gap-2">
                        <button className="btn-growth flex-1 !py-1.5 !px-3 text-[11.5px]">
                          <CheckCircle2 size={12} />
                          通过
                        </button>
                        <button className="btn-ghost !py-1.5 !px-3 text-[11.5px]">详情</button>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </motion.section>

            <motion.section
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.45, delay: 0.26 }}
              className="glass-card p-5 rounded-[24px] relative overflow-hidden"
            >
              <div className="absolute -bottom-6 -left-6 w-24 h-24 rounded-full bg-alert-400/15 blur-xl pointer-events-none" />
              <div className="flex items-center gap-2.5 mb-4 relative z-10">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-alert-400 to-energy-500 flex items-center justify-center text-white shadow-lg shadow-energy-500/20">
                  <TimerReset size={18} />
                </div>
                <div>
                  <h3 className="font-bold text-ink-800 text-[15px] flex items-center gap-1.5">
                    招募异常超时
                    <span className="chip-alert !py-0.5 !px-2 !text-[10px]">{OVERDUE_RECRUITS.length} 条</span>
                  </h3>
                  <p className="text-[11px] text-ink-400">超过 7 天无裁决 → 系统自动结算</p>
                </div>
              </div>
              <div className="space-y-3 relative z-10">
                {OVERDUE_RECRUITS.map((r, i) => (
                  <motion.div
                    key={r.id}
                    initial={{ opacity: 0, x: 8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: 0.3 + i * 0.05 }}
                    className="p-3 rounded-xl bg-gradient-to-br from-alert-50/70 via-white/60 to-energy-50/40 border border-alert-200/60"
                  >
                    <div className="flex items-start justify-between mb-1.5">
                      <h4 className="font-bold text-[13px] text-ink-800 leading-snug">{r.title}</h4>
                      <span className="chip-alert !py-0.5 !px-2 !text-[10px] shrink-0 whitespace-nowrap">
                        <Activity size={10} />
                        {r.postedDays} 天
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-ink-500 mb-2.5">
                      <span>发布方：{r.owner}</span>
                      <span className="flex items-center gap-1">
                        <Users size={10} />
                        {r.bids} 人已投
                      </span>
                    </div>
                    <button className="btn-energy w-full !py-2 !px-3 text-[12px]">
                      <TimerReset size={12} />
                      自动结算提醒
                    </button>
                  </motion.div>
                ))}
              </div>
            </motion.section>
          </div>
        </div>
      </div>
    </MissionShell>
  );
}

function NumTicker({ val }: { val: number }) {
  const v = useTicker(val);
  return <span className="ticker tabular-nums">{v}</span>;
}
