import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, TrendingUp, TrendingDown, Minus, Award, Coins, Users, User } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { cn } from '@/lib/utils';
import { useGroupStore } from '@/store/groupStore';
import { useCoinStore } from '@/store/coinStore';
import { CoinTransaction } from '@/data/mockData';

type TabKey = 'total' | 'month' | 'week' | 'personal';

const TABS: { key: TabKey; label: string; icon: typeof Users }[] = [
  { key: 'total', label: '小组总榜', icon: Users },
  { key: 'month', label: '小组月榜', icon: Users },
  { key: 'week', label: '小组周榜', icon: Users },
  { key: 'personal', label: '个人榜', icon: User },
];

function CoinBadge({ value, size = 'md', spin = false }: { value: number; size?: 'sm' | 'md' | 'lg'; spin?: boolean }) {
  const sizeCls = size === 'sm' ? 'text-xs px-2 py-0.5' : size === 'lg' ? 'text-base px-3 py-1' : 'text-sm px-2.5 py-1';
  return (
    <span className={cn('chip-energy font-mono font-semibold', sizeCls)}>
      <Coins className={cn('w-3.5 h-3.5', spin && 'animate-coinSpin')} />
      {value.toLocaleString()}
    </span>
  );
}

function Avatar({ src, name, size = 40, ring = false }: { src: string; name: string; size?: number; ring?: boolean }) {
  return (
    <div
      className={cn(
        'rounded-full overflow-hidden flex-shrink-0 bg-physics-100',
        ring && 'ring-2 ring-white shadow-md'
      )}
      style={{ width: size, height: size }}
    >
      {src ? (
        <img src={src} alt={name} className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full flex items-center justify-center text-physics-600 font-bold text-sm">
          {name.slice(0, 1)}
        </div>
      )}
    </div>
  );
}

function DeltaBadge({ delta }: { delta: number }) {
  if (delta === 0) {
    return <span className="inline-flex items-center gap-0.5 text-ink-500 text-xs"><Minus className="w-3 h-3" />持平</span>;
  }
  if (delta > 0) {
    return <span className="inline-flex items-center gap-0.5 text-lab-600 text-xs font-semibold"><TrendingUp className="w-3 h-3" />+{delta}</span>;
  }
  return <span className="inline-flex items-center gap-0.5 text-risk-600 text-xs font-semibold"><TrendingDown className="w-3 h-3" />{delta}</span>;
}

