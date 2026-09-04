import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProjectStore } from '@/store/projectStore';
import CoinBadge from '@/components/ui/CoinBadge';
import { Recruitment, Project } from '@/data/mockData';
import {
  Search, Megaphone, ArrowUpDown, ArrowUp, ArrowDown, Users, Clock, Briefcase, Filter
} from 'lucide-react';
import { cn } from '@/lib/utils';

type SortOrder = 'reward_desc' | 'reward_asc' | 'deadline';

const STATUS_META: Record<Recruitment['status'], { label: string; chip: string }> = {
  open:     { label: '招募中',   chip: 'chip-lab' },
  assigned: { label: '已分配',   chip: 'chip-physics' },
  done:     { label: '已完成',   chip: 'chip-ink' },
  failed:   { label: '已失败',   chip: 'chip-risk' },
};

function daysLeft(d: Date | string): { days: number; text: string; urgent: boolean } {
  const now = Date.now();
  const t = typeof d === 'string' ? new Date(d).getTime() : d.getTime();
  const diff = t - now;
  const days = Math.ceil(diff / 86400000);
  if (days < 0) return { days, text: `已截止${-days}天`, urgent: true };
  if (days === 0) return { days, text: '今日截止', urgent: true };
  if (days <= 2) return { days, text: `${days}天后截止`, urgent: true };
  return { days, text: `${days}天后截止`, urgent: false };
}

