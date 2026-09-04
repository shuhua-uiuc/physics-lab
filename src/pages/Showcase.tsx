import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, Image as ImageIcon, FileText, BookOpen, X, ArrowRight, Sparkles } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { cn } from '@/lib/utils';
import { useProjectStore } from '@/store/projectStore';
import { useGroupStore } from '@/store/groupStore';
import { useTheoryStore } from '@/store/theoryStore';
import { useAuthStore } from '@/store/authStore';
import { ShowcaseItem } from '@/data/mockData';

type TabKey = 'photos' | 'results' | 'challenges';

const TABS: { key: TabKey; label: string; icon: typeof ImageIcon }[] = [
  { key: 'photos', label: '优秀项目照片展', icon: ImageIcon },
  { key: 'results', label: '项目结果展', icon: FileText },
  { key: 'challenges', label: '精选题库', icon: BookOpen },
];

function HeartChip({ loves, active, onClick }: { loves: number; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className={cn(
        'chip inline-flex items-center gap-1 backdrop-blur-md transition-all',
        active
          ? 'bg-risk-500/90 text-white ring-0 shadow-lg'
          : 'bg-white/85 text-risk-600 ring-1 ring-white/50 hover:bg-risk-50'
      )}
    >
      <Heart className={cn('w-3.5 h-3.5 transition-transform', active && 'fill-current scale-110')} />
      <span className="font-semibold text-xs">{loves}</span>
    </button>
  );
}

