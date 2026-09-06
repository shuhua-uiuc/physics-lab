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
import { classesApi } from '@/lib/apiService';
import { User, SchoolClass } from '@/data/mockData';
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

export default function ResearchLeague() {
  const { groups, users } = useGroupStore();
  const [tab, setTab] = useState<TabKey>('total');
  const trendData = useMemo(() => buildSeasonTrend(), []);

  const [classes, setClasses] = useState<SchoolClass[]>([]);
  useEffect(() => {
    classesApi.list().then(setClasses).catch(() => {});
  }, []);
  const classesById = useMemo(() => Object.fromEntries(classes.map((c) => [c.id, c.name])), [classes]);

  // 真实小组能量榜：按班级分组，组内按能量币降序
  const rankingByClass = useMemo(() => {
    const map: Record<string, { classId: string; className: string; rows: { groupId: string; name: string; coins: number; memberCount: number }[] }> = {};
    for (const g of groups) {
      const memberCount = users.filter((u) => u.groupId === g.id).length;
      if (memberCount === 0) continue;
      const cid = g.classId || 'unknown';
      if (!map[cid]) map[cid] = { classId: cid, className: classesById[cid] || cid, rows: [] };
      map[cid].rows.push({ groupId: g.id, name: g.name, coins: g.totalCoins, memberCount });
    }
    return Object.values(map)
      .map((c) => ({ ...c, rows: [...c.rows].sort((a, b) => b.coins - a.coins) }))
      .sort((a, b) => a.className.localeCompare(b.className));
  }, [groups, users, classesById]);

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
            <div className="space-y-5">
              {rankingByClass.length === 0 ? (
                <div className="glass-card p-10 text-center text-ink-400 text-[13px]">暂无已成组小组</div>
              ) : (
                rankingByClass.map((cls) => (
                  <motion.section
                    key={cls.classId}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4 }}
                    className="glass-card p-5 md:p-6 rounded-[24px]"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="flex items-center gap-2 text-[16px] font-bold text-ink-800">
                        <Trophy size={18} className="text-alert-500" />
                        {cls.className}
                      </h3>
                      <span className="text-[11px] text-ink-400">{cls.rows.length} 个小组 · 按能量币排序</span>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-[13px]">
                        <thead>
                          <tr className="text-[11px] text-ink-400 font-semibold uppercase tracking-wider">
                            <th className="text-left py-3 px-2 font-medium">名次</th>
                            <th className="text-left py-3 px-2 font-medium">小组</th>
                            <th className="text-left py-3 px-2 font-medium">组员</th>
                            <th className="text-right py-3 px-2 font-medium">能量 ⚡</th>
                          </tr>
                        </thead>
                        <tbody>
                          {cls.rows.map((r, i) => (
                            <motion.tr
                              key={r.groupId}
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ duration: 0.35, delay: 0.15 + i * 0.05 }}
                              className="border-t border-ink-100/60 hover:bg-mission-50/30 transition rounded-lg"
                            >
                              <td className="py-3 px-2">
                                <div className={cn(
                                  'w-8 h-8 rounded-xl flex items-center justify-center font-black tabular-nums text-[14px]',
                                  i === 0 ? 'bg-gradient-to-br from-alert-400 to-energy-500 text-white' :
                                  i === 1 ? 'bg-gradient-to-br from-ink-300 to-ink-500 text-white' :
                                  i === 2 ? 'bg-gradient-to-br from-orange-400 to-orange-600 text-white' :
                                  'bg-ink-100 text-ink-600'
                                )}>
                                  {i + 1}
                                </div>
                              </td>
                              <td className="py-3 px-2 font-semibold text-ink-800">{r.name}</td>
                              <td className="py-3 px-2 text-ink-500">{r.memberCount} 人</td>
                              <td className="py-3 px-2 text-right font-bold tabular-nums text-ink-800">
                                {r.coins.toLocaleString()} ⚡
                              </td>
                            </motion.tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </motion.section>
                ))
              )}
            </div>
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
