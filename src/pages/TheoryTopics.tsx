import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Atom,
  Zap,
  Orbit,
  FlaskConical,
  Sparkles,
  Target,
  Gauge,
  Cpu,
  BookOpenText,
  Rocket,
  PlayCircle,
  BrainCircuit,
  Star,
  CheckCircle2,
  Clock,
  Award,
} from 'lucide-react';
import { useTheoryStore } from '@/store/theoryStore';
import { useAuthStore } from '@/store/authStore';

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

const TOPIC_ICONS: Record<string, any> = {
  力学: Atom,
  电磁学: Zap,
  光学: Orbit,
  热学: FlaskConical,
  原子物理: Sparkles,
  波动: Target,
  相对论初步: Gauge,
  实验误差分析: Cpu,
};

const TOPIC_GRADIENTS: Record<string, string> = {
  力学: 'from-physics-500 via-blue-600 to-blue-400',
  电磁学: 'from-energy-500 via-orange-500 to-amber-400',
  光学: 'from-lab-500 via-teal-500 to-cyan-400',
  热学: 'from-risk-500 via-red-500 to-rose-400',
  原子物理: 'from-purple-500 via-violet-500 to-indigo-400',
  波动: 'from-pink-500 via-fuchsia-500 to-purple-400',
  相对论初步: 'from-slate-600 via-ink-600 to-ink-500',
  实验误差分析: 'from-emerald-500 via-green-500 to-lime-400',
};

const ProgressRing = ({
  value,
  max = 8,
  size = 160,
  stroke = 14,
  label,
  subLabel,
}: {
  value: number;
  max?: number;
  size?: number;
  stroke?: number;
  label?: string;
  subLabel?: string;
}) => {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const pct = Math.max(0, Math.min(1, value / max));
  const offset = circumference * (1 - pct);
  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <defs>
          <linearGradient id="pgGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#0D47A1" />
            <stop offset="50%" stopColor="#2A6CBE" />
            <stop offset="100%" stopColor="#FF6B35" />
          </linearGradient>
        </defs>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#E5EDF9"
          strokeWidth={stroke}
          fill="none"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="url(#pgGrad)"
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 0.6s ease' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-serif font-bold text-3xl text-physics-800">{value}</span>
        <span className="text-xs text-ink-500 mt-0.5">/ {max} 个主题</span>
        {label && <span className="text-sm font-semibold text-physics-700 mt-1">{label}</span>}
        {subLabel && <span className="text-[11px] text-ink-400">{subLabel}</span>}
      </div>
    </div>
  );
};

const DifficultyStars = ({ level }: { level: number }) => (
  <span className="inline-flex items-center gap-0.5">
    {Array.from({ length: 3 }).map((_, i) => (
      <Star
        key={i}
        size={13}
        className={i < level ? 'text-energy-500 fill-energy-400' : 'text-ink-300'}
      />
    ))}
    <span className="ml-1 text-[11px] text-ink-500 font-medium">难度 L{level}</span>
  </span>
);