export default function RecruitMarket() {
  const navigate = useNavigate();
  const allRecruitments = useProjectStore((s) => s.recruitments);
  const projects = useProjectStore((s) => s.projects);
  const projectById = useMemo(() => {
    const m: Record<string, Project> = {};
    projects.forEach((p) => (m[p.id] = p));
    return m;
  }, [projects]);

  const [searchText, setSearchText] = useState('');
  const [sortOrder, setSortOrder] = useState<SortOrder>('reward_desc');
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);

  const allSkills = useMemo(() => {
    const s = new Set<string>();
    allRecruitments.forEach((r) => r.skills.forEach((sk) => s.add(sk)));
    return Array.from(s);
  }, [allRecruitments]);

  const list = useMemo(() => {
    let arr = allRecruitments.filter((r) => {
      if (searchText) {
        const s = searchText.toLowerCase();
        const proj = projectById[r.projectId];
        const matchTitle = r.title.toLowerCase().includes(s);
        const matchProj = proj?.title.toLowerCase().includes(s);
        const matchDesc = r.description.toLowerCase().includes(s);
        if (!matchTitle && !matchProj && !matchDesc) return false;
      }
      if (selectedSkills.length > 0) {
        if (!selectedSkills.some((sk) => r.skills.includes(sk))) return false;
      }
      return true;
    });
    arr = arr.slice().sort((a, b) => {
      if (sortOrder === 'reward_desc') return b.reward - a.reward;
      if (sortOrder === 'reward_asc') return a.reward - b.reward;
      return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
    });
    return arr;
  }, [allRecruitments, searchText, selectedSkills, sortOrder, projectById]);

  const toggleSkill = (sk: string) => {
    setSelectedSkills((prev) =>
      prev.includes(sk) ? prev.filter((x) => x !== sk) : [...prev, sk]
    );
  };

  const openRecruit = (r: Recruitment) => {
    const proj = projectById[r.projectId];
    if (proj) {
      navigate(`/projects/${proj.id}/recruit/${r.id}`);
    } else {
      navigate('/recruit/market');
    }
  };

  return (
    <div className="container mx-auto py-6 px-4 md:px-6 max-w-7xl">
      <div className="flex items-start justify-between flex-wrap gap-4 mb-6">
        <div>
          <h1 className="page-title mb-1 flex items-center gap-3">
            <Megaphone className="text-energy-500" size={30} />
            招募市场
          </h1>
          <p className="text-ink-500 text-sm">
            浏览全班发布的技术招募，发挥专长赚取能量币
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <div className="chip chip-lab text-sm px-3 py-1.5">
            <Users size={14} />
            总招募 {allRecruitments.length}
          </div>
          <div className="chip chip-physics text-sm px-3 py-1.5">
            <Briefcase size={14} />
            进行中 {allRecruitments.filter((r) => r.status === 'open' || r.status === 'assigned').length}
          </div>
        </div>
      </div>

      <div className="card-base p-4 mb-5 space-y-4">
        <div className="flex flex-col md:flex-row gap-3 md:items-center">
          <div className="relative flex-1">
            <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-400" />
            <input
              type="text"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              placeholder="搜索招募标题 / 项目 / 描述..."
              className="input pl-10"
            />
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setShowFilters((v) => !v)}
              className={cn(
                'chip transition',
                showFilters ? 'bg-grad-physics text-white ring-0' : 'bg-ink-100 text-ink-600 hover:bg-ink-200'
              )}
            >
              <Filter size={14} />
              技能筛选
              {selectedSkills.length > 0 && (
                <span className="ml-1 rounded-full bg-white/25 w-5 h-5 flex items-center justify-center text-[10px]">
                  {selectedSkills.length}
                </span>
              )}
            </button>
            <div className="flex items-center gap-1 ml-2 rounded-xl2 bg-ink-50 ring-1 ring-ink-200 p-1">
              <span className="text-xs text-ink-500 px-2 flex items-center gap-1">
                <ArrowUpDown size={14} />
                排序
              </span>
              {([
                { k: 'reward_desc', label: '酬劳↘', icon: <ArrowDown size={13} /> },
                { k: 'reward_asc',  label: '酬劳↗', icon: <ArrowUp size={13} /> },
                { k: 'deadline',    label: '截止近', icon: <Clock size={13} /> },
              ] as { k: SortOrder; label: string; icon: React.ReactNode }[]).map((opt) => (
                <button
                  key={opt.k}
                  onClick={() => setSortOrder(opt.k)}
                  className={cn(
                    'flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium transition',
                    sortOrder === opt.k
                      ? 'bg-white shadow text-physics-700 ring-1 ring-physics-200'
                      : 'text-ink-500 hover:text-ink-700 hover:bg-white/60'
                  )}
                >
                  {opt.icon}
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>
        {showFilters && allSkills.length > 0 && (
          <div className="pt-3 border-t border-physics-50">
            <div className="text-xs text-ink-500 mb-2">点击 Tag 进行技能过滤（多选）</div>
            <div className="flex flex-wrap gap-1.5">
              {allSkills.map((sk) => (
                <button
                  key={sk}
                  onClick={() => toggleSkill(sk)}
                  className={cn(
                    'chip transition',
                    selectedSkills.includes(sk)
                      ? 'bg-grad-energy text-white ring-0 shadow-sm'
                      : 'bg-ink-100 text-ink-600 hover:bg-ink-200'
                  )}
                >
                  {sk}
                </button>
              ))}
              {selectedSkills.length > 0 && (
                <button
                  onClick={() => setSelectedSkills([])}
                  className="chip bg-risk-50 text-risk-600 ring-1 ring-risk-200 hover:bg-risk-100"
                >
                  清除筛选
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {list.length === 0 ? (
        <div className="card-base py-16 text-center">
          <Megaphone size={48} className="mx-auto text-ink-300 mb-4" />
          <p className="text-ink-500">暂无匹配的招募任务</p>
          {searchText && (
            <button
              onClick={() => setSearchText('')}
              className="btn-ghost mt-4"
            >
              清空搜索
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {list.map((r) => {
            const proj = projectById[r.projectId];
            const status = STATUS_META[r.status];
            const cd = daysLeft(r.deadline);
            return (
              <div
                key={r.id}
                onClick={() => openRecruit(r)}
                className="card-base card-hover cursor-pointer flex flex-col"
              >
                <div className="p-5 space-y-3.5 flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                        <span className={cn('chip', status.chip)}>{status.label}</span>
                        {r.status === 'open' && cd.urgent && (
                          <span className="chip chip-risk animate-pulse">🔥 即将截止</span>
                        )}
                      </div>
                      <h3 className="font-serif font-semibold text-physics-900 text-lg leading-snug">
                        {r.title}
                      </h3>
                    </div>
                    <CoinBadge value={r.reward} size="lg" variant="energy" className="flex-shrink-0" />
                  </div>

                  <div className="flex items-center gap-2 text-xs text-ink-500">
                    <Briefcase size={13} />
                    <span className="truncate">所属项目：{proj?.title || '已删除'}</span>
                  </div>

                  <p className="text-sm text-ink-600 line-clamp-2 leading-relaxed">
                    {r.description || '暂无详细描述，请点击进入查看。'}
                  </p>

                  {r.skills.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {r.skills.slice(0, 4).map((sk) => (
                        <span key={sk} className="chip chip-physics">{sk}</span>
                      ))}
                      {r.skills.length > 4 && (
                        <span className="chip chip-ink">+{r.skills.length - 4}</span>
                      )}
                    </div>
                  )}
                </div>

                <div className="px-5 py-3 border-t border-physics-50 bg-ink-50/60 flex items-center justify-between rounded-b-xl2">
                  <div className="flex items-center gap-3 text-xs">
                    <span className={cn('flex items-center gap-1 font-medium', cd.urgent ? 'text-risk-600' : 'text-ink-600')}>
                      <Clock size={13} />
                      {cd.text}
                    </span>
                    <span className="text-ink-500 flex items-center gap-1">
                      <Users size={13} />
                      {r.bids.length} 人投标
                    </span>
                  </div>
                  <button
                    className={cn(
                      'text-sm font-semibold px-3 py-1.5 rounded-lg transition',
                      r.status === 'open'
                        ? 'bg-physics-500 text-white hover:bg-physics-600'
                        : 'bg-ink-100 text-ink-600 hover:bg-ink-200'
                    )}
                  >
                    {r.status === 'open' ? '查看/投标 →' : '查看详情 →'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
