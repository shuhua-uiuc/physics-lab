import { useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  BookOpen,
  Brain,
  ChevronRight,
  ChevronDown,
  Sparkles,
  PlayCircle,
  Network,
  FileQuestion,
  Zap,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { cn } from '@/lib/utils';
import { useTheoryStore } from '@/store/theoryStore';
import { useUIStore } from '@/store/uiStore';

function Chip({ children, className }: { children: React.ReactNode; className?: string }) {
  return <span className={cn('chip', className)}>{children}</span>;
}

export default function TheoryTopicDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { topics, questions, startQuiz } = useTheoryStore();
  const { pushToast } = useUIStore();

  const topic = topics.find((t) => t.id === id);

  const [expandedChapters, setExpandedChapters] = useState<Set<number>>(new Set([0]));
  const [selectedPoint, setSelectedPoint] = useState<string | null>(null);

  const toggleChapter = (idx: number) => {
    setExpandedChapters((cur) => {
      const next = new Set(cur);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  const relatedQuestions = useMemo(() => {
    if (!selectedPoint || !topic) return [];
    return questions
      .filter((q) => q.topicId === topic.id && q.knowledgePoint === selectedPoint)
      .slice(0, 2);
  }, [selectedPoint, topic, questions]);

  const handleStartQuiz = () => {
    if (!topic) return;
    try {
      const session = startQuiz(topic.id);
      pushToast('智能检测已开始，加油！', 'success');
      navigate(`/theory/quiz/${session.id}`);
    } catch (e) {
      pushToast('暂无可用题目', 'warning');
    }
  };

  const handlePracticePoint = () => {
    if (!selectedPoint) return;
    pushToast(`已生成「${selectedPoint}」强化练习（演示：跳转检测）`, 'info');
    handleStartQuiz();
  };

  if (!topic) {
    return (
      <div className="w-full card-base p-12 text-center">
        <div className="text-ink-500 mb-2">未找到该主题</div>
        <button className="btn-outline mt-4" onClick={() => navigate('/theory/topics')}>
          <ArrowLeft className="w-4 h-4" /> 返回主题列表
        </button>
      </div>
    );
  }

  const totalPoints = topic.outline.reduce((s, c) => s + c.points.length, 0);
  const selectedChapterIdx = topic.outline.findIndex((c) => c.points.includes(selectedPoint || ''));

  return (
    <div className="w-full space-y-6">
      <div className="flex items-center gap-3 flex-wrap">
        <button
          className="btn-outline !py-2"
          onClick={() => navigate('/theory/topics')}
        >
          <ArrowLeft className="w-4 h-4" />
          返回主题列表
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="page-title">{topic.title}</h1>
            <Chip className="chip-physics">
              <BookOpen className="w-3 h-3" /> {topic.outline.length} 章
            </Chip>
            <Chip className="chip-lab">
              <Brain className="w-3 h-3" /> {totalPoints} 知识点
            </Chip>
          </div>
          <p className="text-ink-500 text-sm mt-1">AI 自学路径 · 思维导图 · 智能检测一站式学习</p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
        <div className="xl:col-span-3 card-base p-6 space-y-5">
          <div className="flex items-center gap-2 pb-3 border-b border-physics-100">
            <div className="w-9 h-9 rounded-xl bg-grad-physics flex items-center justify-center text-white shadow-md">
              <Sparkles className="w-4.5 h-4.5" />
            </div>
            <div>
              <h2 className="font-serif text-xl font-bold text-physics-900">AI 自学路径</h2>
              <p className="text-xs text-ink-500">系统生成的 {topic.title} 核心学习资料</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {(() => {
              const md = topic.aiMaterial || '';
              const sections = md.split(/\n## /).filter(Boolean);
              const intro = sections[0] || '';
              const rest = sections.slice(1);
              const parts: string[] = [];
              if (intro.trim()) parts.push(intro.trim());
              const chunkSize = Math.max(1, Math.ceil(rest.length / 3));
              for (let i = 0; i < 3; i++) {
                const ch = rest.slice(i * chunkSize, (i + 1) * chunkSize);
                if (ch.length) parts.push('## ' + ch.join('\n\n## '));
              }
              return parts.map((part, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.06 }}
                  className={cn(
                    'rounded-xl2 border border-physics-100 p-4 bg-gradient-to-br transition hover:border-physics-200 hover:shadow-card',
                    i === 0 && parts.length === 4 ? 'md:col-span-2' : '',
                    'from-white to-physics-50/30'
                  )}
                >
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-6 h-6 rounded-md bg-physics-100 text-physics-700 text-xs font-bold flex items-center justify-center">
                      {i + 1}
                    </div>
                    <div className="text-xs font-semibold text-physics-700 tracking-wide">PART {i + 1}</div>
                  </div>
                  <div className="prose-safety max-w-none text-sm">
                    <ReactMarkdown>{part}</ReactMarkdown>
                  </div>
                </motion.div>
              ));
            })()}
          </div>
        </div>

        <div className="xl:col-span-2 space-y-6">
          <div className="card-base p-6">
            <div className="flex items-center gap-2 mb-4 pb-3 border-b border-physics-100">
              <div className="w-9 h-9 rounded-xl bg-grad-lab flex items-center justify-center text-white shadow-md">
                <Network className="w-4.5 h-4.5" />
              </div>
              <div>
                <h2 className="font-serif text-xl font-bold text-physics-900">知识点思维导图</h2>
                <p className="text-xs text-ink-500">点击知识点查看典型例题</p>
              </div>
            </div>

            <div className="space-y-1.5">
              {topic.outline.map((chapter, ci) => {
                const expanded = expandedChapters.has(ci);
                return (
                  <div key={ci} className="rounded-xl overflow-hidden border border-physics-100 bg-white/60">
                    <button
                      onClick={() => toggleChapter(ci)}
                      className={cn(
                        'w-full flex items-center gap-2 px-3 py-2.5 text-left transition',
                        selectedChapterIdx === ci && !expanded ? 'bg-lab-50' : 'hover:bg-physics-50/50'
                      )}
                    >
                      <div className={cn(
                        'w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition',
                        expanded ? 'bg-physics-500 text-white' : 'bg-physics-100 text-physics-600'
                      )}>
                        {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-physics-800 text-sm truncate">{chapter.chapter}</div>
                        <div className="text-[11px] text-ink-500">{chapter.points.length} 个知识点</div>
                      </div>
                    </button>
                    <AnimatePresence>
                      {expanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.22 }}
                          className="overflow-hidden"
                        >
                          <div className="px-3 pb-3 pt-0.5 ml-2 border-l-2 border-physics-100 ml-5 space-y-1.5">
                            {chapter.points.map((pt, pi) => {
                              const active = selectedPoint === pt;
                              return (
                                <button
                                  key={pt}
                                  onClick={() => setSelectedPoint(active ? null : pt)}
                                  className={cn(
                                    'w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-left transition text-sm',
                                    active
                                      ? 'bg-grad-lab text-white shadow-sm font-semibold'
                                      : 'hover:bg-physics-50 text-ink-700'
                                  )}
                                >
                                  <div className={cn(
                                    'w-5 h-5 rounded-md flex items-center justify-center shrink-0 text-[10px] font-bold',
                                    active ? 'bg-white/25 text-white' : 'bg-physics-100 text-physics-600'
                                  )}>
                                    {pi + 1}
                                  </div>
                                  <span className="truncate flex-1">{pt}</span>
                                  <ChevronRight className={cn(
                                    'w-3.5 h-3.5 shrink-0 transition',
                                    active && 'translate-x-0.5'
                                  )} />
                                </button>
                              );
                            })}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="card-base p-6">
            <div className="flex items-center gap-2 mb-4 pb-3 border-b border-physics-100">
              <div className="w-9 h-9 rounded-xl bg-grad-energy flex items-center justify-center text-white shadow-md">
                <FileQuestion className="w-4.5 h-4.5" />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="font-serif text-lg font-bold text-physics-900 truncate">
                  {selectedPoint ? `「${selectedPoint}」典型题` : '典型题专区'}
                </h2>
                <p className="text-xs text-ink-500">
                  {selectedPoint ? `共 ${relatedQuestions.length} 道精选` : '点击左侧知识点查看对应题目'}
                </p>
              </div>
            </div>

            <AnimatePresence mode="wait">
              {!selectedPoint ? (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="py-10 text-center"
                >
                  <div className="w-16 h-16 mx-auto mb-3 rounded-2xl bg-physics-50 flex items-center justify-center">
                    <Brain className="w-8 h-8 text-physics-400" />
                  </div>
                  <div className="text-ink-600 font-medium text-sm">选择一个知识点开始</div>
                  <div className="text-xs text-ink-400 mt-1">每个知识点包含 1-2 道典型例题</div>
                </motion.div>
              ) : (
                <motion.div
                  key="questions"
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  className="space-y-3"
                >
                  {relatedQuestions.length === 0 ? (
                    <div className="py-6 text-center text-sm text-ink-500 rounded-xl bg-ink-50 border border-dashed border-physics-200">
                      该知识点暂未收录题目
                    </div>
                  ) : (
                    relatedQuestions.map((q, qi) => (
                      <div key={q.id} className="rounded-xl border border-physics-100 p-4 bg-gradient-to-br from-white to-physics-50/30">
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <Chip className="chip-physics text-[11px]">Q{qi + 1}</Chip>
                          <Chip className={cn(
                            'text-[11px]',
                            q.type === 'single' ? 'chip-physics' : q.type === 'multiple' ? 'chip-lab' : 'chip-energy'
                          )}>
                            {q.type === 'single' ? '单选' : q.type === 'multiple' ? '多选' : '判断'}
                          </Chip>
                          <Chip className="chip-ink text-[11px]">
                            {'★'.repeat(q.difficulty)}
                          </Chip>
                        </div>
                        <div className="text-sm text-ink-800 leading-relaxed mb-3">{q.stem}</div>
                        <div className="space-y-1.5">
                          {q.options.map((opt, oi) => (
                            <div key={oi} className="flex items-start gap-2 text-xs text-ink-700">
                              <span className="w-5 h-5 rounded-md bg-physics-50 text-physics-600 shrink-0 flex items-center justify-center font-semibold">
                                {String.fromCharCode(65 + oi)}
                              </span>
                              <span className="flex-1 leading-relaxed">{opt}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))
                  )}
                  {relatedQuestions.length > 0 && (
                    <button className="btn-lab w-full mt-1" onClick={handlePracticePoint}>
                      <Zap className="w-4 h-4" />
                      针对该点强化练习
                    </button>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
        className="card-base p-6 md:p-8 relative overflow-hidden"
      >
        <div className="absolute inset-x-0 top-0 h-1 bg-grad-energy" />
        <div
          className="absolute -right-10 -top-10 w-40 h-40 rounded-full blur-3xl opacity-30 bg-energy-400 pointer-events-none"
        />
        <div className="relative flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-grad-energy flex items-center justify-center text-white shadow-glow animate-pulseGlow">
              <PlayCircle className="w-7 h-7" strokeWidth={2} />
            </div>
            <div>
              <h3 className="font-serif text-2xl font-bold text-physics-900">开始智能检测</h3>
              <p className="text-sm text-ink-500 mt-1 max-w-md">
                自适应抽题 · 覆盖全部知识点 · 考后定位盲点 · 80 分通过获得能量币奖励
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <div className="hidden md:flex items-center gap-2 text-xs text-ink-500">
              <Chip className="chip-physics">~10 题</Chip>
              <Chip className="chip-lab">计时模式</Chip>
              <Chip className="chip-energy">能量币奖励</Chip>
            </div>
            <button
              className="btn-energy !text-base !px-6 !py-3 font-bold"
              onClick={handleStartQuiz}
            >
              <PlayCircle className="w-5 h-5" />
              开始智能检测
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