export default function TheoryTopics() {
  const navigate = useNavigate();
  const { topics, questions, quizSessions, startQuiz } = useTheoryStore();
  const { userId, role } = useAuthStore();

  const userKey = userId || 'teacher';

  const passedCount = useMemo(() => {
    const tIds = new Set(topics.map((t) => t.id));
    const passed = new Set<string>();
    quizSessions.forEach((s) => {
      if (tIds.has(s.topicId) && s.passed) passed.add(s.topicId);
    });
    return passed.size;
  }, [quizSessions, topics]);

  const topicStats = useMemo(() => {
    return topics.map((t) => {
      const tqs = questions.filter((q) => q.topicId === t.id);
      const avgDiff = tqs.length > 0 ? Math.round(tqs.reduce((s, q) => s + q.difficulty, 0) / tqs.length) : 1;
      const chapterCount = t.outline.length;
      const questionCount = tqs.length;
      const passed = quizSessions.some(
        (s) => s.topicId === t.id && s.passed
      );
      const bestScore = quizSessions
        .filter((s) => s.topicId === t.id)
        .reduce((m, s) => Math.max(m, s.score || 0), 0);
      return { avgDiff, chapterCount, questionCount, passed, bestScore };
    });
  }, [topics, questions, quizSessions]);

  const startQuickQuiz = (topicId: string) => {
    const session = startQuiz(topicId);
    navigate(`/theory/quiz/${session.id}`);
  };

  return (
    <div className="min-h-screen">
      <div className="max-w-[1280px] mx-auto px-6 py-8 space-y-8">
        <div className="card-base p-7 relative overflow-hidden">
          <div className="absolute -top-20 -right-20 w-80 h-80 bg-gradient-to-br from-physics-200/50 to-transparent rounded-full blur-3xl" />
          <div className="absolute -bottom-16 -left-16 w-72 h-72 bg-gradient-to-br from-energy-200/40 to-transparent rounded-full blur-3xl" />
          <div className="relative flex flex-col md:flex-row md:items-center gap-8">
            <ProgressRing value={passedCount} label={`${role === 'teacher' ? '全班' : '你'}已掌握`} subLabel="通过智能检测" />
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <Chip variant="physics"><BrainCircuit size={13} /> AI 智能自学路径</Chip>
                <Chip variant="energy"><Award size={13} /> 8 大核心主题</Chip>
                <Chip variant="lab"><CheckCircle2 size={13} /> 80 分合格</Chip>
              </div>
              <h1 className="page-title mb-2 flex items-center gap-2">
                <BookOpenText size={26} className="text-physics-600" />
                理论学习 · 主题大纲
              </h1>
              <p className="text-ink-500 leading-7 max-w-2xl">
                每个主题包含 <strong className="text-physics-700">AI 自学材料 + 智能检测</strong>。
                检测通过（≥80 分）方可解锁同主题跨组挑战；不合格？别担心，AI 会根据盲点生成个性化补学路径。
                建议每天学习 <strong className="text-energy-600">1 个章节</strong>，循序渐进。
              </p>
              <div className="flex items-center gap-4 mt-4 flex-wrap text-sm">
                <div className="flex items-center gap-1.5 text-ink-600">
                  <Clock size={14} className="text-ink-400" />
                  单主题预计学习 45~90 分钟
                </div>
                <div className="flex items-center gap-1.5 text-ink-600">
                  <Target size={14} className="text-ink-400" />
                  共 {questions.length} 道题目已入库
                </div>
                <div className="flex items-center gap-1.5 text-ink-600">
                  <Rocket size={14} className="text-ink-400" />
                  通过检测解锁挑战大厅
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {topics.map((topic, i) => {
            const Icon = TOPIC_ICONS[topic.title] || Atom;
            const gradient = TOPIC_GRADIENTS[topic.title] || TOPIC_GRADIENTS['力学'];
            const stat = topicStats[i];
            const preview = topic.aiMaterial.replace(/[#*>\-\n]/g, ' ').replace(/\s+/g, ' ').slice(0, 42);
            return (
              <div
                key={topic.id}
                className="card-base card-hover p-0 overflow-hidden group"
              >
                <div className={`relative h-28 bg-gradient-to-br ${gradient} p-5 overflow-hidden`}>
                  <div className="absolute inset-0 opacity-20">
                    {Array.from({ length: 8 }).map((_, k) => (
                      <div
                        key={k}
                        className="absolute h-1.5 w-1.5 rounded-full bg-white animate-floatY"
                        style={{
                          top: `${10 + (k * 37) % 80}%`,
                          left: `${8 + (k * 53) % 85}%`,
                          animationDelay: `${k * 0.25}s`,
                        }}
                      />
                    ))}
                  </div>
                  <div className="relative flex items-start justify-between">
                    <div className="h-12 w-12 rounded-xl2 bg-white/25 backdrop-blur-sm ring-1 ring-white/40 flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform">
                      <Icon size={24} />
                    </div>
                    <div className="flex flex-col items-end gap-1.5">
                      {stat.passed && (
                        <div className="chip-lab !bg-white/90 !text-lab-700 backdrop-blur">
                          <CheckCircle2 size={12} /> 已通过
                        </div>
                      )}
                      <div className="chip-physics !bg-white/90 !text-physics-700 backdrop-blur">
                        <DifficultyStars level={stat.avgDiff} />
                      </div>
                    </div>
                  </div>
                  <h2 className="relative font-serif font-bold text-2xl text-white tracking-tight mt-3 drop-shadow-sm">
                    {topic.title}
                  </h2>
                </div>

                <div className="p-5 space-y-4">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Chip variant="physics">{stat.chapterCount} 个章节</Chip>
                    <Chip variant="ink">{stat.questionCount} 道题</Chip>
                    {stat.bestScore > 0 && (
                      <Chip variant={stat.passed ? 'lab' : 'energy'}>
                        历史最高 {stat.bestScore} 分
                      </Chip>
                    )}
                  </div>

                  <div className="rounded-xl2 bg-ink-50/70 p-4 ring-1 ring-ink-100">
                    <div className="flex items-center gap-1.5 text-[11px] font-semibold text-physics-600 mb-1.5 uppercase tracking-wide">
                      <BrainCircuit size={12} />
                      AI 学习材料预览
                    </div>
                    <p className="text-sm text-ink-600 leading-6">
                      {preview}…
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    {stat.chapterCount > 0 && (
                      <div className="flex items-start gap-2 flex-1 min-w-0">
                        <div className="text-[10px] font-semibold text-physics-500 mt-1 whitespace-nowrap">
                          {topic.outline[0].chapter.slice(0, 10)}
                        </div>
                        <div className="flex-1 h-1.5 mt-1.5 rounded-full bg-physics-100 overflow-hidden">
                          <div
                            className={`h-full bg-gradient-to-r ${gradient}`}
                            style={{ width: `${(stat.bestScore || 0)}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2.5 pt-1">
                    <button
                      onClick={() => navigate(`/theory/topics/${topic.id}`)}
                      className="btn-primary flex-1 !py-2.5 text-sm"
                    >
                      <BrainCircuit size={16} />
                      进入 AI 自学
                    </button>
                    <button
                      onClick={() => startQuickQuiz(topic.id)}
                      className="btn-outline flex-1 !py-2.5 text-sm border-physics-200 text-physics-700"
                    >
                      <PlayCircle size={16} />
                      直接去检测
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
