import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useProjectStore } from '@/store/projectStore';
import { useGroupStore } from '@/store/groupStore';
import { useAuthStore } from '@/store/authStore';
import { useUIStore } from '@/store/uiStore';
import ProgressRing from '@/components/ui/ProgressRing';
import CoinBadge from '@/components/ui/CoinBadge';
import AvatarStack from '@/components/ui/AvatarStack';
import Dialog from '@/components/ui/Dialog';
import ReactMarkdown from 'react-markdown';
import { Project, ProjectStatus } from '@/data/mockData';
import {
  Calendar, Clock, Shield, Users, ChevronRight, Pencil, Save, X, Plus,
  AlertTriangle, Sparkles, Award, BookOpen, Target, Megaphone, FileText
} from 'lucide-react';
import { cn } from '@/lib/utils';

const STATUS_META: Record<ProjectStatus, { label: string; chip: string }> = {
  planning: { label: '规划中', chip: 'chip-ink' },
  progress: { label: '进行中', chip: 'chip-physics' },
  review:   { label: '评审中', chip: 'chip-energy' },
  done:     { label: '已完成', chip: 'chip-lab' },
  failed:   { label: '已失败', chip: 'chip-risk' },
  frozen:   { label: '已冻结', chip: 'chip-risk' },
};

const SAFETY_META: Record<string, { label: string; chip: string }> = {
  electric:   { label: '电气安全', chip: 'chip-physics' },
  thermal:    { label: '热学安全', chip: 'chip-energy' },
  optical:    { label: '光学安全', chip: 'chip-lab' },
  mechanical: { label: '机械安全', chip: 'chip-ink' },
  radiation:  { label: '辐射安全', chip: 'chip-risk' },
  chemical:   { label: '化学安全', chip: 'chip-risk' },
  combined:   { label: '综合安全', chip: 'chip-energy' },
};

type TabKey = 'overview' | 'tech' | 'recruit' | 'safety';

const TABS: { key: TabKey; label: string; icon: React.ReactNode }[] = [
  { key: 'overview', label: '项目概览', icon: <FileText size={16} /> },
  { key: 'tech',     label: '技术要点难点', icon: <Target size={16} /> },
  { key: 'recruit',  label: '招募公告', icon: <Megaphone size={16} /> },
  { key: 'safety',   label: '安全考核', icon: <Shield size={16} /> },
];

function formatDate(d: Date | string) {
  const date = typeof d === 'string' ? new Date(d) : d;
  return date.toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' });
}

function countdownText(due: Date | string): { days: number; text: string; urgent: boolean } {
  const now = Date.now();
  const d = typeof due === 'string' ? new Date(due).getTime() : due.getTime();
  const diff = d - now;
  const days = Math.ceil(diff / 86400000);
  if (days < 0) return { days, text: `逾期${-days}天`, urgent: true };
  if (days === 0) return { days, text: '今天截止', urgent: true };
  if (days <= 3) return { days, text: `剩${days}天`, urgent: true };
  return { days, text: `剩${days}天`, urgent: false };
}