export default function Showcase() {
  const [tab, setTab] = useState<TabKey>('photos');
  const [dialogItem, setDialogItem] = useState<ShowcaseItem | null>(null);
  const { showcaseItems, projects, toggleShowcaseLove } = useProjectStore();
  const { groups } = useGroupStore();
  const { challenges, topics } = useTheoryStore();
  const { userId } = useAuthStore();

  const photoItems = useMemo(() => {
    const items = showcaseItems.length > 0 ? showcaseItems : projects.filter((p) => p.photos?.length || p.status === 'done').map((p, i) => ({
      id: `pseudo-${p.id}`,
      projectId: p.id,
      title: p.title,
      coverImage: `https://picsum.photos/seed/${p.id}/600/${360 + (i % 5) * 60}`,
      groupId: p.ownerGroupId,
      description: p.results || `${p.title} 项目实验成果，由 ${groups.find((g) => g.id === p.ownerGroupId)?.name || ''} 共同完成。`,
      loves: 5 + (i * 3) % 30,
      lovedBy: [],
      createdAt: new Date(),
    } as ShowcaseItem));
    return items;
  }, [showcaseItems, projects, groups]);

  const resultItems = useMemo(() => {
    const done = projects.filter((p) => p.status === 'done' && p.results);
    if (done.length >= 4) return done;
    return projects.slice(0, 6).map((p) => ({
      ...p,
      results: p.results || `# ${p.title} 项目结果\n\n## 实验目标\n研究${p.topic}相关现象，验证核心物理规律。\n\n## 实验数据\n\n| 测量项 | 数值 | 误差 |\n| --- | --- | --- |\n| A | 12.5 | ±0.2 |\n| B | 8.34 | ±0.05 |\n\n## 结论\n数据与理论吻合度良好，误差在允许范围内。\n`,
    }));
  }, [projects]);

  const selectedChallenges = useMemo(() => {
    const showcaseChallengeIds: string[] = [];
    let list = challenges.filter((c) => showcaseChallengeIds.includes(c.id));
    if (list.length === 0) {
      list = [...challenges].sort((a, b) => b.reward - a.reward).slice(0, 3);
    }
    if (list.length === 0) {
      list = topics.slice(0, 3).map((t, i) => ({
        id: `demo-ch-${i}`,
        title: `${t.title}概念精测`,
        creatorGroupId: groups[i % groups.length]?.id || 'g-1',
        topicId: t.id,
        reward: 80 + i * 40,
        deadline: new Date(Date.now() + 3 * 86400000),
        status: 'open' as const,
        submissions: [],
      } as any));
    }
    return list;
  }, [challenges, showcaseItems, topics, groups]);

  const masonryHeights = [
    'h-56 md:h-64',
    'h-72 md:h-80',
    'h-60 md:h-72',
    'h-64 md:h-72',
    'h-80 md:h-96',
    'h-56 md:h-64',
    'h-72 md:h-80',
    'h-60 md:h-64',
    'h-64 md:h-80',
  ];

  return (
    <div className="w-full space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="page-title">成果展示大厅</h1>
          <p className="text-ink-500 text-sm mt-1">优秀项目、实验结果与精选挑战</p>
        </div>
        <div className="flex items-center gap-2 text-sm text-ink-500">
          <Sparkles className="w-4 h-4 text-energy-500" />
          <span>共 {photoItems.length} 件展品</span>
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
                  ? 'bg-grad-lab text-white shadow-md'
                  : 'bg-white border border-physics-100 text-physics-600 hover:bg-physics-50'
              )}
            >
              <Icon className="w-4 h-4" />
              {t.label}
            </button>
          );
        })}
      </div>

      <AnimatePresence mode="wait">
        {tab === 'photos' && (
          <motion.div
            key="photos"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.25 }}
            className="columns-1 md:columns-2 lg:columns-3 gap-4 space-y-4"
          >
            {photoItems.map((item, i) => {
              const group = groups.find((g) => g.id === item.groupId);
              const loved = item.lovedBy.includes(String(userId));
              return (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.04 }}
                  onClick={() => setDialogItem(item)}
                  className={cn(
                    'card-base card-hover overflow-hidden relative group cursor-pointer break-inside-avoid',
                    masonryHeights[i % masonryHeights.length]
                  )}
                >
                  <img
                    src={item.coverImage}
                    alt={item.title}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-ink-900/85 via-ink-900/30 to-transparent opacity-90" />
                  <div className="absolute top-3 right-3">
                    <HeartChip
                      loves={item.loves}
                      active={loved}
                      onClick={() => toggleShowcaseLove(item.id, userId)}
                    />
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
                    <div className="text-lg font-semibold leading-tight mb-1">{item.title}</div>
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <span className="chip bg-white/20 text-white ring-1 ring-white/20 backdrop-blur">
                        {group?.name || '未知小组'}
                      </span>
                      <span className="text-xs opacity-80 flex items-center gap-1">
                        <ArrowRight className="w-3 h-3" /> 点击查看详情
                      </span>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        )}

        {tab === 'results' && (
          <motion.div
            key="results"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.25 }}
            className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5"
          >
            {resultItems.map((p, i) => {
              const group = groups.find((g) => g.id === p.ownerGroupId);
              const scItem = showcaseItems.find((s) => s.projectId === p.id);
              const loves = scItem?.loves || 0;
              const loved = scItem?.lovedBy.includes(String(userId)) || false;
              return (
                <motion.div
                  key={p.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="card-base card-hover flex flex-col overflow-hidden"
                >
                  <div className="p-5 pb-3 border-b border-physics-50">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h3 className="font-serif text-lg font-bold text-physics-900 leading-snug">
                        {p.title}
                      </h3>
                      {scItem && (
                        <HeartChip
                          loves={loves}
                          active={loved}
                          onClick={() => toggleShowcaseLove(scItem.id, userId)}
                        />
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="chip-physics">{group?.name || '未知小组'}</span>
                      <span className="chip-lab">{p.topic}</span>
                      {p.status === 'done' && <span className="chip-ink">已完成</span>}
                    </div>
                  </div>
                  <div className="p-5 flex-1 overflow-hidden">
                    <div className="prose-safety prose-sm max-w-none text-[13px] text-ink-700 line-clamp-6 h-[140px] overflow-hidden">
                      <ReactMarkdown>{p.results?.slice(0, 500) + (p.results?.length > 500 ? '…' : '')}</ReactMarkdown>
                    </div>
                  </div>
                  <div className="p-5 pt-0 mt-auto">
                    <button
                      className="btn-primary w-full"
                      onClick={() => setDialogItem({ id: `res-${p.id}`, projectId: p.id, title: p.title, coverImage: `https://picsum.photos/seed/${p.id}/800/500`, groupId: p.ownerGroupId, description: p.results, loves, lovedBy: scItem?.lovedBy || [], createdAt: new Date() } as any)}
                    >
                      <FileText className="w-4 h-4" />
                      查看完整成果
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        )}

        {tab === 'challenges' && (
          <motion.div
            key="challenges"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.25 }}
            className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5"
          >
            {selectedChallenges.map((ch, i) => {
              const creatorGroup = groups.find((g) => g.id === ch.creatorGroupId);
              const topic = topics.find((t) => t.id === ch.topicId);
              const allKps = topic?.outline.flatMap((c) => c.points).slice(0, 6) || [];
              return (
                <motion.div
                  key={ch.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.06 }}
                  className="card-base card-hover overflow-hidden"
                >
                  <div className="bg-grad-physics p-5 text-white">
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-serif text-lg font-bold leading-snug pr-2">{ch.title}</h3>
                      <span className="chip-energy shrink-0">
                        <Sparkles className="w-3 h-3" />
                        奖励 {ch.reward}
                      </span>
                    </div>
                    <span className="chip bg-white/20 text-white ring-1 ring-white/20 backdrop-blur">
                      出题组：{creatorGroup?.name || '教师精选'}
                    </span>
                  </div>
                  <div className="p-5 space-y-4">
                    <div>
                      <div className="text-xs text-ink-500 mb-2">涉及知识点</div>
                      <div className="flex flex-wrap gap-1.5">
                        {allKps.map((kp) => (
                          <span key={kp} className="chip-physics text-[11px]">{kp}</span>
                        ))}
                      </div>
                    </div>
                    <div className="border-t border-physics-50 pt-4">
                      <div className="text-ink-700 text-sm leading-relaxed line-clamp-3">
                        本挑战涵盖{topic?.title || ch.title}的核心概念，适合检验知识掌握程度。
                        包含单选、多选与判断题型，完成后根据正确率获得能量币奖励。
                      </div>
                    </div>
                    <button className="btn-outline w-full">
                      <BookOpen className="w-4 h-4" />
                      前往挑战大厅接受
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {dialogItem && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink-900/60 backdrop-blur-sm"
            onClick={() => setDialogItem(null)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              transition={{ type: 'spring', damping: 25 }}
              className="card-base max-w-3xl w-full max-h-[85vh] overflow-hidden flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="relative h-56 md:h-72 shrink-0 bg-physics-100">
                <img src={dialogItem.coverImage} alt={dialogItem.title} className="w-full h-full object-cover" />
                <button
                  onClick={() => setDialogItem(null)}
                  className="absolute top-3 right-3 w-9 h-9 rounded-full bg-white/90 backdrop-blur text-ink-700 hover:bg-white flex items-center justify-center shadow-md transition"
                >
                  <X className="w-5 h-5" />
                </button>
                <div className="absolute bottom-3 right-3">
                  <HeartChip
                    loves={dialogItem.loves}
                    active={(dialogItem as any).lovedBy?.includes(String(userId))}
                    onClick={() => toggleShowcaseLove(dialogItem.id, userId)}
                  />
                </div>
              </div>
              <div className="p-6 overflow-y-auto scroll-thin flex-1">
                <div className="flex items-start justify-between gap-3 mb-3 flex-wrap">
                  <h2 className="font-serif text-2xl font-bold text-physics-900">{dialogItem.title}</h2>
                  <span className="chip-physics">
                    {groups.find((g) => g.id === dialogItem.groupId)?.name || '未知小组'}
                  </span>
                </div>
                <div className="prose-safety max-w-none">
                  <ReactMarkdown>{dialogItem.description}</ReactMarkdown>
                </div>
              </div>
              <div className="p-6 pt-0 flex gap-3 flex-wrap">
                <button
                  className="btn-primary flex-1"
                  onClick={() => {
                    setDialogItem(null);
                    window.location.hash = `#/projects/${dialogItem.projectId}`;
                  }}
                >
                  <ArrowRight className="w-4 h-4" />
                  跳转项目详情
                </button>
                <button className="btn-outline" onClick={() => setDialogItem(null)}>
                  关闭
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
