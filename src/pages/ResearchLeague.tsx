import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Trophy,
  Crown,
  Star,
  TrendingUp,
  TrendingDown,
  Minus,
  Zap,
  Target,
  Medal,
  Sparkles,
  Flame,
  Award,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import MissionShell from '@/components/layout/MissionShell';
import AvatarStack from '@/components/ui/AvatarStack';
import { useGroupStore } from '@/store/groupStore';
import { User } from '@/data/mockData';
import { cn } from '@/lib/utils';

type TabKey = 'total' | 'month' | 'week' | 'personal';

const TABS: Array<{ key: TabKey; label: string }> = [
  { key: 'total', label: '小组总榜' },
  { key: 'month', label: '月榜' },
  { key: 'week', label: '周榜' },
  { key: 'personal', label: '个人榜' },
];

const GROUP_COLORS = [
  { main: '#4F7CFF', light: '#8FAEFF', grad: 'from-mission-400 to-mission-600' },
  { main: '#FF8A34', light: '#FFC695', grad: 'from-energy-400 to-energy-600' },
  { main: '#22C55E', light: '#6CE9A6', grad: 'from-growth-400 to-growth-600' },
  { main: '#8B5CF6', light: '#B692F6', grad: 'from-nova-400 to-nova-600' },
  { main: '#F59E0B', light: '#FACD64', grad: 'from-alert-400 to-alert-600' },
  { main: '#06B6D4', light: '#67E8F9', grad: 'from-cyan-400 to-cyan-600' },
];

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

function buildSeasonTrend() {
  const days: Array<Record<string, any>> = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000);
    const label = `${d.getMonth() + 1}/${d.getDate()}`;
    const base = [6800, 6200, 5600, 5100, 4700, 4300];
    const row: Record<string, any> = { date: label };
    ['牛顿先锋队', '麦克斯韦闪电队', '爱因斯坦脑洞组', '特斯拉电流团', '伽利略观测站', '薛定谔猫队'].forEach((name, gi) => {
      const seed = (gi * 7 + i * 3) % 11;
      row[name] = Math.round(base[gi] + seed * 23 + Math.sin(i * 0.3 + gi) * 120);
    });
    days.push(row);
  }
  return days;
}

const GROUP_NAMES6 = ['牛顿先锋队', '麦克斯韦闪电队', '爱因斯坦脑洞组', '特斯拉电流团', '伽利略观测站', '薛定谔猫队'];

interface LeaderEntry {
  rank: number;
  groupId: string;
  name: string;
  level: number;
  coins: number;
  projects: number;
  delta: number;
}

function buildLeaderboard(users: User[], groups: any[]): LeaderEntry[] {
  const baseCoins = [6820, 6410, 5860, 5320, 4980, 4710, 4380, 4120, 3950, 3720];
  const baseProjects = [8, 7, 6, 6, 5, 5, 4, 4, 4, 3];
  const deltas = [+12, +8, +5, +2, 0, -1, -3, +1, 0, -2];
  const entries: LeaderEntry[] = [];
  for (let i = 0; i < 10; i++) {
    const gi = i % 6;
    const group = groups[gi];
    entries.push({
      rank: i + 1,
      groupId: group.id,
      name: GROUP_NAMES6[gi] + (i >= 6 ? ` · 分队` : ''),
      level: 10 - i,
      coins: baseCoins[i],
      projects: baseProjects[i],
      delta: deltas[i],
    });
  }
  return entries;
}