export default function ProjectDetail() {
  const { id = '' } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const project = useProjectStore((s) => s.getProjectById(id));
  const groups = useGroupStore((s) => s.groups);
  const getGroupUsers = useGroupStore((s) => s.getGroupUsers);
  const getRecruitmentsByProject = useProjectStore((s) => s.getRecruitmentsByProject);
  const createRecruitment = useProjectStore((s) => s.createRecruitment);
  const markProjectDone = useProjectStore((s) => s.markProjectDone);
  const userId = useAuthStore((s) => s.userId);
  const groupId = useAuthStore((s) => s.groupId);
  const pushToast = useUIStore((s) => s.pushToast);

  const [tab, setTab] = useState<TabKey>('overview');
  const [editingTech, setEditingTech] = useState(false);
  const [techDraft, setTechDraft] = useState('');
  const [diffDraft, setDiffDraft] = useState('');
  const [recruitDialogOpen, setRecruitDialogOpen] = useState(false);
  const [newRec, setNewRec] = useState({ title: '', description: '', skills: '', reward: 50, daysLeft: 7 });

  const group = groups.find((g) => g.id === project?.ownerGroupId);
  const members = project ? getGroupUsers(project.ownerGroupId) : [];
  const recruitments = project ? getRecruitmentsByProject(project.id) : [];
  const isLeader = useMemo(() => {
    if (!project || !userId || !groupId) return false;
    const member = members.find((m) => m.id === userId);
    return member?.role === 'leader' && groupId === project.ownerGroupId;
  }, [members, userId, groupId, project]);

  const safetyPassed = project && userId ? !!project.safetyPassed[userId] : false;

  if (!project) {
    return (
      <div className="container mx-auto py-16 text-center">
        <AlertTriangle size={48} className="mx-auto text-risk-400 mb-4" />
        <h2 className="text-xl font-serif text-physics-800 mb-2">项目不存在</h2>
        <p className="text-ink-500 mb-6">ID: {id}</p>
        <button className="btn-outline" onClick={() => navigate('/projects')}>返回看板</button>
      </div>
    );
  }

  const statusMeta = STATUS_META[project.status];
  const safetyMeta = SAFETY_META[project.safetyCategory] || SAFETY_META.combined;
  const cd = countdownText(project.dueDate);

  const enterEditTech = () => {
    setTechDraft(project.techPoints || '');
    setDiffDraft(project.difficulties || '');
    setEditingTech(true);
  };

  const saveTech = () => {
    const { updateStatus, setProgress, projects } = useProjectStore.getState();
    const idx = projects.findIndex((p) => p.id === project.id);
    if (idx >= 0) {
      projects[idx] = { ...projects[idx], techPoints: techDraft, difficulties: diffDraft };
      useProjectStore.setState({ projects: [...projects] });
    }
    setEditingTech(false);
    pushToast('技术要点已更新', 'success');
  };

  const handleCreateRecruit = () => {
    if (!newRec.title.trim()) return;
    createRecruitment({
      projectId: project.id,
      title: newRec.title.trim(),
      description: newRec.description.trim(),
      skills: newRec.skills.split(/[,，\s]+/).filter(Boolean),
      reward: newRec.reward,
      deadline: new Date(Date.now() + newRec.daysLeft * 86400000),
    });
    setRecruitDialogOpen(false);
    setNewRec({ title: '', description: '', skills: '', reward: 50, daysLeft: 7 });
    pushToast('招募已发布', 'success');
  };

  const handleMarkDone = () => {
    if (project.progress < 100) {
      pushToast('项目进度未达 100%，不能标记完成', 'warning');
      return;
    }
    markProjectDone(project.id);
    pushToast('项目已完成，能量币已结算', 'success');
  };

  return (
    <div className="container mx-auto py-6 px-4 md:px-6 max-w-7xl">
      <button onClick={() => navigate(-1)} className="btn-ghost mb-4 -ml-2 text-sm">
        <ChevronRight size={16} className="rotate-180" />
        返回
      </button>

      <div className="card-base p-6 mb-6">
        <div className="flex flex-col lg:flex-row lg:items-start gap-6">
          <div className="flex-1 space-y-4">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="font-serif text-2xl md:text-3xl font-bold text-physics-900">{project.title}</h1>
              <span className="chip chip-physics">{project.topic}</span>
              <span className={cn('chip', statusMeta.chip)}>{statusMeta.label}</span>
              <span className={cn('chip', safetyMeta.chip)}>
                <Shield size={12} />
                {safetyMeta.label}
              </span>
              {safetyPassed && <span className="chip chip-lab"><Award size={12} />已通过安全考核</span>}
            </div>
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-ink-600">
              <div className="flex items-center gap-2">
                <Users size={15} className="text-physics-500" />
                <span className="font-medium text-ink-700">{group?.name || '未分组'}</span>
                <AvatarStack users={members} size={24} max={4} className="ml-1" />
              </div>
              <div className="flex items-center gap-2">
                <Calendar size={15} className="text-physics-500" />
                {formatDate(project.startDate)} ~ {formatDate(project.dueDate)}
              </div>
              <div className={cn('flex items-center gap-1.5 font-semibold', cd.urgent ? 'text-risk-600' : 'text-ink-700')}>
                <Clock size={15} />
                {cd.text}
              </div>
              <CoinBadge value={project.rewardCoins} size="md" variant="energy" />
            </div>
            <div className="flex items-end gap-5 pt-1">
              <div className="flex-1">
                <div className="flex justify-between text-xs text-ink-500 mb-1.5">
                  <span>项目整体进度</span>
                  <span className="font-semibold text-physics-700">{project.progress}%</span>
                </div>
                <div className="h-3 rounded-full bg-ink-100 overflow-hidden">
                  <div
                    className={cn(
                      'h-full rounded-full transition-all duration-700',
                      project.progress >= 100 ? 'bg-grad-lab' : project.progress >= 60 ? 'bg-grad-energy' : 'bg-grad-physics'
                    )}
                    style={{ width: `${project.progress}%` }}
                  />
                </div>
              </div>
              <ProgressRing value={project.progress} size={80} strokeWidth={6} />
            </div>
          </div>
        </div>
      </div>

      <div className="card-base overflow-hidden">
        <div className="flex border-b border-physics-50 overflow-x-auto scroll-thin">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={cn(
                'flex items-center gap-2 px-5 py-3.5 text-sm font-medium whitespace-nowrap transition border-b-2',
                tab === t.key
                  ? 'border-physics-500 text-physics-700 bg-physics-50/60'
                  : 'border-transparent text-ink-500 hover:text-ink-700 hover:bg-ink-50/60'
              )}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>

        <div className="p-6">
          {tab === 'overview' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl2 bg-ink-50/70 border border-physics-50">
                  <div className="text-xs text-ink-500 mb-1 flex items-center gap-1"><Calendar size={12} />项目周期</div>
                  <div className="font-serif text-lg text-physics-800">{formatDate(project.startDate)} — {formatDate(project.dueDate)}</div>
                  <div className={cn('text-sm mt-1 font-semibold', cd.urgent ? 'text-risk-600' : 'text-lab-700')}>
                    {cd.text}
                  </div>
                </div>
                <div className="p-4 rounded-xl2 bg-ink-50/70 border border-physics-50">
                  <div className="text-xs text-ink-500 mb-1 flex items-center gap-1"><Award size={12} />项目奖励</div>
                  <div className="flex items-center gap-3">
                    <CoinBadge value={project.rewardCoins} size="lg" variant="energy" />
                    <span className="text-xs text-ink-500">完成后按小组贡献比例结算</span>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-serif text-lg font-semibold text-physics-800 mb-3 flex items-center gap-2">
                  <Sparkles size={18} className="text-energy-500" />
                  器材清单
                </h3>
                <div className="overflow-hidden rounded-xl2 border border-physics-100">
                  <table className="w-full text-sm">
                    <thead className="bg-ink-50 text-ink-600">
                      <tr>
                        <th className="text-left px-4 py-2.5 font-medium">器材名称</th>
                        <th className="text-center px-4 py-2.5 font-medium w-24">数量</th>
                        <th className="text-left px-4 py-2.5 font-medium w-40">类别</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-physics-50">
                      {project.equipmentList.length === 0 ? (
                        <tr><td colSpan={3} className="text-center py-8 text-ink-400">暂无器材清单</td></tr>
                      ) : (
                        project.equipmentList.map((eq, i) => (
                          <tr key={i} className="hover:bg-ink-50/50">
                            <td className="px-4 py-3 text-ink-800 font-medium">{eq.name}</td>
                            <td className="px-4 py-3 text-center text-physics-700 font-mono font-semibold">{eq.qty}</td>
                            <td className="px-4 py-3">
                              <span className={cn(
                                'chip',
                                SAFETY_META[eq.category]?.chip || 'chip-ink'
                              )}>
                                {eq.category}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <button
                  onClick={() => navigate(`/projects/${project.id}/safety`)}
                  className={cn(
                    'flex-1 py-3.5 rounded-xl2 font-semibold text-base flex items-center justify-center gap-2 transition',
                    safetyPassed
                      ? 'bg-lab-50 text-lab-700 ring-1 ring-lab-200 hover:bg-lab-100'
                      : 'btn-primary'
                  )}
                >
                  <Shield size={18} />
                  {safetyPassed ? '✓ 已通过安全考核（查看/重考）' : '进入安全考核入口'}
                </button>
                <button
                  onClick={handleMarkDone}
                  disabled={project.progress < 100 || project.status === 'done'}
                  className={cn(
                    'flex-1 sm:flex-none sm:min-w-[220px] py-3.5 rounded-xl2 font-semibold text-base flex items-center justify-center gap-2 transition',
                    project.status === 'done'
                      ? 'bg-lab-50 text-lab-700 ring-1 ring-lab-200'
                      : project.progress >= 100
                        ? 'btn-lab'
                        : 'bg-ink-100 text-ink-400 cursor-not-allowed'
                  )}
                >
                  <CheckCircle size={18} />
                  {project.status === 'done' ? '✓ 已完成结算' : '完成项目（结算奖励）'}
                </button>
              </div>
            </div>
          )}

          {tab === 'tech' && (
            <div className="space-y-6">
              {isLeader && (
                <div className="flex justify-end -mb-2">
                  {editingTech ? (
                    <div className="flex gap-2">
                      <button onClick={() => setEditingTech(false)} className="btn-ghost"><X size={15} />取消</button>
                      <button onClick={saveTech} className="btn-primary"><Save size={15} />保存</button>
                    </div>
                  ) : (
                    <button onClick={enterEditTech} className="btn-outline"><Pencil size={15} />编辑内容</button>
                  )}
                </div>
              )}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                <div className="p-5 rounded-xl2 bg-ink-50/60 border border-physics-50">
                  <h3 className="font-serif text-lg font-semibold text-physics-800 mb-3 flex items-center gap-2">
                    <Target size={18} className="text-physics-500" />
                    技术要点
                  </h3>
                  {editingTech ? (
                    <textarea
                      className="w-full h-64 rounded-xl2 border border-physics-100 p-3 text-sm resize-y focus:outline-none focus:border-physics-400 focus:ring-2 focus:ring-physics-100"
                      value={techDraft}
                      onChange={(e) => setTechDraft(e.target.value)}
                      placeholder="# 技术要点（支持 Markdown）"
                    />
                  ) : (
                    <div className="prose-safety max-w-none">
                      {project.techPoints ? (
                        <ReactMarkdown>{project.techPoints}</ReactMarkdown>
                      ) : (
                        <p className="text-ink-400">暂无内容{isLeader && '，请组长编辑补充'}</p>
                      )}
                    </div>
                  )}
                </div>
                <div className="p-5 rounded-xl2 bg-risk-50/60 border border-risk-100">
                  <h3 className="font-serif text-lg font-semibold text-risk-700 mb-3 flex items-center gap-2">
                    <AlertTriangle size={18} />
                    技术难点
                  </h3>
                  {editingTech ? (
                    <textarea
                      className="w-full h-64 rounded-xl2 border border-risk-100 p-3 text-sm resize-y focus:outline-none focus:border-risk-300 focus:ring-2 focus:ring-risk-100"
                      value={diffDraft}
                      onChange={(e) => setDiffDraft(e.target.value)}
                      placeholder="# 技术难点（支持 Markdown）"
                    />
                  ) : (
                    <div className="prose-safety max-w-none">
                      {project.difficulties ? (
                        <ReactMarkdown>{project.difficulties}</ReactMarkdown>
                      ) : (
                        <p className="text-ink-400">暂无内容{isLeader && '，请组长编辑补充'}</p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {tab === 'recruit' && (
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <h3 className="font-serif text-lg font-semibold text-physics-800">招募列表</h3>
                {isLeader && (
                  <button onClick={() => setRecruitDialogOpen(true)} className="btn-energy text-sm">
                    <Plus size={16} />
                    发布招募
                  </button>
                )}
              </div>
              {recruitments.length === 0 ? (
                <div className="text-center py-12 text-ink-400">
                  <Megaphone size={40} className="mx-auto mb-3 opacity-40" />
                  暂无招募信息
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {recruitments.map((r) => {
                    const rcd = countdownText(r.deadline);
                    const statusChip =
                      r.status === 'open' ? 'chip-lab'
                      : r.status === 'assigned' ? 'chip-physics'
                      : r.status === 'done' ? 'chip-ink'
                      : 'chip-risk';
                    const statusLabel =
                      r.status === 'open' ? '招募中'
                      : r.status === 'assigned' ? '已分配'
                      : r.status === 'done' ? '已完成'
                      : '已失败';
                    return (
                      <div
                        key={r.id}
                        onClick={() => navigate(`/projects/${project.id}/recruit/${r.id}`)}
                        className="card-base card-hover cursor-pointer"
                      >
                        <div className="p-4 space-y-3">
                          <div className="flex items-start justify-between gap-2">
                            <h4 className="font-serif font-semibold text-physics-800 text-base">{r.title}</h4>
                            <span className={cn('chip flex-shrink-0', statusChip)}>{statusLabel}</span>
                          </div>
                          <p className="text-sm text-ink-600 line-clamp-2 min-h-[2.5em]">{r.description}</p>
                          <div className="flex flex-wrap gap-1.5">
                            {r.skills.map((s) => (
                              <span key={s} className="chip chip-physics">{s}</span>
                            ))}
                          </div>
                          <div className="flex items-center justify-between pt-2 border-t border-physics-50">
                            <div className="flex items-center gap-3">
                              <CoinBadge value={r.reward} size="sm" />
                              <span className={cn('text-xs font-medium', rcd.urgent ? 'text-risk-600' : 'text-ink-500')}>
                                {rcd.text}
                              </span>
                              <span className="text-xs text-ink-500">{r.bids.length} 人投标</span>
                            </div>
                            <ChevronRight size={16} className="text-ink-400" />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {tab === 'safety' && (
            <div className="space-y-5">
              <div className="p-5 rounded-xl2 bg-gradient-to-br from-physics-50 to-lab-50 border border-physics-100">
                <h3 className="font-serif text-lg font-semibold text-physics-800 mb-2 flex items-center gap-2">
                  <Shield size={20} className="text-physics-600" />
                  {safetyMeta.label} · 考核入口
                </h3>
                <p className="text-sm text-ink-600 mb-4">
                  项目涉及{safetyMeta.label}类别，所有参与成员需先通过安全考核方可进入实验阶段。
                  {safetyPassed && <span className="text-lab-700 font-semibold ml-1">你已通过本次考核。</span>}
                </p>
                <button
                  onClick={() => navigate(`/projects/${project.id}/safety`)}
                  className={safetyPassed ? 'btn-outline' : 'btn-primary'}
                >
                  {safetyPassed ? '查看考核 / 重新考核' : '进入安全考核'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <Dialog
        open={recruitDialogOpen}
        onClose={() => setRecruitDialogOpen(false)}
        title="发布招募公告"
        footer={
          <>
            <button onClick={() => setRecruitDialogOpen(false)} className="btn-ghost">取消</button>
            <button onClick={handleCreateRecruit} disabled={!newRec.title.trim()} className="btn-energy">发布</button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="label">招募标题</label>
            <input
              className="input"
              value={newRec.title}
              onChange={(e) => setNewRec({ ...newRec, title: e.target.value })}
              placeholder="例如：数据分析助手"
            />
          </div>
          <div>
            <label className="label">技能要求（用逗号或空格分隔）</label>
            <input
              className="input"
              value={newRec.skills}
              onChange={(e) => setNewRec({ ...newRec, skills: e.target.value })}
              placeholder="Python, 数据分析, Excel"
            />
          </div>
          <div>
            <label className="label">任务描述</label>
            <textarea
              className="input min-h-[90px] resize-y"
              value={newRec.description}
              onChange={(e) => setNewRec({ ...newRec, description: e.target.value })}
              placeholder="需要完成的工作内容和交付物要求..."
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">酬劳（能量币）</label>
              <input
                type="number"
                min={10}
                className="input"
                value={newRec.reward}
                onChange={(e) => setNewRec({ ...newRec, reward: Number(e.target.value) || 0 })}
              />
            </div>
            <div>
              <label className="label">截止天数</label>
              <input
                type="number"
                min={1}
                className="input"
                value={newRec.daysLeft}
                onChange={(e) => setNewRec({ ...newRec, daysLeft: Math.max(1, Number(e.target.value) || 1) })}
              />
            </div>
          </div>
        </div>
      </Dialog>
    </div>
  );
}

function CheckCircle(props: any) {
  return <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>;
}