export default function CoinRank() {
  const [tab, setTab] = useState<TabKey>('total');
  const { groups, users, getGroupUsers } = useGroupStore();
  const { coinTxs, getRankings } = useCoinStore();

  const now = Date.now();
  const thirtyDaysAgo = now - 30 * 86400000;
  const sevenDaysAgo = now - 7 * 86400000;
  const thirtyDaysAgoMonth = now - 60 * 86400000;

  const filterTxs = (txs: CoinTransaction[], since: number) =>
    txs.filter((t) => new Date(t.createdAt).getTime() >= since);

  const sumDeltaByGroup = (txs: CoinTransaction[]) => {
    const map: Record<string, number> = {};
    txs.forEach((t) => {
      map[t.groupId] = (map[t.groupId] || 0) + t.delta;
    });
    return map;
  };

  const sumDeltaByUser = (txs: CoinTransaction[]) => {
    const map: Record<string, number> = {};
    txs.forEach((t) => {
      if (t.userId) map[t.userId] = (map[t.userId] || 0) + t.delta;
    });
    return map;
  };

  const monthSums = useMemo(() => sumDeltaByGroup(filterTxs(coinTxs, thirtyDaysAgo)), [coinTxs]);
  const weekSums = useMemo(() => sumDeltaByGroup(filterTxs(coinTxs, sevenDaysAgo)), [coinTxs]);
  const prevMonthSums = useMemo(() => sumDeltaByGroup(filterTxs(coinTxs.filter((t) => new Date(t.createdAt).getTime() < thirtyDaysAgo), thirtyDaysAgoMonth)), [coinTxs]);
  const personalSums = useMemo(() => sumDeltaByUser(filterTxs(coinTxs, thirtyDaysAgo)), [coinTxs]);

  const groupRankings = useMemo(() => {
    const base = getRankings().groupRanking.map((r) => ({ ...r }));
    if (tab === 'month') {
      return base
        .map((r) => ({ ...r, totalCoins: monthSums[r.groupId] || 0 }))
        .sort((a, b) => b.totalCoins - a.totalCoins)
        .map((r, i) => ({ ...r, rank: i + 1 }));
    }
    if (tab === 'week') {
      return base
        .map((r) => ({ ...r, totalCoins: weekSums[r.groupId] || 0 }))
        .sort((a, b) => b.totalCoins - a.totalCoins)
        .map((r, i) => ({ ...r, rank: i + 1 }));
    }
    return base;
  }, [tab, getRankings, monthSums, weekSums]);

  const personalRankings = useMemo(() => {
    return users
      .map((u) => ({
        userId: u.id,
        name: u.name,
        avatar: u.avatar,
        groupId: u.groupId,
        totalCoins: u.personalCoins + (personalSums[u.id] || 0),
        rank: 0,
      }))
      .sort((a, b) => b.totalCoins - a.totalCoins)
      .map((r, i) => ({ ...r, rank: i + 1 }));
  }, [users, personalSums]);

  const listData = tab === 'personal' ? personalRankings : groupRankings;
  const top3 = listData.slice(0, 3);
  const rest = listData.slice(3);

  const getGroupById = (id: string) => groups.find((g) => g.id === id);
  const getGroupDelta = (gid: string) => {
    const cur = monthSums[gid] || 0;
    const prev = prevMonthSums[gid] || 0;
    return cur - prev;
  };

  const chartData = useMemo(() => {
    const days: { day: string; [key: string]: number | string }[] = [];
    for (let d = 29; d >= 0; d--) {
      const date = new Date(now - d * 86400000);
      const dayKey = `${date.getMonth() + 1}/${date.getDate()}`;
      const dayObj: { day: string; [key: string]: number | string } = { day: dayKey };
      const dayStart = new Date(date);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(date);
      dayEnd.setHours(23, 59, 59, 999);
      groups.forEach((g) => {
        const initials = coinTxs.filter((t) => t.groupId === g.id && new Date(t.createdAt).getTime() <= dayEnd.getTime());
        const sum = initials.reduce((acc, t) => acc + t.delta, 0);
        dayObj[g.name] = sum;
      });
      days.push(dayObj);
    }
    return days;
  }, [groups, coinTxs]);

  const chartColors = ['#0D47A1', '#FF6B35', '#00BFA5', '#7C4DFF', '#E53935', '#FF9800'];

  return (
    <div className="w-full space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="page-title">能量币中心</h1>
          <p className="text-ink-500 text-sm mt-1">班级能量币排行与流通趋势</p>
        </div>
        <div className="card-base px-4 py-2 flex items-center gap-2">
          <Coins className="w-5 h-5 text-energy-500 animate-coinSpin" />
          <div>
            <div className="text-xs text-ink-500">流通总量</div>
            <div className="font-mono font-bold text-energy-600">
              {groups.reduce((s, g) => s + g.totalCoins, 0).toLocaleString()}
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {TABS.map((t) => {
          const Icon = t.icon;
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={cn(
                'btn gap-1.5',
                active
                  ? 'bg-grad-physics text-white shadow-md'
                  : 'bg-white border border-physics-100 text-physics-600 hover:bg-physics-50'
              )}
            >
              <Icon className="w-4 h-4" />
              {t.label}
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 card-base p-6">
          <h2 className="section-title mb-6 flex items-center gap-2">
            <Trophy className="w-5 h-5 text-energy-500" />
            {tab === 'personal' ? '个人能量币 Top 3' : '小组能量币 Top 3'}
          </h2>

          <div className="flex items-end justify-center gap-4 md:gap-8 pt-16 pb-4 relative">
            <div
              className="absolute inset-x-0 top-0 h-48 opacity-50 pointer-events-none"
              style={{
                background:
                  'radial-gradient(ellipse at 50% 0%, rgba(255,200,80,0.35) 0%, transparent 55%), radial-gradient(ellipse at 30% 20%, rgba(255,150,150,0.18), transparent 50%), radial-gradient(ellipse at 70% 20%, rgba(150,200,255,0.18), transparent 50%)',
              }}
            />

            {top3.length < 3 &&
              Array.from({ length: 3 - top3.length }).map((_, i) => (
                <div key={`empty-${i}`} className="w-28 md:w-32" />
              ))}

            {[top3[1], top3[0], top3[2]].filter(Boolean).map((item, idx) => {
              if (!item) return null;
              const realRank = idx === 0 ? 2 : idx === 1 ? 1 : 3;
              const heights = ['h-28 md:h-32', 'h-40 md:h-48', 'h-24 md:h-28'];
              const heightCls = heights[idx];
              const medals = ['from-slate-200 to-slate-400 text-slate-700', 'from-yellow-300 to-amber-500 text-amber-900', 'from-orange-300 to-amber-700 text-amber-950'];
              const medalCls = medals[idx];
              const isPersonal = 'avatar' in item;
              const groupLogo = !isPersonal ? getGroupById(item.groupId)?.logo : undefined;
              const avatar = isPersonal ? (item as any).avatar : undefined;
              const name = item.name;

              return (
                <motion.div
                  key={item.rank}
                  initial={{ opacity: 0, y: 40 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  className="flex flex-col items-center relative z-10"
                >
                  <div className="relative mb-3">
                    {realRank === 1 && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.3, type: 'spring' }}
                        className="absolute -top-10 left-1/2 -translate-x-1/2"
                      >
                        <Trophy className="w-10 h-10 md:w-12 md:h-12 text-amber-400 drop-shadow-lg" strokeWidth={2} />
                      </motion.div>
                    )}
                    <div className="relative">
                      <Avatar
                        src={avatar || `https://api.dicebear.com/7.x/shapes/svg?seed=${isPersonal ? (item as any).userId : item.groupId}&backgroundColor=${(groupLogo || '#0D47A1').replace('#', '')}`}
                        name={name}
                        size={realRank === 1 ? 80 : 60}
                        ring
                      />
                      {realRank === 1 && (
                        <>
                          <motion.div
                            className="absolute -top-2 -right-2"
                            animate={{ rotateY: 360 }}
                            transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
                          >
                            <Coins className="w-5 h-5 text-yellow-400 drop-shadow" />
                          </motion.div>
                          <motion.div
                            className="absolute -bottom-1 -left-3"
                            animate={{ rotateY: 360 }}
                            transition={{ duration: 4, repeat: Infinity, ease: 'linear', delay: 0.7 }}
                          >
                            <Coins className="w-4 h-4 text-amber-300 drop-shadow" />
                          </motion.div>
                        </>
                      )}
                      {realRank !== 1 && (
                        <motion.div
                          className="absolute -top-1 -right-1"
                          animate={{ rotateY: 360 }}
                          transition={{ duration: 5, repeat: Infinity, ease: 'linear' }}
                        >
                          <Coins className="w-3.5 h-3.5 text-yellow-300" />
                        </motion.div>
                      )}
                    </div>
                  </div>

                  <div className="mb-2 text-center">
                    <div className="font-semibold text-physics-900 text-sm md:text-base">{name}</div>
                    <div className="mt-1 flex justify-center">
                      <CoinBadge value={(item as any).totalCoins || 0} size="sm" />
                    </div>
                  </div>

                  <div
                    className={cn(
                      'w-28 md:w-32 rounded-t-xl bg-gradient-to-t flex items-start justify-center pt-3 relative overflow-hidden',
                      heightCls,
                      medalCls
                    )}
                    style={{ boxShadow: 'inset 0 -6px 0 rgba(0,0,0,0.12), 0 -2px 12px rgba(0,0,0,0.06)' }}
                  >
                    <Award className={cn('w-7 h-7 md:w-8 md:h-8', realRank === 1 ? 'text-amber-100' : 'text-white/80')} strokeWidth={2.2} />
                    <div className="absolute bottom-2 font-bold text-white/70 text-lg md:text-xl font-mono">
                      {realRank}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>

          <div className="mt-6 border-t border-physics-100 pt-4">
            <div className="overflow-x-auto scroll-thin">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-ink-500 text-xs border-b border-physics-100">
                    <th className="py-2.5 px-2 font-medium">名次</th>
                    <th className="py-2.5 px-2 font-medium">{tab === 'personal' ? '成员' : '小组'}</th>
                    <th className="py-2.5 px-2 font-medium text-right">能量币</th>
                    <th className="py-2.5 px-2 font-medium text-right">本月环比</th>
                  </tr>
                </thead>
                <tbody>
                  <AnimatePresence>
                    {rest.map((item, i) => {
                      const isPersonal = 'avatar' in item;
                      const group = !isPersonal ? getGroupById(item.groupId) : null;
                      const avatar = isPersonal
                        ? (item as any).avatar
                        : `https://api.dicebear.com/7.x/shapes/svg?seed=${item.groupId}&backgroundColor=${(group?.logo || '#0D47A1').replace('#', '')}`;
                      const delta = tab === 'personal' ? 0 : getGroupDelta(item.groupId);
                      return (
                        <motion.tr
                          key={`${item.rank}-${i}`}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.03 }}
                          className="border-b border-physics-50 hover:bg-physics-50/40 transition"
                        >
                          <td className="py-3 px-2">
                            <span className={cn(
                              'inline-flex w-7 h-7 items-center justify-center rounded-full text-xs font-bold',
                              item.rank <= 10 ? 'bg-physics-100 text-physics-700' : 'bg-ink-100 text-ink-500'
                            )}>
                              {item.rank}
                            </span>
                          </td>
                          <td className="py-3 px-2">
                            <div className="flex items-center gap-3">
                              <Avatar src={avatar} name={item.name} size={36} />
                              <div>
                                <div className="font-medium text-ink-800">{item.name}</div>
                                {!isPersonal && group && (
                                  <div className="text-xs text-ink-500">{getGroupById(item.groupId) ? getGroupUsers(item.groupId)?.length || 5 : 5} 成员</div>
                                )}
                                {isPersonal && (
                                  <div className="text-xs text-ink-500">{getGroupById((item as any).groupId)?.name || '未分组'}</div>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-2 text-right">
                            <CoinBadge value={(item as any).totalCoins || 0} size="sm" />
                          </td>
                          <td className="py-3 px-2 text-right">
                            <DeltaBadge delta={delta} />
                          </td>
                        </motion.tr>
                      );
                    })}
                  </AnimatePresence>
                  {rest.length === 0 && (
                    <tr>
                      <td colSpan={4} className="py-10 text-center text-ink-400 text-sm">暂无更多数据</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="card-base p-6">
          <h2 className="section-title mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-lab-500" />
            近30天累计趋势
          </h2>
          <div className="text-xs text-ink-500 mb-4">6 小组每日累计能量币</div>
          <div className="w-full h-[360px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                <defs>
                  {groups.map((g, i) => (
                    <linearGradient key={g.id} id={`grad-${g.id}`} x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor={chartColors[i % chartColors.length]} stopOpacity={0.9} />
                      <stop offset="100%" stopColor={chartColors[i % chartColors.length]} stopOpacity={0.6} />
                    </linearGradient>
                  ))}
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#E0E7F2" opacity={0.5} />
                <XAxis dataKey="day" tick={{ fontSize: 10, fill: '#7081A4' }} tickLine={false} axisLine={{ stroke: '#D8DFEC' }} interval={4} />
                <YAxis tick={{ fontSize: 10, fill: '#7081A4' }} tickLine={false} axisLine={{ stroke: '#D8DFEC' }} />
                <Tooltip
                  contentStyle={{
                    borderRadius: 12,
                    border: '1px solid #CFE0F4',
                    boxShadow: '0 8px 24px rgba(13,71,161,0.10)',
                    fontSize: 12,
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} iconType="circle" />
                {groups.map((g, i) => (
                  <Line
                    key={g.id}
                    type="monotone"
                    dataKey={g.name}
                    stroke={`url(#grad-${g.id})`}
                    strokeWidth={2.2}
                    dot={false}
                    activeDot={{ r: 4, strokeWidth: 2 }}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
