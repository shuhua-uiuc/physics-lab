import { useState, useMemo } from 'react';
import { useProjectStore } from '@/store/projectStore';
import { useGroupStore } from '@/store/groupStore';
import { useAuthStore } from '@/store/authStore';
import KanbanColumn from '@/components/project/KanbanColumn';
import Dialog from '@/components/ui/Dialog';
import { Project, ProjectStatus } from '@/data/mockData';
import { Search, Plus, Filter, Beaker, FlaskConical, FlaskRound, CheckCircle2, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

const COLUMNS: { key: ProjectStatus; title: string; headerGradient: string; headerTextClass?: string; icon: React.ReactNode }[] = [
  { key: 'planning', title: '规划中', headerGradient: 'bg-grad-ink', headerTextClass: 'text-ink-700', icon: <Beaker size={16} /> },
  { key: 'progress', title: '进行中', headerGradient: 'bg-grad-physics', icon: <FlaskConical size={16} /> },
  { key: 'review', title: '评审中', headerGradient: 'linear-gradient(135deg,#F9A825 0%,#FDD835 55%,#FFE082 100%)', headerTextClass: 'text-ink-900', icon: <FlaskRound size={16} /> },
  { key: 'done', title: '已完成', headerGradient: 'bg-grad-lab', icon: <CheckCircle2 size={16} /> },
  { key: 'failed', title: '已失败', headerGradient: 'bg-grad-risk', icon: <XCircle size={16} /> },
];

const MOVEABLE_STATUSES: ProjectStatus[] = ['planning', 'progress', 'review', 'done', 'failed'];

export default function ProjectKanban() {
  const projects = useProjectStore((s) => s.projects);
  const groups = useGroupStore((s) => s.groups);
  const updateStatus = useProjectStore((s) => s.updateStatus);
  const createProject = useProjectStore((s) => s.createProject);
  const currentGroupId = useAuthStore((s) => s.groupId);

  const [searchText, setSearchText] = useState('');
  const [filterGroupId, setFilterGroupId] = useState<string | 'all'>('all');
  const [moveDialog, setMoveDialog] = useState<{ open: boolean; project: Project | null }>({ open: false, project: null });
  const [newDialogOpen, setNewDialogOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newTopic, setNewTopic] = useState('电磁学');
  const [newGroupId, setNewGroupId] = useState(currentGroupId || groups[0]?.id || '');

  const filteredProjects = useMemo(() => {
    return projects.filter((p) => {
      if (searchText) {
        const s = searchText.toLowerCase();
        if (!p.title.toLowerCase().includes(s) && !p.topic.toLowerCase().includes(s)) return false;
      }
      if (filterGroupId !== 'all' && p.ownerGroupId !== filterGroupId) return false;
      return true;
    });
  }, [projects, searchText, filterGroupId]);

  const byStatus = useMemo(() => {
    const map: Record<ProjectStatus, Project[]> = {
      planning: [],
      progress: [],
      review: [],
      done: [],
      failed: [],
      frozen: [],
    };
    filteredProjects.forEach((p) => {
      if (p.status === 'frozen') {
        map.progress.push(p);
      } else {
        map[p.status].push(p);
      }
    });
    return map;
  }, [filteredProjects]);

  const handleConfirmMove = (targetStatus: ProjectStatus) => {
    if (!moveDialog.project) return;
    updateStatus(moveDialog.project.id, targetStatus);
    setMoveDialog({ open: false, project: null });
  };

  const handleCreateProject = () => {
    if (!newTitle.trim()) return;
    createProject({
      title: newTitle.trim(),
      topic: newTopic,
      ownerGroupId: newGroupId,
    });
    setNewDialogOpen(false);
    setNewTitle('');
  };

  return (
    <div className="container mx-auto py-6 px-4 md:px-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="page-title mb-1">项目看板</h1>
          <p className="text-ink-500 text-sm">五列看板纵览全班项目推进情况</p>
        </div>
        <button onClick={() => setNewDialogOpen(true)} className="btn-primary">
          <Plus size={18} />
          新建项目
        </button>
      </div>

      <div className="card-base p-4 mb-5 space-y-4">
        <div className="flex flex-col md:flex-row gap-3 md:items-center">
          <div className="relative flex-1">
            <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-400" />
            <input
              type="text"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              placeholder="搜索项目标题 / 主题..."
              className="input pl-10"
            />
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Filter size={16} className="text-ink-400 ml-1 hidden md:inline-flex" />
            <button
              onClick={() => setFilterGroupId('all')}
              className={cn(
                'chip transition',
                filterGroupId === 'all'
                  ? 'bg-grad-physics text-white ring-0 shadow-sm'
                  : 'bg-ink-100 text-ink-600 hover:bg-ink-200'
              )}
            >
              全部小组
            </button>
            {groups.map((g) => (
              <button
                key={g.id}
                onClick={() => setFilterGroupId(g.id)}
                className={cn(
                  'chip transition',
                  filterGroupId === g.id
                    ? 'bg-grad-physics text-white ring-0 shadow-sm'
                    : 'bg-ink-100 text-ink-600 hover:bg-ink-200'
                )}
              >
                <span
                  className="inline-block w-2 h-2 rounded-full mr-1"
                  style={{ background: g.logo }}
                />
                {g.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5 gap-4">
        {COLUMNS.map((col) => (
          <KanbanColumn
            key={col.key}
            title={col.title}
            status={col.key}
            projects={byStatus[col.key]}
            headerGradient={col.headerGradient}
            headerTextClass={col.headerTextClass}
            icon={col.icon}
            onMoveClick={(p) => setMoveDialog({ open: true, project: p })}
          />
        ))}
      </div>

      <Dialog
        open={moveDialog.open}
        onClose={() => setMoveDialog({ open: false, project: null })}
        title={`移动「${moveDialog.project?.title || ''}」`}
        size="sm"
        footer={
          <button onClick={() => setMoveDialog({ open: false, project: null })} className="btn-ghost">
            取消
          </button>
        }
      >
        <p className="text-sm text-ink-600 mb-4">选择目标列移动项目：</p>
        <div className="space-y-2">
          {MOVEABLE_STATUSES.map((st) => {
            const colMeta = COLUMNS.find((c) => c.key === st)!;
            const isCurrent = moveDialog.project?.status === st
              || (moveDialog.project?.status === 'frozen' && st === 'progress');
            return (
              <button
                key={st}
                disabled={isCurrent}
                onClick={() => handleConfirmMove(st)}
                className={cn(
                  'w-full flex items-center gap-3 p-3 rounded-xl2 border text-left transition',
                  isCurrent
                    ? 'bg-ink-50 border-physics-100 text-ink-400 cursor-not-allowed'
                    : 'bg-white border-physics-100 hover:border-physics-300 hover:bg-physics-50'
                )}
              >
                <span
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{
                    background:
                      st === 'planning' ? '#AAB6CE'
                      : st === 'progress' ? '#0D47A1'
                      : st === 'review' ? '#F9A825'
                      : st === 'done' ? '#00BFA5'
                      : '#E53935',
                  }}
                />
                <span className="flex-1 text-sm font-medium text-physics-800">{colMeta.title}</span>
                {isCurrent && <span className="text-xs text-ink-400">当前列</span>}
              </button>
            );
          })}
        </div>
      </Dialog>

      <Dialog
        open={newDialogOpen}
        onClose={() => setNewDialogOpen(false)}
        title="新建项目"
        footer={
          <>
            <button onClick={() => setNewDialogOpen(false)} className="btn-ghost">
              取消
            </button>
            <button onClick={handleCreateProject} disabled={!newTitle.trim()} className="btn-primary">
              创建
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="label">项目标题</label>
            <input
              className="input"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="例如：自制简易电动机"
            />
          </div>
          <div>
            <label className="label">所属主题</label>
            <select
              className="input"
              value={newTopic}
              onChange={(e) => setNewTopic(e.target.value)}
            >
              {['力学', '电磁学', '光学', '热学', '原子物理', '波动'].map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">所属小组</label>
            <select
              className="input"
              value={newGroupId}
              onChange={(e) => setNewGroupId(e.target.value)}
            >
              {groups.map((g) => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
            </select>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
