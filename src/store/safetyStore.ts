/**
 * 安全题库 store —— 教师维护安全考核题的单一数据源
 *
 * 数据持久化在 localStorage（键 plab_safety_questions）：
 *  - 首次使用以内置题库 buildSafetyQuestions() 为默认兜底
 *  - 教师新增/编辑/删除/导入后即时落盘，学生安全考核页读取同一份数据
 *  - 「恢复默认」可还原为内置题库
 */
import { create } from 'zustand';
import { Question, SafetyCategory, loadLS, saveLS } from '../data/mockData';
import { buildSafetyQuestions } from '../data/safetyContent';

const LS_KEY = 'plab_safety_questions';

const uid = () => `sq-custom-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

export interface SafetyQuestionInput {
  type: Question['type'];
  stem: string;
  options: string[];
  answer: Question['answer'];
  knowledgePoint: string;
  safetyCategory: SafetyCategory;
  difficulty?: 1 | 2 | 3;
}

function loadInitial(): Question[] {
  const cached = loadLS<Question[] | null>(LS_KEY, null);
  if (cached && Array.isArray(cached) && cached.length > 0) return cached;
  return buildSafetyQuestions();
}

/** 清洗并校验导入的题目，返回合法题目数组 */
export function normalizeQuestions(raw: any[]): Question[] {
  const validCats: SafetyCategory[] = ['electric', 'thermal', 'optical', 'mechanical', 'radiation', 'chemical', 'combined'];
  const out: Question[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const cat = validCats.includes(item.safetyCategory) ? item.safetyCategory : 'combined';
    const stem = String(item.stem || '').trim();
    const options = Array.isArray(item.options) ? item.options.map((o: any) => String(o).trim()).filter(Boolean) : [];
    const type = ['single', 'multiple', 'judge'].includes(item.type) ? item.type : 'single';
    const rawAnswer: any = item.answer;
    let answer: Question['answer'];
    if (type === 'judge') {
      answer = rawAnswer === true || rawAnswer === 'true' || rawAnswer === '正确' || rawAnswer === 1;
      if (options.length !== 2 || options[0] !== '正确' || options[1] !== '错误') {
        options.splice(0, options.length, '正确', '错误');
      }
    } else if (type === 'multiple') {
      const arr = Array.isArray(rawAnswer) ? rawAnswer : [rawAnswer];
      answer = arr
        .map(Number)
        .filter((n) => Number.isInteger(n) && n >= 0 && n < options.length);
    } else {
      const n = Array.isArray(rawAnswer) ? Number(rawAnswer[0]) : Number(rawAnswer);
      answer = Number.isInteger(n) && n >= 0 && n < options.length ? n : 0;
    }
    if (!stem || options.length < 2) continue;
    out.push({
      id: String(item.id || uid()),
      type,
      stem,
      options,
      answer,
      knowledgePoint: String(item.knowledgePoint || '').trim(),
      difficulty: ([1, 2, 3].includes(Number(item.difficulty)) ? Number(item.difficulty) : 1) as 1 | 2 | 3,
      safetyCategory: cat,
    });
  }
  return out;
}

interface SafetyState {
  questions: Question[];
  addQuestion: (q: SafetyQuestionInput) => Question;
  updateQuestion: (id: string, patch: Partial<SafetyQuestionInput>) => void;
  deleteQuestion: (id: string) => void;
  /** 导入题目：merge=按题干去重合并，replace=整体替换 */
  importQuestions: (raw: any[], mode: 'merge' | 'replace') => number;
  resetToDefault: () => void;
}

const persist = (questions: Question[]) => saveLS(LS_KEY, questions);

export const useSafetyStore = create<SafetyState>((set, get) => ({
  questions: loadInitial(),

  addQuestion: (q) => {
    const question: Question = {
      id: uid(),
      difficulty: 1,
      ...q,
    } as Question;
    const questions = [...get().questions, question];
    persist(questions);
    set({ questions });
    return question;
  },

  updateQuestion: (id, patch) => {
    const questions = get().questions.map((q) => (q.id === id ? { ...q, ...patch } : q));
    persist(questions);
    set({ questions });
  },

  deleteQuestion: (id) => {
    const questions = get().questions.filter((q) => q.id !== id);
    persist(questions);
    set({ questions });
  },

  importQuestions: (raw, mode) => {
    const incoming = normalizeQuestions(raw);
    if (mode === 'replace') {
      persist(incoming);
      set({ questions: incoming });
      return incoming.length;
    }
    // merge：按题干去重，已存在的跳过
    const existingStems = new Set(get().questions.map((q) => q.stem));
    const fresh = incoming.filter((q) => !existingStems.has(q.stem));
    const questions = [...get().questions, ...fresh];
    persist(questions);
    set({ questions });
    return fresh.length;
  },

  resetToDefault: () => {
    const questions = buildSafetyQuestions();
    persist(questions);
    set({ questions });
  },
}));
