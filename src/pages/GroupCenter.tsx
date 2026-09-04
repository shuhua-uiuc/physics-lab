import { useState, useMemo, useEffect } from 'react';
import {
  Coins,
  Users,
  Crown,
  UserCircle2,
  HandCoins,
  Target,
  Rocket,
  Briefcase,
  School,
  Filter,
  Save,
  ChevronDown,
  Sparkles,
  Clock,
  Search,
} from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { useGroupStore } from '@/store/groupStore';
import { useCoinStore } from '@/store/coinStore';
import type { CoinSource, CoinTransaction } from '@/types';

const CoinBadge = ({ amount, size = 'md', showSymbol = true, className = '' }: { amount: number; size?: 'sm' | 'md' | 'lg'; showSymbol?: boolean; className?: string }) => {
  const sizeMap = { sm: 'h-5 text-xs px-1.5 gap-0.5', md: 'h-7 text-sm px-2 gap-1', lg: 'h-10 text-base px-3 gap-1.5' };
  const iconSize = size === 'sm' ? 12 : size === 'md' ? 16 : 20;
  const positive = amount >= 0;
  return (
    <span className={`inline-flex items-center rounded-full font-semibold bg-gradient-to-br from-energy-500/15 via-energy-400/10 to-energy-300/15 ring-1 ring-energy-300/40 text-energy-700 ${sizeMap[size]} ${positive ? '' : 'from-risk-500/15 via-risk-400/10 to-risk-300/15 ring-risk-300/40 text-risk-700'} ${className}`}>
      <Coins size={iconSize} className={positive ? 'text-energy-500' : 'text-risk-500'} />
      {showSymbol && amount > 0 && '+'}
      <span>{amount}</span>
    </span>
  );
};

const Chip = ({ children, variant = 'physics', className = '' }: { children: React.ReactNode; variant?: 'physics' | 'energy' | 'lab' | 'risk' | 'ink'; className?: string }) => {
  const vmap = {
    physics: 'bg-physics-50 text-physics-700 ring-1 ring-physics-100',
    energy: 'bg-energy-50 text-energy-700 ring-1 ring-energy-100',
    lab: 'bg-lab-50 text-lab-700 ring-1 ring-lab-100',
    risk: 'bg-risk-50 text-risk-700 ring-1 ring-risk-100',
    ink: 'bg-ink-100 text-ink-600 ring-1 ring-ink-200',
  };
  return <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${vmap[variant]} ${className}`}>{children}</span>;
};

const TABS = [
  { key: 'members', label: '成员与贡献', icon: Users },
  { key: 'txs', label: '能量币流水', icon: HandCoins },
] as const;

const SOURCE_FILTERS: { key: CoinSource | 'all'; label: string; icon: any }[] = [
  { key: 'all', label: '全部', icon: Filter },
  { key: 'challenge', label: '挑战', icon: Target },
  { key: 'project', label: '项目', icon: Rocket },
  { key: 'recruit', label: '招募', icon: Briefcase },
  { key: 'teacher_set', label: '教师设定', icon: School },
];

const SOURCE_VARIANT: Record<CoinSource, 'physics' | 'energy' | 'lab' | 'risk' | 'ink'> = {
  challenge: 'energy',
  project: 'physics',
  recruit: 'lab',
  teacher_set: 'ink',
  penalty: 'risk',
};

const SOURCE_LABEL: Record<CoinSource, string> = {
  challenge: '挑战结算',
  project: '项目奖励',
  recruit: '招募任务',
  teacher_set: '教师操作',
  penalty: '惩罚扣币',
};

function formatDate(d: Date) {
  const diff = Date.now() - new Date(d).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return '刚刚';
  if (min < 60) return `${min} 分钟前`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} 小时前`;
  const day = Math.floor(hr / 24);
  if (day < 30) return `${day} 天前`;
  return new Date(d).toLocaleDateString();
}

