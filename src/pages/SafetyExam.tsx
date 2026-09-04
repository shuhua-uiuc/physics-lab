import { useState, useMemo, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useProjectStore } from '@/store/projectStore';
import { useTheoryStore } from '@/store/theoryStore';
import { useAuthStore } from '@/store/authStore';
import { useUIStore } from '@/store/uiStore';
import Checkbox from '@/components/ui/Checkbox';
import ProgressRing from '@/components/ui/ProgressRing';
import ReactMarkdown from 'react-markdown';
import { safetyNotices, sampleExamQuestions, buildSafetyQuestions } from '@/data/safetyContent';
import { Question, SafetyCategory } from '@/data/mockData';
import {
  Shield, AlertTriangle, CheckCircle, BookOpen, ClipboardCheck, Unlock,
  ChevronLeft, ChevronRight, Send, Clock
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

type ExamStep = 'notice' | 'quiz' | 'result';

const STEPS = [
  { key: 'notice', label: '安全须知', icon: <BookOpen size={16} /> },
  { key: 'quiz',   label: '在线考核', icon: <ClipboardCheck size={16} /> },
  { key: 'result', label: '考核结果', icon: <CheckCircle size={16} /> },
];

const CATEGORY_LABEL: Record<SafetyCategory, string> = {
  electric: '电气', thermal: '热学', optical: '光学',
  mechanical: '机械', radiation: '辐射', chemical: '化学', combined: '综合',
};

function isAnswerCorrect(q: Question, userAnswer: any): boolean {
  if (q.type === 'multiple') {
    const correct = (q.answer as number[]).slice().sort().join(',');
    const user = Array.isArray(userAnswer) ? userAnswer.slice().sort().join(',') : '';
    return correct === user;
  }
  if (q.type === 'judge') return Boolean(userAnswer) === Boolean(q.answer);
  return Number(userAnswer) === Number(q.answer);
}

export default function SafetyExam() {
  const { id = '', category } = useParams<{ id: string; category: SafetyCategory }>();
  const navigate = useNavigate();
  const project = useProjectStore((s) => s.getProjectById(id));
  const updateStatus = useProjectStore((s) => s.updateStatus);
  const markSafetyPass = useProjectStore((s) => s.markSafetyPass);
  const theoryQuestions = useTheoryStore((s) => s.questions);
  const userId = useAuthStore((s) => s.userId);
  const pushToast = useUIStore((s) => s.pushToast);

  const examCategory = category || project?.safetyCategory;

  const [step, setStep] = useState<ExamStep>('notice');
  const [agreed, setAgreed] = useState(false);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [currentQ, setCurrentQ] = useState(0);
  const [submitted, setSubmitted] = useState<null | { score: number; passed: boolean }>(null);
  const [frozenHintOpen, setFrozenHintOpen] = useState(false);

  const notice = examCategory ? safetyNotices[examCategory] : null;

  useEffect(() => {
    if (step !== 'quiz' || questions.length > 0 || !examCategory) return;
    let pool = theoryQuestions.filter((q) => q.safetyCategory === examCategory);
    if (pool.length < 10) {
      const built = buildSafetyQuestions().filter(
        (q) => q.safetyCategory === examCategory
      );
      pool = [...pool, ...built];
    }
    setQuestions(sampleExamQuestions(examCategory, pool, 10));
  }, [step, questions.length, examCategory, theoryQuestions]);

  if (!examCategory || !notice) {
    return (
      <div className="container mx-auto py-16 text-center">
        <AlertTriangle size={48} className="mx-auto text-danger-400 mb-4" />
        <h2 className="text-xl font-serif text-mission-800 mb-2">安全考核未找到</h2>
        <button className="btn-outline mt-4" onClick={() => navigate('/safety-lab')}>返回安全实验室</button>
      </div>
    );
  }

  const goQuiz = () => {
    if (!agreed) {
      pushToast('请先勾选「我已阅读并理解上述所有内容」', 'warning');
      return;
    }
    setStep('quiz');
  };

  const handleAnswer = (qid: string, val: any) => {
    setAnswers((prev) => ({ ...prev, [qid]: val }));
  };

  const toggleMultiple = (qid: string, idx: number) => {
    const cur: number[] = Array.isArray(answers[qid]) ? [...answers[qid]] : [];
    const i = cur.indexOf(idx);
    if (i >= 0) cur.splice(i, 1);
    else cur.push(idx);
    handleAnswer(qid, cur);
  };

  const submitExam = () => {
    const unanswered = questions.filter((q) => answers[q.id] === undefined);
    if (unanswered.length > 0) {
      pushToast(`还有 ${unanswered.length} 道题未作答`, 'warning');
      return;
    }
    let correct = 0;
    questions.forEach((q) => {
      if (isAnswerCorrect(q, answers[q.id])) correct++;
    });
    const score = Math.round((correct / questions.length) * 100);
    const passed = score >= 80;
    setSubmitted({ score, passed });
    setStep('result');

    if (passed) {
      if (project && userId) markSafetyPass(project.id, userId);
      pushToast(`恭喜通过安全考核！得分 ${score} 分`, 'success');
    } else {
      if (project) updateStatus(project.id, 'frozen');
      setFrozenHintOpen(true);
      pushToast(`未通过安全考核（${score} 分），30 分钟后方可重考`, 'error');
    }
  };

  const answeredCount = Object.keys(answers).length;

  return (
    <div className="container mx-auto py-6 px-4 md:px-6 max-w-5xl">
      <button onClick={() => navigate(project ? `/projects/${project.id}` : '/safety-lab')} className="btn-ghost mb-4 -ml-2 text-sm">
        <ChevronRight size={16} className="rotate-180" />
        {project ? '返回项目详情' : '返回安全实验室'}
      </button>

      <div className="card-base p-4 mb-5 flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex items-center gap-3 flex-1">
          <div className="w-12 h-12 rounded-xl2 bg-grad-mission text-white flex items-center justify-center shadow-md">
            <Shield size={24} />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="font-serif text-lg font-semibold text-mission-900 truncate">{project ? project.title : `${CATEGORY_LABEL[examCategory]}安全考核`}</h2>
            <div className="flex flex-wrap gap-2 mt-1">
              <span className="chip chip-mission">{CATEGORY_LABEL[examCategory]}安全</span>
              <span className="chip chip-ink">考核 10 题 · 80 分通过</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {STEPS.map((s, i) => (
            <div key={s.key} className="flex items-center">
              <div
                className={cn(
                  'flex items-center gap-2 px-3 py-2 rounded-xl2 text-sm transition',
                  step === s.key
                    ? 'bg-grad-mission text-white shadow-md'
                      : STEPS.findIndex((x) => x.key === step) > i
                        ? 'bg-growth-50 text-growth-700 ring-1 ring-growth-200'
                      : 'bg-ink-50 text-ink-400'
                )}
              >
                <span className="flex items-center justify-center w-5 h-5 rounded-full border-current border text-[11px] font-bold">
                  {STEPS.findIndex((x) => x.key === step) > i ? <CheckCircle size={12} strokeWidth={3} /> : i + 1}
                </span>
                <span className="font-medium">{s.label}</span>
              </div>
              {i < STEPS.length - 1 && <ChevronRight size={16} className="text-ink-300 mx-1" />}
            </div>
          ))}
        </div>
      </div>

      <AnimatePresence mode="wait">
        {step === 'notice' && (
          <motion.div
            key="notice"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.25 }}
            className="card-base overflow-hidden"
          >
            <div className="bg-gradient-to-r from-mission-500 to-mission-600 text-white px-6 py-4">
              <h3 className="font-serif text-xl font-bold flex items-center gap-2">
                <Shield size={22} />
                {notice.title}
              </h3>
              <p className="text-white/80 text-sm mt-1">请务必仔细阅读并理解以下所有内容</p>
            </div>
            <div className="p-6 max-h-[60vh] overflow-y-auto scroll-thin">
              <div className="prose-safety max-w-none">
                <ReactMarkdown>{notice.content}</ReactMarkdown>
              </div>
              <div className="mt-6 p-4 rounded-xl2 bg-growth-50 ring-1 ring-growth-200">
                <h4 className="font-serif font-semibold text-growth-800 mb-2.5 flex items-center gap-2">
                  <Unlock size={16} />
                  安全操作要点（记住这些关键规范）
                </h4>
                <div className="flex flex-wrap gap-2">
                  {notice.keyPoints.map((kp, i) => (
                    <span key={i} className="chip chip-lab text-[12px] px-3 py-1.5">
                      <span className="font-bold mr-1 opacity-70">{i + 1}.</span>
                      {kp}
                    </span>
                  ))}
                </div>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-mission-50 bg-ink-50/60 flex flex-col sm:flex-row sm:items-center gap-4 sm:justify-between">
              <Checkbox
                checked={agreed}
                onCheckedChange={setAgreed}
                label="我已阅读并理解上述所有安全须知内容，愿意严格遵守操作规程"
              />
              <button onClick={goQuiz} className="btn-primary min-w-[180px]">
                我已理解，开始考核
                <ChevronRight size={16} />
              </button>
            </div>
          </motion.div>
        )}

        {step === 'quiz' && questions.length > 0 && (
          <motion.div
            key="quiz"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.25 }}
            className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-5"
          >
            <div className="card-base p-4 h-fit sticky top-4">
              <div className="text-xs text-ink-500 mb-2 flex items-center justify-between">
                <span>答题卡</span>
                <span className="font-semibold text-mission-700">{answeredCount}/{questions.length}</span>
              </div>
              <div className="grid grid-cols-5 gap-2">
                {questions.map((q, i) => {
                  const done = answers[q.id] !== undefined;
                  const cur = i === currentQ;
                  return (
                    <button
                      key={q.id}
                      onClick={() => setCurrentQ(i)}
                      className={cn(
                        'aspect-square rounded-lg text-sm font-bold transition',
                        cur
                          ? 'bg-grad-mission text-white shadow-md ring-2 ring-mission-200'
                            : done
                              ? 'bg-growth-100 text-growth-700 ring-1 ring-growth-300'
                            : 'bg-ink-50 text-ink-500 hover:bg-ink-100'
                      )}
                    >
                      {i + 1}
                    </button>
                  );
                })}
              </div>
              <div className="mt-4 h-2 rounded-full bg-ink-100 overflow-hidden">
                <div
                  className="h-full bg-grad-growth transition-all"
                  style={{ width: `${(answeredCount / questions.length) * 100}%` }}
                />
              </div>
              <button
                onClick={submitExam}
                className="btn-energy w-full mt-4"
              >
                <Send size={16} />
                提交试卷
              </button>
            </div>

            <div className="card-base p-6">
              {(() => {
                const q = questions[currentQ];
                const ua = answers[q.id];
                return (
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <span className="inline-flex items-center justify-center w-9 h-9 rounded-xl2 bg-grad-mission text-white font-serif font-bold">
                          {currentQ + 1}
                        </span>
                        <span className={cn(
                          'chip',
                          q.type === 'single' ? 'chip-mission' : q.type === 'multiple' ? 'chip-energy' : 'chip-growth'
                        )}>
                          {q.type === 'single' ? '单选题' : q.type === 'multiple' ? '多选题' : '判断题'}
                        </span>
                        <span className="chip chip-ink">知识点：{q.knowledgePoint}</span>
                      </div>
                      <span className="text-sm text-ink-500 flex items-center gap-1">
                        <Clock size={14} />
                        共 {questions.length} 题
                      </span>
                    </div>
                    <div className="text-lg font-medium text-mission-900 mb-6 leading-relaxed">
                      {q.stem}
                    </div>
                    <div className="space-y-2.5">
                      {q.options.map((opt, i) => {
                        let active = false;
                        if (q.type === 'multiple') active = Array.isArray(ua) && ua.includes(i);
                        else if (q.type === 'judge') active = Boolean(ua) === (i === 0);
                        else active = Number(ua) === i;
                        const letter = String.fromCharCode(65 + i);
                        return (
                          <button
                            key={i}
                            onClick={() =>
                              q.type === 'multiple'
                                ? toggleMultiple(q.id, i)
                                : handleAnswer(q.id, q.type === 'judge' ? i === 0 : i)
                            }
                            className={cn(
                              'w-full text-left p-4 rounded-xl2 border transition flex items-start gap-3',
                              active
                                ? 'border-mission-400 bg-mission-50 ring-2 ring-mission-100'
                                : 'border-mission-100 bg-white hover:bg-ink-50 hover:border-mission-200'
                            )}
                          >
                            <span
                              className={cn(
                                'flex-shrink-0 w-7 h-7 rounded-full border-2 flex items-center justify-center font-bold text-sm',
                                active
                                  ? 'bg-mission-500 border-mission-500 text-white'
                                  : 'border-ink-300 text-ink-500'
                              )}
                            >
                              {q.type === 'judge' ? (i === 0 ? '✓' : '✗') : letter}
                            </span>
                            <span className={cn('text-sm flex-1 pt-0.5', active ? 'text-mission-800 font-medium' : 'text-ink-700')}>
                              {opt}
                            </span>
                          </button>
                        );
                      })}
                    </div>

                    <div className="flex items-center justify-between mt-8 pt-4 border-t border-mission-50">
                      <button
                        onClick={() => setCurrentQ((v) => Math.max(0, v - 1))}
                        disabled={currentQ === 0}
                        className="btn-outline"
                      >
                        <ChevronLeft size={16} />
                        上一题
                      </button>
                      {currentQ < questions.length - 1 ? (
                        <button onClick={() => setCurrentQ((v) => v + 1)} className="btn-primary">
                          下一题
                          <ChevronRight size={16} />
                        </button>
                      ) : (
                        <button onClick={submitExam} className="btn-energy">
                          <Send size={16} />
                          提交试卷
                        </button>
                      )}
                    </div>
                  </div>
                );
              })()}
            </div>
          </motion.div>
        )}

        {step === 'result' && submitted && (
          <motion.div
            key="result"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="card-base p-8 md:p-10 text-center"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 220, damping: 14, delay: 0.1 }}
              className="mx-auto mb-6"
            >
              {submitted.passed ? (
                <div className="relative inline-block">
                  <div className="absolute inset-0 rounded-full bg-growth-200 blur-2xl opacity-60 animate-pulse" />
                  <ProgressRing
                    value={submitted.score}
                    size={180}
                    strokeWidth={14}
                    trackColor="#C2F1E6"
                    indicatorColor="#00BFA5"
                    showLabel={false}
                  />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: 'spring', delay: 0.4 }}
                      className="w-24 h-24 rounded-full bg-grad-growth text-white flex items-center justify-center shadow-lg"
                    >
                      <CheckCircle size={56} strokeWidth={3} />
                    </motion.div>
                  </div>
                </div>
              ) : (
                <div className="relative inline-block">
                  <div className="absolute inset-0 rounded-full bg-danger-200 blur-2xl opacity-60" />
                  <ProgressRing
                    value={submitted.score}
                    size={180}
                    strokeWidth={14}
                    trackColor="#F9CAC7"
                    indicatorColor="#E53935"
                    showLabel={false}
                  />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <motion.div
                      initial={{ scale: 0, rotate: -20 }}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={{ type: 'spring', delay: 0.4 }}
                      className="w-24 h-24 rounded-full bg-grad-danger text-white flex items-center justify-center shadow-lg"
                    >
                      <AlertTriangle size={52} strokeWidth={2.5} />
                    </motion.div>
                  </div>
                </div>
              )}
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
              <h2 className={cn(
                'font-serif text-3xl font-bold mb-2',
                submitted.passed ? 'text-growth-700' : 'text-danger-700'
              )}>
                {submitted.passed ? '安全考核通过！' : '考核未通过'}
              </h2>
              <p className="text-ink-600 mb-4">
                本次得分 <span className="font-mono font-bold text-2xl mx-1 text-mission-800">{submitted.score}</span> 分
                <span className="text-ink-400 mx-1">（</span>
                80 分通过
                <span className="text-ink-400 mx-1">）</span>
              </p>

              {submitted.passed ? (
                <div className="max-w-md mx-auto mb-6 p-5 rounded-xl2 bg-growth-50 ring-1 ring-growth-200 text-left space-y-2">
                  <div className="flex items-center gap-2 font-semibold text-growth-800">
                    <Unlock size={18} />
                    已解锁实验权限
                  </div>
                  <p className="text-sm text-ink-600 leading-relaxed">
                    你已通过【{CATEGORY_LABEL[examCategory]}安全】考核，可以进入相关实验阶段。
                    请在实验中继续严格遵守安全操作规程，确保人身与设备安全。
                  </p>
                </div>
              ) : (
                <div className="max-w-md mx-auto mb-6 p-5 rounded-xl2 bg-danger-50 ring-1 ring-danger-200 text-left space-y-2">
                  <div className="flex items-center gap-2 font-semibold text-danger-800">
                    <Clock size={18} />
                    项目已进入冻结状态
                  </div>
                  <p className="text-sm text-ink-600 leading-relaxed">
                    根据平台规则，安全考核未通过将自动冻结项目，防止未受训人员进入危险实验环节。
                    请在 <strong className="text-danger-700">30 分钟后</strong> 重新发起考核。
                  </p>
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <button
                  onClick={() => navigate(`/projects/${project.id}`)}
                  className={submitted.passed ? 'btn-primary' : 'btn-outline'}
                >
                  返回项目详情
                </button>
                {!submitted.passed && (
                  <button
                    onClick={() => {
                      setAnswers({});
                      setSubmitted(null);
                      setCurrentQ(0);
                      setAgreed(false);
                      setStep('notice');
                    }}
                    disabled
                    className="btn-ghost cursor-not-allowed opacity-70"
                  >
                    <Clock size={15} />
                    30 分钟后可重新考核
                  </button>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