export default function ResearchLeague() {
  const { groups, users } = useGroupStore();
  const [tab, setTab] = useState<TabKey>('total');
  const trendData = useMemo(() => buildSeasonTrend(), []);
  const leaderboard = useMemo(() => buildLeaderboard(users, groups), [users, groups]);

  const top3 = leaderboard.slice(0, 3);
  const rest = leaderboard.slice(3);
  const maxCoins = leaderboard[0].coins;

  return (
    <MissionShell>
      <div className="space-y-6">
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="glass-card p-6 md:p-8 rounded-[28px] relative overflow-hidden"
        >
          <div className="absolute -top-10 right-10 w-64 h-64 rounded-full bg-alert-400/10 blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-20 w-80 h-80 rounded-full bg-nova-400/10 blur-3xl pointer-events-none" />
          <div className="relative z-10">
            <div className="flex flex-wrap items-center gap-3 mb-3">
              <span className="mission-label">
                <Star size={12} />
                LEADERBOARD · SEASON 2026 SPRING
              </span>
              <span className="chip-energy">
                <Flame size={11} />
                赛季剩余 42 天
              </span>
            </div>
            <div className="flex flex-wrap items-end justify-between gap-6">
              <div>
                <h1 className="text-[32px] md:text-[36px] font-extrabold text-ink-900 leading-[1.1] tracking-tight">
                  Research League
                  <span className="block text-gradient-mission mt-1">科研联赛榜</span>
                </h1>
                <p className="mt-2 text-[14px] text-ink-500 max-w-lg">
                  能量币、项目交付、挑战胜率共同决定的赛季排名。前三甲将获得年度学术晚宴邀请函 🏆
                </p>
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
          </div>
        </motion.section>

        <div className="grid grid-cols-12 gap-6">
          <div className="col-span-12 xl:col-span-8 space-y-6">
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.08 }}
              className="glass-card p-6 md:p-8 rounded-[28px] relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-grid-fine opacity-40 pointer-events-none" />
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="flex items-center gap-2 text-[18px] font-bold text-ink-800">
                    <Trophy size={22} className="text-alert-500" />
                    TOP 3 · 领奖台
                  </h2>
                  <span className="chip-nova">Season Finalist</span>
                </div>

                <div className="flex items-end justify-center gap-4 md:gap-8 pt-10">
                  {[1, 0, 2].map((orderIdx, displayIdx) => {
                    const entry = top3[orderIdx];
                    if (!entry) return null;
                    const gi = orderIdx;
                    const podiumClass =
                      orderIdx === 0
                        ? 'podium-gold'
                        : orderIdx === 1
                          ? 'podium-silver'
                          : 'podium-bronze';
                    const heights = ['h-56 md:h-64', 'h-44 md:h-52', 'h-36 md:h-44'];
                    const members = users.filter((u) => u.groupId === entry.groupId).slice(0, 5);
                    const medals = [
                      { icon: Crown, size: 32 },
                      { icon: Medal, size: 26 },
                      { icon: Award, size: 24 },
                    ];
                    const MedalIcon = medals[orderIdx].icon;
                    return (
                      <motion.div
                        key={entry.groupId + orderIdx}
                        initial={{ opacity: 0, y: 40 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.15 + displayIdx * 0.1, type: 'spring' }}
                        className="flex flex-col items-center flex-1 max-w-[220px] relative"
                      >
                        {orderIdx === 0 && (
                          <>
                            <div className="absolute -top-8 left-1/2 -translate-x-1/2 flex items-center gap-6 pointer-events-none">
                              <motion.div
                                animate={{ opacity: [0.4, 1, 0.4], scale: [0.9, 1.1, 0.9] }}
                                transition={{ duration: 2.2, repeat: Infinity }}
                                className="w-3 h-3 rounded-full bg-mission-400 shadow-[0_0_12px_rgba(79,124,255,0.8)]"
                              />
                              <motion.div
                                animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1.2, 0.8] }}
                                transition={{ duration: 1.8, repeat: Infinity, delay: 0.3 }}
                                className="w-2.5 h-2.5 rounded-full bg-nova-400 shadow-[0_0_10px_rgba(139,92,246,0.8)]"
                              />
                            </div>
                            <div className="absolute -top-14 -left-4 w-6 h-6 md:-left-6">
                              <Sparkles size={24} className="text-alert-400 animate-floatY drop-shadow-[0_0_8px_rgba(245,158,11,0.6)]" />
                            </div>
                            <div className="absolute -top-12 -right-4 w-6 h-6 md:-right-6">
                              <Sparkles size={22} className="text-energy-400 animate-floatY drop-shadow-[0_0_8px_rgba(255,138,52,0.6)]" style={{ animationDelay: '0.8s' }} />
                            </div>
                          </>
                        )}

                        <div
                          className={cn(
                            'w-14 h-14 md:w-16 md:h-16 rounded-2xl shadow-lg flex items-center justify-center relative mb-2',
                            orderIdx === 0
                              ? 'bg-gradient-to-br from-alert-400 to-energy-500 text-white scale-110'
                              : orderIdx === 1
                                ? 'bg-gradient-to-br from-ink-300 to-ink-500 text-white'
                                : 'bg-gradient-to-br from-orange-400 to-orange-600 text-white'
                          )}
                        >
                          <MedalIcon size={medals[orderIdx].size} strokeWidth={2.4} />
                          {orderIdx === 0 && (
                            <>
                              <div className="absolute -inset-2 rounded-2xl bg-alert-400/20 blur-lg -z-10 animate-pulse" />
                              <div className="absolute -top-5 left-1/2 -translate-x-1/2">
                                <div className="text-alert-500 animate-floatY">
                                  <Crown size={28} className="drop-shadow-[0_2px_8px_rgba(245,158,11,0.5)]" />
                                </div>
                              </div>
                            </>
                          )}
                        </div>

                        <AvatarStack users={members} max={5} size={28} className="mb-2" />
                        <div className="font-bold text-[13px] md:text-[14px] text-ink-800 text-center leading-tight mb-1">
                          {entry.name}
                        </div>
                        <span className="chip-mission !py-0.5 !px-2 mb-2 text-[10px]">
                          LV {entry.level}
                        </span>
                        <div className="flex items-center gap-1 mb-1">
                          <Zap size={14} className="text-energy-500 fill-energy-400/40" />
                          <CoinsTicker target={entry.coins} />
                        </div>
                        <div className="flex items-center gap-1 text-[11px] text-ink-500 mb-3">
                          <Target size={11} />
                          完成项目 <span className="font-bold text-ink-700 tabular-nums"><ProjectsTicker target={entry.projects} /></span>
                        </div>

                        <div className={cn('w-full rounded-t-2xl relative overflow-hidden', podiumClass, heights[orderIdx])}>
                          <div className="absolute inset-0 bg-gradient-to-t from-transparent via-white/10 to-white/30" />
                          <div className="absolute inset-x-0 top-0 h-1/3 bg-gradient-to-b from-white/40 to-transparent" />
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="text-[48px] md:text-[56px] font-black text-white/80 tracking-tighter tabular-nums drop-shadow-lg">
                              #{entry.rank}
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            </motion.section>

            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="glass-card p-5 md:p-6 rounded-[24px]"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="flex items-center gap-2 text-[16px] font-bold text-ink-800">
                  <Target size={18} className="text-mission-500" />
                  名次 4 ~ 10
                </h3>
                <span className="text-[11px] text-ink-400 font-mono">RANK 04 → 10</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-[13px]">
                  <thead>
                    <tr className="text-[11px] text-ink-400 font-semibold uppercase tracking-wider">
                      <th className="text-left py-3 px-3 font-medium">名次</th>
                      <th className="text-left py-3 px-3 font-medium">小组</th>
                      <th className="text-left py-3 px-3 font-medium">等级</th>
                      <th className="text-left py-3 px-3 font-medium">能量 ⚡</th>
                      <th className="text-left py-3 px-3 font-medium">完成</th>
                      <th className="text-right py-3 px-3 font-medium">环比</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rest.map((e, i) => {
                      const members = users.filter((u) => u.groupId === e.groupId).slice(0, 3);
                      const gi = i % 6;
                      const c = GROUP_COLORS[gi];
                      const pct = Math.round((e.coins / maxCoins) * 100);
                      const arrow =
                        e.delta > 0 ? (
                          <TrendingUp size={13} className="text-growth-600" />
                        ) : e.delta < 0 ? (
                          <TrendingDown size={13} className="text-danger-600" />
                        ) : (
                          <Minus size={13} className="text-ink-400" />
                        );
                      const deltaCls =
                        e.delta > 0 ? 'text-growth-700' : e.delta < 0 ? 'text-danger-700' : 'text-ink-400';
                      return (
                        <motion.tr
                          key={e.rank}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ duration: 0.35, delay: 0.25 + i * 0.05 }}
                          className="border-t border-ink-100/60 hover:bg-mission-50/30 transition rounded-lg"
                        >
                          <td className="py-3 px-3">
                            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-ink-100 to-ink-200 flex items-center justify-center font-black text-ink-600 tabular-nums text-[14px]">
                              {e.rank}
                            </div>
                          </td>
                          <td className="py-3 px-3">
                            <div className="flex items-center gap-3">
                              <AvatarStack users={members} max={2} size={24} />
                              <span className="font-semibold text-ink-800">{e.name}</span>
                            </div>
                          </td>
                          <td className="py-3 px-3">
                            <span
                              className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold text-white"
                              style={{
                                background: `linear-gradient(135deg, ${c.main}, ${c.light})`,
                              }}
                            >
                              LV {e.level}
                            </span>
                          </td>
                          <td className="py-3 px-3">
                            <div className="flex items-center gap-3 min-w-[180px]">
                              <span className="ticker tabular-nums font-bold text-ink-800 w-16">
                                {e.coins.toLocaleString()}
                              </span>
                              <div className="flex-1 h-2 rounded-full bg-ink-100 overflow-hidden">
                                <div
                                  className="h-full rounded-full"
                                  style={{
                                    width: `${pct}%`,
                                    background: `linear-gradient(90deg, ${c.main}, ${GROUP_COLORS[(gi + 1) % 6].main})`,
                                  }}
                                />
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-3">
                            <span className="chip-growth !py-0.5 !px-2 text-[11px]">
                              {e.projects} 项
                            </span>
                          </td>
                          <td className="py-3 px-3 text-right">
                            <div className={cn('flex items-center justify-end gap-1 font-bold tabular-nums', deltaCls)}>
                              {arrow}
                              {e.delta > 0 ? `+${e.delta}` : e.delta}
                            </div>
                          </td>
                        </motion.tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </motion.section>
          </div>

          <div className="col-span-12 xl:col-span-4 space-y-6">
            <motion.section
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.15 }}
              className="glass-card p-5 rounded-[24px]"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="flex items-center gap-2 text-[15px] font-bold text-ink-800">
                  <TrendingUp size={18} className="text-mission-500" />
                  Season Trends
                </h3>
                <span className="text-[10px] font-mono text-ink-400">30D</span>
              </div>
              <div className="h-[260px] -mx-3">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trendData} margin={{ top: 8, right: 12, left: -12, bottom: 0 }}>
                    <defs>
                      {GROUP_NAMES6.map((n, i) => {
                        const c = GROUP_COLORS[i];
                        return (
                          <linearGradient key={n} id={`grad-${i}`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={c.main} stopOpacity={0.45} />
                            <stop offset="100%" stopColor={c.main} stopOpacity={0} />
                          </linearGradient>
                        );
                      })}
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 10, fill: '#94A3B8' }}
                      tickLine={false}
                      axisLine={false}
                      interval={6}
                    />
                    <YAxis
                      tick={{ fontSize: 10, fill: '#94A3B8' }}
                      tickLine={false}
                      axisLine={false}
                      width={42}
                      tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                    />
                    <Tooltip
                      contentStyle={{
                        borderRadius: 14,
                        border: '1px solid rgba(255,255,255,0.9)',
                        background: 'rgba(255,255,255,0.95)',
                        backdropFilter: 'blur(12px)',
                        boxShadow: '0 12px 40px rgba(15,23,42,0.12)',
                        fontSize: 12,
                      }}
                      labelStyle={{ fontWeight: 700, color: '#1E293B', marginBottom: 6 }}
                      formatter={(value: any, name: any) => [`${Number(value).toLocaleString()} ⚡`, name]}
                    />
                    {GROUP_NAMES6.map((n, i) => {
                      const c = GROUP_COLORS[i];
                      return (
                        <Area
                          key={n}
                          type="monotone"
                          dataKey={n}
                          stroke={c.main}
                          strokeWidth={2.2}
                          fill={`url(#grad-${i})`}
                          dot={false}
                          activeDot={{ r: 4, strokeWidth: 2, stroke: '#fff' }}
                        />
                      );
                    })}
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-2 mt-3">
                {GROUP_NAMES6.slice(0, 6).map((n, i) => {
                  const c = GROUP_COLORS[i];
                  return (
                    <div key={n} className="flex items-center gap-1.5">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ background: c.main }}
                      />
                      <span className="text-[11px] text-ink-600 font-medium">{n.slice(0, 4)}</span>
                    </div>
                  );
                })}
              </div>
            </motion.section>

            <motion.section
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.25 }}
              className="glass-card p-5 rounded-[24px] relative overflow-hidden"
            >
              <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full bg-mission-400/20 blur-xl pointer-events-none" />
              <div className="absolute -bottom-6 -left-6 w-24 h-24 rounded-full bg-nova-400/20 blur-xl pointer-events-none" />
              <div
                className="absolute inset-0 rounded-[24px] pointer-events-none"
                style={{
                  boxShadow:
                    '0 0 0 1px rgba(79,124,255,0.2) inset, 0 0 40px rgba(79,124,255,0.1), 0 0 40px rgba(139,92,246,0.08)',
                }}
              />
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="flex items-center gap-2 text-[15px] font-bold text-ink-800">
                    <Flame size={18} className="text-energy-500" />
                    Most Valuable Teams
                  </h3>
                  <span className="chip-growth !py-0.5 !px-2 text-[10px]">本周 MVP</span>
                </div>
                <div className="space-y-3">
                  {[
                    { idx: 0, highlight: '挑战胜率 92%', feat: '电磁学高阶对决五连胜' },
                    { idx: 1, highlight: '交付速度 +32%', feat: '驻波项目提前 5 天结题' },
                    { idx: 2, highlight: '组员协作 4.9★', feat: '跨组招募 6 次零差评' },
                  ].map((row, i) => {
                    const gi = row.idx;
                    const g = groups[gi];
                    const members = users.filter((u) => u.groupId === g.id).slice(0, 5);
                    const c = GROUP_COLORS[gi];
                    return (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, x: 10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.35, delay: 0.3 + i * 0.06 }}
                        className="p-3.5 rounded-2xl bg-gradient-to-br from-white/80 to-mission-50/40 border border-mission-100/60 relative overflow-hidden"
                      >
                        <div
                          className="absolute left-0 top-0 bottom-0 w-1.5"
                          style={{
                            background: `linear-gradient(180deg, ${c.main}, ${c.light})`,
                          }}
                        />
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <div
                              className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-black shrink-0 shadow-md"
                              style={{
                                background: `linear-gradient(135deg, ${c.main}, ${c.light})`,
                              }}
                            >
                              {String.fromCharCode(65 + gi)}
                            </div>
                            <div className="min-w-0">
                              <div className="font-bold text-[13px] text-ink-800 truncate">
                                {GROUP_NAMES6[gi]}
                              </div>
                              <div className="text-[11px] text-ink-500 mt-0.5">{row.highlight}</div>
                            </div>
                          </div>
                          <span className="chip-energy !py-0.5 !px-2 text-[10px] shrink-0">
                            #{i + 1}
                          </span>
                        </div>
                        <div className="flex items-center justify-between mt-3">
                          <AvatarStack users={members} max={4} size={24} />
                          <span className="text-[11px] text-ink-500 truncate ml-2">{row.feat}</span>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            </motion.section>
          </div>
        </div>
      </div>
    </MissionShell>
  );
}

function CoinsTicker({ target }: { target: number }) {
  const val = useTicker(target);
  return (
    <span className="ticker ticker-anim text-[20px] font-extrabold text-gradient-energy tabular-nums leading-none">
      {val.toLocaleString()}
    </span>
  );
}

function ProjectsTicker({ target }: { target: number }) {
  const val = useTicker(target, 600);
  return (
    <span className="ticker ticker-anim tabular-nums">{val}</span>
  );
}
