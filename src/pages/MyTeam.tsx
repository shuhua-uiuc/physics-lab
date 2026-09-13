import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { UsersRound, Crown, Zap, Trophy, FolderKanban, UserPlus, Sparkles } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { useGroupStore } from '@/store/groupStore';
import { useProjectStore } from '@/store/projectStore';

/**
 * 我的小组 —— 学生查看本组成员、各人能量与贡献度。
 *
 * 数据全部来自 groupStore / projectStore（后端模式下由 bootstrapFromApi 注入），
 * 不做任何本地派生计算以外的加工，避免出现"看起来像真数据"的假数据。
 */
export default function MyTeam() {
  const groupId = useAuthStore((s) => s.groupId);
  const userId = useAuthStore((s) => s.userId);
  const groups = useGroupStore((s) => s.groups);
  const users = useGroupStore((s) => s.users);
  const projects = useProjectStore((s) => s.projects);

  const myGroup = useMemo(
    () => (groupId ? groups.find((g) => g.id === groupId) : undefined),
    [groups, groupId]
  );

  // 组长置顶，其余按个人能量降序
  const members = useMemo(() => {
    if (!myGroup) return [];
    return users
      .filter((u) => u.groupId === myGroup.id)
      .sort((a, b) => {
        if (a.role !== b.role) return a.role === 'leader' ? -1 : 1;
        return (b.personalCoins || 0) - (a.personalCoins || 0);
      });
  }, [users, myGroup]);

  // 同班级内按小组总能量排名
  const rank = useMemo(() => {
    if (!myGroup) return null;
    const peers = groups
      .filter((g) => g.classId === myGroup.classId)
      .sort((a, b) => (b.totalCoins || 0) - (a.totalCoins || 0));
    const idx = peers.findIndex((g) => g.id === myGroup.id);
    return idx >= 0 ? { position: idx + 1, total: peers.length } : null;
  }, [groups, myGroup]);

  const projectCount = useMemo(
    () => (myGroup ? projects.filter((p) => p.ownerGroupId === myGroup.id).length : 0),
    [projects, myGroup]
  );

  const myContribution = myGroup && userId ? myGroup.contributionRatio?.[userId] : undefined;

  // ---- 未加入小组：给出去哪儿解决的指引，而不是空白页 ----
  if (!myGroup) {
    return (
      <div className="space-y-6">
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="glass-card p-10 md:p-12 rounded-[28px] text-center"
        >
          <div className="w-14 h-14 mx-auto rounded-2xl bg-mission-50 flex items-center justify-center">
            <UserPlus size={24} className="text-mission-500" />
          </div>
          <h1 className="mt-4 text-[22px] font-extrabold text-ink-900">你还没有加入研究小组</h1>
          <p className="mt-2 text-[13.5px] text-ink-500 max-w-md mx-auto leading-relaxed">
            研究小组是完成项目、参与挑战和获得能量币的单位。
            请联系老师或组长把你加入小组，加入后这里会显示全部组员。
          </p>
        </motion.section>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ============ 小组信息 ============ */}
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="glass-card p-6 md:p-8 rounded-[28px] relative overflow-hidden"
      >
        <div className="absolute -top-10 right-10 w-64 h-64 rounded-full bg-mission-400/10 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-20 w-80 h-80 rounded-full bg-energy-400/10 blur-3xl pointer-events-none" />
        <div className="relative z-10">
          <div className="flex flex-wrap items-center gap-3 mb-3">
            <span className="mission-label">
              <UsersRound size={12} />
              MY TEAM · 我的小组
            </span>
            {myContribution != null && (
              <span className="chip-energy">
                <Sparkles size={11} />
                我的贡献 {myContribution}%
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0"
              style={{ background: myGroup.logo || '#4F7CFF' }}
            >
              <UsersRound size={24} className="text-white" />
            </div>
            <div>
              <h1 className="text-[30px] md:text-[34px] font-extrabold text-ink-900 leading-[1.1] tracking-tight">
                {myGroup.name}
              </h1>
              <p className="mt-1 text-[13.5px] text-ink-500">
                {members.length} 名成员
                {rank && <> · 本班 {rank.total} 个小组中排第 {rank.position} 位</>}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6">
            <Stat icon={UsersRound} label="小组成员" value={`${members.length}`} unit="人" tint="mission" />
            <Stat icon={Zap} label="小组总能量" value={`${myGroup.totalCoins || 0}`} unit="⚡" tint="energy" />
            <Stat
              icon={Trophy}
              label="本班排名"
              value={rank ? `${rank.position}` : '—'}
              unit={rank ? `/ ${rank.total}` : ''}
              tint="nova"
            />
            <Stat icon={FolderKanban} label="本组项目" value={`${projectCount}`} unit="个" tint="growth" />
          </div>
        </div>
      </motion.section>

      {/* ============ 成员名单 ============ */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="glass-card p-6 rounded-[28px]"
      >
        <div className="flex items-center justify-between gap-4 mb-4">
          <h2 className="text-[17px] font-extrabold text-ink-900">小组成员</h2>
          <span className="text-[12px] text-ink-400 font-medium">按身份与个人能量排序</span>
        </div>

        <div className="space-y-2">
          {members.map((m, idx) => {
            const isMe = m.id === userId;
            const contribution = myGroup.contributionRatio?.[m.id];
            return (
              <motion.div
                key={m.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: 0.15 + idx * 0.04 }}
                className={
                  'flex items-center gap-3 p-3 rounded-2xl border transition-colors ' +
                  (isMe
                    ? 'bg-mission-50/70 border-mission-100'
                    : 'bg-white/60 border-ink-100/70')
                }
              >
                <img
                  src={m.avatar}
                  alt={m.name}
                  className="w-11 h-11 rounded-xl ring-2 ring-white shadow-sm bg-white object-cover shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[14.5px] font-extrabold text-ink-900 truncate">{m.name}</span>
                    {m.role === 'leader' && (
                      <span className="chip-nova !py-0 !px-1.5 !text-[9px]">
                        <Crown size={9} />
                        组长
                      </span>
                    )}
                    {isMe && <span className="chip-mission !py-0 !px-1.5 !text-[9px]">我</span>}
                  </div>
                  {contribution != null && (
                    <div className="mt-0.5 text-[11.5px] text-ink-500 font-medium">
                      小组贡献 {contribution}%
                    </div>
                  )}
                </div>
                <div className="text-right shrink-0">
                  <div className="text-[15px] font-extrabold text-energy-600 flex items-center gap-1 justify-end">
                    {m.personalCoins || 0}
                    <Zap size={12} className="text-energy-500" />
                  </div>
                  <div className="text-[10.5px] text-ink-400 font-medium">个人能量</div>
                </div>
              </motion.div>
            );
          })}

          {members.length === 0 && (
            <div className="p-8 text-center text-[13px] text-ink-400">
              暂时读不到成员名单，请刷新页面重试。
            </div>
          )}
        </div>
      </motion.section>
    </div>
  );
}

const TINTS = {
  mission: 'bg-mission-50 text-mission-600',
  energy: 'bg-energy-50 text-energy-600',
  nova: 'bg-nova-50 text-nova-600',
  growth: 'bg-growth-50 text-growth-600',
} as const;

function Stat({
  icon: Icon,
  label,
  value,
  unit,
  tint,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  unit: string;
  tint: keyof typeof TINTS;
}) {
  return (
    <div className="rounded-2xl bg-white/70 border border-ink-100/70 p-3.5">
      <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${TINTS[tint]}`}>
        <Icon size={15} />
      </div>
      <div className="mt-2.5 flex items-baseline gap-1">
        <span className="text-[22px] font-extrabold text-ink-900 leading-none">{value}</span>
        {unit && <span className="text-[11.5px] font-bold text-ink-400">{unit}</span>}
      </div>
      <div className="mt-1 text-[11.5px] text-ink-500 font-medium">{label}</div>
    </div>
  );
}