export default function GroupCenter() {
  const [tab, setTab] = useState<'members' | 'txs'>('members');
  const [srcFilter, setSrcFilter] = useState<CoinSource | 'all'>('all');
  const { groupId, userId, role } = useAuthStore();
  const { groups, users, setLeader, updateContributionRatio, getGroupById, getGroupUsers, getUserById } = useGroupStore();
  const { coinTxs } = useCoinStore();

  const workingGroup = useMemo(() => {
    if (role === 'teacher') return groups[0] || getGroupById(groupId || '');
    return groupId ? getGroupById(groupId) : undefined;
  }, [role, groupId, groups, getGroupById]);

  const gid = workingGroup?.id;
  const members = useMemo(() => (gid ? getGroupUsers(gid) : []), [gid, getGroupUsers]);
  const currentUser = userId && userId !== 'teacher' ? getUserById(userId) : undefined;
  const amLeader = role === 'teacher' || (currentUser && currentUser.role === 'leader');

  const [ratios, setRatios] = useState<Record<string, number>>({});
  const [saveMsg, setSaveMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  useEffect(() => {
    if (workingGroup) {
      const init: Record<string, number> = {};
      members.forEach((m) => {
        init[m.id] = workingGroup.contributionRatio[m.id] ?? Math.floor(100 / Math.max(1, members.length));
      });
      setRatios(init);
    }
  }, [workingGroup?.id, members.map((m) => m.id).join(',')]);

  const ratioSum = useMemo(() => Object.values(ratios).reduce((a, b) => a + b, 0), [ratios]);

  const onRatioChange = (uid: string, v: number) => {
    setSaveMsg(null);
    setRatios((prev) => ({ ...prev, [uid]: Math.max(0, Math.min(100, v)) }));
  };

  const autoBalanceOthers = (uid: string) => {
    setRatios((prev) => {
      const ids = Object.keys(prev).filter((k) => k !== uid);
      const othersSum = ids.reduce((s, k) => s + prev[k], 0);
      const target = 100 - prev[uid];
      if (othersSum === 0) return prev;
      const factor = target / othersSum;
      const next = { ...prev };
      let acc = 0;
      ids.forEach((k, i) => {
        if (i === ids.length - 1) {
          next[k] = Math.max(0, 100 - prev[uid] - acc);
        } else {
          const v = Math.max(0, Math.round(prev[k] * factor));
          next[k] = v;
          acc += v;
        }
      });
      return next;
    });
    setSaveMsg(null);
  };

  const onSaveRatios = () => {
    if (!workingGroup) return;
    if (ratioSum !== 100) {
      setSaveMsg({ type: 'err', text: `贡献比例之和必须为 100，当前为 ${ratioSum}` });
      return;
    }
    try {
      updateContributionRatio(workingGroup.id, ratios);
      setSaveMsg({ type: 'ok', text: '贡献比例已保存 ✅' });
      setTimeout(() => setSaveMsg(null), 2500);
    } catch (e: any) {
      setSaveMsg({ type: 'err', text: e.message || '保存失败' });
    }
  };

  const onSetLeader = (uid: string) => {
    if (!workingGroup || !amLeader) return;
    setLeader(workingGroup.id, uid);
  };

  const filteredTxs = useMemo(() => {
    if (!gid) return [] as CoinTransaction[];
    let list = coinTxs.filter((t) => t.groupId === gid);
    if (srcFilter !== 'all') list = list.filter((t) => t.source === srcFilter);
    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [gid, srcFilter, coinTxs]);

  if (!workingGroup) {
    return (
      <div className="max-w-[1100px] mx-auto px-6 py-16 text-center">
        <Chip variant="risk">请先登录后访问小组中心</Chip>
      </div>
    );
  }

  const leader = members.find((m) => m.role === 'leader');

  return (
    <div className="min-h-screen">
      <div className="max-w-[1100px] mx-auto px-6 py-8 space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="page-title flex items-center gap-3">
              <Sparkles className="text-physics-500" size={26} />
              小组中心 · {workingGroup.name}
            </h1>
            <p className="text-sm text-ink-500 mt-1.5">
              查看小组成员、调整贡献分配比例、追踪能量币收支流水
            </p>
          </div>
          <CoinBadge amount={workingGroup.totalCoins} size="lg" showSymbol={false} />
        </div>

        <div className="flex gap-2 p-1.5 bg-ink-100/80 rounded-xl2 w-fit">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium text-sm transition-all ${
                tab === t.key
                  ? 'bg-white text-physics-700 shadow-md'
                  : 'text-ink-500 hover:text-ink-700'
              }`}
            >
              <t.icon size={16} />
              {t.label}
            </button>
          ))}
        </div>

        {tab === 'members' && (
          <div className="space-y-6">
            <div className="card-base p-7 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-52 h-52 bg-gradient-to-br from-physics-200/40 via-transparent to-energy-200/30 rounded-full -translate-y-1/3 translate-x-1/3 blur-3xl" />
              <div className="relative flex flex-wrap items-start gap-6">
                <div
                  className="h-20 w-20 rounded-2xl flex items-center justify-center text-white font-serif font-bold text-3xl shadow-cardLifted ring-4 ring-white"
                  style={{ background: `linear-gradient(135deg, ${workingGroup.logo}, #0D47A1)` }}
                >
                  {workingGroup.name.charAt(0)}
                </div>
                <div className="flex-1 min-w-[240px]">
                  <div className="flex items-center gap-3 flex-wrap mb-2">
                    <h2 className="font-serif text-2xl font-bold text-physics-900">{workingGroup.name}</h2>
                    <Chip variant="physics">{members.length} 名成员</Chip>
                    {leader && (
                      <Chip variant="energy">
                        <Crown size={12} /> 组长：{leader.name}
                      </Chip>
                    )}
                    <Chip variant="lab">初始 {workingGroup.initialCoins} 币</Chip>
                  </div>
                  <p className="text-sm text-ink-500 leading-6 max-w-2xl">
                    项目完成后获得的能量币会按「贡献比例」自动分发至成员个人账户。
                    组长可以切换成员角色、调整比例；<strong className="text-physics-700">所有比例之和必须等于 100</strong>。
                  </p>
                </div>
              </div>
            </div>

            <div className="card-base p-6">
              <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
                <h3 className="section-title flex items-center gap-2">
                  <Users size={20} className="text-physics-500" />
                  成员列表与贡献比例
                </h3>
                <div className="flex items-center gap-3 flex-wrap">
                  <div className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl2 text-sm font-semibold ${
                    ratioSum === 100 ? 'bg-lab-50 text-lab-700 ring-1 ring-lab-200' : 'bg-risk-50 text-risk-700 ring-1 ring-risk-200'
                  }`}>
                    <Target size={15} />
                    总和 {ratioSum} / 100
                  </div>
                  {saveMsg && (
                    <span className={`text-xs px-3 py-1.5 rounded-full font-medium ${saveMsg.type === 'ok' ? 'bg-lab-50 text-lab-700' : 'bg-risk-50 text-risk-700'}`}>
                      {saveMsg.text}
                    </span>
                  )}
                  <button
                    onClick={onSaveRatios}
                    disabled={!amLeader}
                    className="btn-primary !py-2 text-sm"
                  >
                    <Save size={15} />
                    保存贡献比例
                  </button>
                </div>
              </div>

              <div className="space-y-4">
                {members.map((m, idx) => {
                  const r = ratios[m.id] ?? 0;
                  const isLeader = m.role === 'leader';
                  return (
                    <div key={m.id} className="rounded-xl2 p-4 bg-ink-50/60 ring-1 ring-ink-200 hover:ring-physics-200 hover:bg-white transition-all">
                      <div className="flex items-center gap-4 flex-wrap">
                        <div className="relative">
                          <img
                            src={m.avatar}
                            alt={m.name}
                            className="h-12 w-12 rounded-full ring-2 ring-white shadow-md bg-white"
                          />
                          {isLeader && (
                            <div className="absolute -top-1 -right-1 h-6 w-6 rounded-full bg-gradient-to-br from-yellow-300 to-amber-500 flex items-center justify-center text-white shadow-md ring-2 ring-white">
                              <Crown size={12} />
                            </div>
                          )}
                        </div>
                        <div className="min-w-[120px]">
                          <div className="flex items-center gap-2 mb-0.5">
                            <p className="font-semibold text-ink-800">{m.name}</p>
                            <Chip variant={isLeader ? 'energy' : 'ink'}>
                              {isLeader ? '组长' : '组员'}
                            </Chip>
                          </div>
                          <p className="text-[11px] text-ink-400">ID: {m.id} · 个人币 {m.personalCoins}</p>
                        </div>
                        <div className="flex-1 min-w-[260px] space-y-2">
                          <div className="flex items-center gap-3">
                            <input
                              type="range"
                              min={0}
                              max={100}
                              value={r}
                              disabled={!amLeader}
                              onChange={(e) => onRatioChange(m.id, parseInt(e.target.value))}
                              className="flex-1 h-2 rounded-full appearance-none bg-physics-100 accent-physics-500 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
                              style={{ accentColor: '#0D47A1' }}
                            />
                            <div className="w-24 flex items-center gap-1">
                              <input
                                type="number"
                                min={0}
                                max={100}
                                value={r}
                                disabled={!amLeader}
                                onChange={(e) => onRatioChange(m.id, parseInt(e.target.value) || 0)}
                                className="w-14 h-8 px-2 text-center text-sm rounded-lg border border-physics-100 focus:outline-none focus:ring-2 focus:ring-physics-200 disabled:opacity-60"
                              />
                              <span className="text-ink-500 text-sm font-semibold">%</span>
                            </div>
                            {amLeader && (
                              <button
                                onClick={() => autoBalanceOthers(m.id)}
                                className="chip-physics hover:bg-physics-100 cursor-pointer text-[11px] !px-2 !py-1"
                                title="自动调整其余成员使总和为 100"
                              >
                                配平其他
                              </button>
                            )}
                          </div>
                          <div className="h-2 rounded-full overflow-hidden bg-ink-200/60">
                            <div
                              className={`h-full rounded-full transition-all ${
                                idx % 4 === 0 ? 'bg-gradient-to-r from-physics-500 to-physics-300'
                                  : idx % 4 === 1 ? 'bg-gradient-to-r from-energy-500 to-energy-300'
                                  : idx % 4 === 2 ? 'bg-gradient-to-r from-lab-500 to-lab-300'
                                  : 'bg-gradient-to-r from-purple-500 to-purple-300'
                              }`}
                              style={{ width: `${Math.max(0, Math.min(100, r))}%` }}
                            />
                          </div>
                        </div>
                        {amLeader && (
                          <button
                            onClick={() => onSetLeader(m.id)}
                            disabled={isLeader}
                            className={`btn-outline !py-1.5 text-xs !px-3 ${isLeader ? 'opacity-50 cursor-not-allowed' : ''}`}
                          >
                            {isLeader ? '现任组长' : '设为组长'}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {tab === 'txs' && (
          <div className="space-y-5">
            <div className="flex items-center gap-2 flex-wrap p-1.5 bg-ink-100/70 rounded-xl2 w-fit">
              {SOURCE_FILTERS.map((f) => (
                <button
                  key={f.key}
                  onClick={() => setSrcFilter(f.key)}
                  className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    srcFilter === f.key
                      ? 'bg-white text-physics-700 shadow-md'
                      : 'text-ink-500 hover:text-ink-700'
                  }`}
                >
                  <f.icon size={14} />
                  {f.label}
                  {f.key !== 'all' && (
                    <span className="text-[10px] ml-0.5 text-ink-400">
                      {coinTxs.filter((t) => t.groupId === gid && t.source === f.key).length}
                    </span>
                  )}
                </button>
              ))}
            </div>

            <div className="card-base overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-ink-50 text-ink-500 text-xs uppercase tracking-wider">
                      <th className="text-left font-semibold px-5 py-3.5"><Clock size={13} className="inline mr-1.5" />时间</th>
                      <th className="text-left font-semibold px-5 py-3.5"><Search size={13} className="inline mr-1.5" />来源</th>
                      <th className="text-right font-semibold px-5 py-3.5"><HandCoins size={13} className="inline mr-1.5" />变动</th>
                      <th className="text-right font-semibold px-5 py-3.5"><Coins size={13} className="inline mr-1.5" />余额</th>
                      <th className="text-left font-semibold px-5 py-3.5"><UserCircle2 size={13} className="inline mr-1.5" />备注</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-ink-100">
                    {filteredTxs.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-5 py-16 text-center text-ink-400">
                          <ChevronDown size={24} className="mx-auto mb-2 opacity-50" />
                          暂无 {srcFilter === 'all' ? '' : SOURCE_LABEL[srcFilter]} 流水记录
                        </td>
                      </tr>
                    )}
                    {filteredTxs.map((t) => {
                      const u = t.userId ? getUserById(t.userId) : undefined;
                      return (
                        <tr key={t.id} className="hover:bg-physics-50/30 transition-colors">
                          <td className="px-5 py-4 text-ink-600 whitespace-nowrap">
                            <div className="font-medium">{formatDate(t.createdAt)}</div>
                            <div className="text-[11px] text-ink-400 mt-0.5">
                              {new Date(t.createdAt).toLocaleString()}
                            </div>
                          </td>
                          <td className="px-5 py-4">
                            <Chip variant={SOURCE_VARIANT[t.source]}>
                              {SOURCE_LABEL[t.source]}
                            </Chip>
                          </td>
                          <td className="px-5 py-4 text-right">
                            <CoinBadge amount={t.delta} showSymbol={false} size="md" />
                          </td>
                          <td className="px-5 py-4 text-right font-semibold text-physics-700 tabular-nums">
                            {t.balanceAfter} <span className="text-xs text-ink-400 font-normal">币</span>
                          </td>
                          <td className="px-5 py-4 text-ink-600 max-w-[320px]">
                            <div>{t.note}</div>
                            {u && (
                              <div className="flex items-center gap-1 mt-1 text-[11px] text-ink-400">
                                <UserCircle2 size={11} />
                                关联成员：{u.name}
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {filteredTxs.length > 0 && (
                <div className="px-5 py-3 bg-ink-50/60 border-t border-ink-100 text-xs text-ink-500 flex items-center justify-between">
                  <span>共 {filteredTxs.length} 条流水</span>
                  <span>
                    本期净收支：
                    <span className={`font-semibold ml-1 ${
                      filteredTxs.reduce((s, t) => s + t.delta, 0) >= 0 ? 'text-lab-700' : 'text-risk-700'
                    }`}>
                      {filteredTxs.reduce((s, t) => s + t.delta, 0) >= 0 ? '+' : ''}
                      {filteredTxs.reduce((s, t) => s + t.delta, 0)} 币
                    </span>
                  </span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
