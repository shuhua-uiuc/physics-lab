import { create } from 'zustand';
import {
  PhysicsTopic,
  Question,
  QuizSession,
  Challenge,
  ChallengeSubmission,
  LS_KEYS,
  loadLS,
  saveLS,
} from '../data/mockData';
import { useCoinStore } from './coinStore';
import { useGroupStore } from './groupStore';
import { theoryApi, groupsApi, usersApi, coinsApi } from '../lib/apiService';
import { syncToApi } from '../lib/syncQueue';
import { reviveDates } from '../lib/reviveDates';

/**
 * 结算/挑战写操作后，后端已改动小组余额与交易流水，也可能新增/更新挑战。
 * 这里重拉挑战与结算相关数据并注入对应 store，纠正本地乐观值与后端的差异。
 */
async function refetchAfterChallenge(): Promise<void> {
  const [challenges, groups, users, coinTxs] = await Promise.all([
    theoryApi.challenges(),
    groupsApi.list(),
    usersApi.list(),
    coinsApi.transactions() as Promise<any[]>,
  ]);
  useTheoryStore.setState({ challenges: reviveDates(challenges, ['deadline']) });
  useGroupStore.setState({ groups, users });
  useCoinStore.setState({ coinTxs: reviveDates(coinTxs, ['createdAt']) });
}

interface TheoryState {
  topics: PhysicsTopic[];
  questions: Question[];
  quizSessions: QuizSession[];
  challenges: Challenge[];
  startQuiz: (topicId: string) => QuizSession;
  submitAnswer: (sessionId: string, qid: string, answer: any) => void;
  gradeQuiz: (sessionId: string) => QuizSession;
  createChallenge: (params: {
    title: string;
    creatorGroupId: string;
    topicId: string;
    questionIds: string[];
    reward: number;
    deadline: Date;
  }) => Challenge;
  acceptChallenge: (challengeId: string, solverGroupId: string) => Question[];
  submitChallengeAnswers: (
    challengeId: string,
    solverGroupId: string,
    answers: Record<string, any>
  ) => { accuracy: number; earned: number };
  getTopicQuestions: (topicId: string) => Question[];
}

const uid = () => `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

const isAnswerCorrect = (question: Question, userAnswer: any): boolean => {
  if (question.type === 'multiple') {
    // 拷贝后再排序，避免就地修改持久化的题目答案
    const correct = [...(question.answer as number[])].sort().join(',');
    const user = Array.isArray(userAnswer) ? [...userAnswer].sort().join(',') : '';
    return correct === user;
  }
  if (question.type === 'judge') {
    return Boolean(userAnswer) === Boolean(question.answer);
  }
  return Number(userAnswer) === Number(question.answer);
};

export const useTheoryStore = create<TheoryState>((set, get) => {
  const initialTopics = loadLS<PhysicsTopic[]>(LS_KEYS.TOPICS, []);
  const initialQuestions = loadLS<Question[]>(LS_KEYS.QUESTIONS, []);
  const initialQuizSessions = loadLS<QuizSession[]>(LS_KEYS.QUIZ_SESSIONS, []);
  const initialChallenges = loadLS<Challenge[]>(LS_KEYS.CHALLENGES, []);

  const persist = (
    topics: PhysicsTopic[],
    questions: Question[],
    quizSessions: QuizSession[],
    challenges: Challenge[]
  ) => {
    saveLS(LS_KEYS.TOPICS, topics);
    saveLS(LS_KEYS.QUESTIONS, questions);
    saveLS(LS_KEYS.QUIZ_SESSIONS, quizSessions);
    saveLS(LS_KEYS.CHALLENGES, challenges);
  };

  return {
    topics: initialTopics,
    questions: initialQuestions,
    quizSessions: initialQuizSessions,
    challenges: initialChallenges,

    getTopicQuestions: (topicId) => {
      return get().questions.filter((q) => q.topicId === topicId);
    },

    // 测验属于本地评估会话：题库已在登录时 bootstrap 到本地，
    // 选题、答题、判分均在前端完成（返回值需同步供页面立即使用）。
    // 后端只在“挑战结算”环节参与正式记账，普通自测不落库。
    startQuiz: (topicId) => {
      const { questions, quizSessions, topics, challenges } = get();
      const topicQuestions = questions.filter((q) => q.topicId === topicId);
      const kpMap: Record<string, Question[]> = {};
      topicQuestions.forEach((q) => {
        if (!kpMap[q.knowledgePoint]) kpMap[q.knowledgePoint] = [];
        kpMap[q.knowledgePoint].push(q);
      });
      const kps = Object.keys(kpMap);
      const picked: Question[] = [];
      const perKp = Math.max(1, Math.floor(10 / kps.length));
      kps.forEach((kp) => {
        const pool = kpMap[kp];
        const take = Math.min(perKp, pool.length);
        const shuffled = [...pool].sort(() => Math.random() - 0.5).slice(0, take);
        picked.push(...shuffled);
      });
      while (picked.length < 10 && topicQuestions.length > picked.length) {
        const remain = topicQuestions.filter((q) => !picked.includes(q));
        picked.push(remain[Math.floor(Math.random() * remain.length)]);
      }
      const finalQuestions = picked.slice(0, 10);
      const session: QuizSession = {
        id: `qs_${uid()}`,
        topicId,
        questions: finalQuestions,
        userAnswers: {},
        score: 0,
        passed: false,
        blindPoints: [],
        createdAt: new Date(),
      };
      const next = [...quizSessions, session];
      persist(topics, questions, next, challenges);
      set({ quizSessions: next });
      return session;
    },

    submitAnswer: (sessionId, qid, answer) => {
      const { quizSessions, topics, questions, challenges } = get();
      const next = quizSessions.map((s) =>
        s.id === sessionId
          ? { ...s, userAnswers: { ...s.userAnswers, [qid]: answer } }
          : s
      );
      persist(topics, questions, next, challenges);
      set({ quizSessions: next });
    },

    gradeQuiz: (sessionId) => {
      const { quizSessions, topics, questions, challenges } = get();
      let graded: QuizSession | null = null;
      const next = quizSessions.map((s) => {
        if (s.id !== sessionId) return s;
        let correct = 0;
        const blindSet = new Set<string>();
        s.questions.forEach((q) => {
          const userAns = s.userAnswers[q.id];
          if (userAns !== undefined && isAnswerCorrect(q, userAns)) {
            correct++;
          } else {
            blindSet.add(q.knowledgePoint);
          }
        });
        const total = s.questions.length || 1;
        const score = Math.round((correct / total) * 100);
        graded = {
          ...s,
          score,
          passed: score >= 80,
          blindPoints: Array.from(blindSet),
        };
        return graded;
      });
      persist(topics, questions, next, challenges);
      set({ quizSessions: next });
      return graded!;
    },

    createChallenge: ({ title, creatorGroupId, topicId, questionIds, reward, deadline }) => {
      const { topics, questions, quizSessions, challenges } = get();

      useCoinStore.getState().addTx(creatorGroupId, {
        source: 'challenge',
        refId: `pre_${uid()}`,
        delta: -reward,
        note: `创建挑战「${title}」预扣能量币`,
      });

      const challenge: Challenge = {
        id: `ch_${uid()}`,
        title,
        creatorGroupId,
        topicId,
        questionIds,
        reward,
        deadline,
        status: 'open',
        submissions: [],
      };
      const next = [...challenges, challenge];
      persist(topics, questions, quizSessions, next);
      set({ challenges: next });
      // 后端会预扣悬赏并生成自己的挑战 ID，创建成功后重拉对齐挑战与余额。
      syncToApi(async () => {
        await theoryApi.createChallenge({
          title,
          topicId,
          questionIds,
          reward,
          deadline: (deadline instanceof Date ? deadline : new Date(deadline)).toISOString(),
        });
        await refetchAfterChallenge();
      }, 'challenges.create');
      return challenge;
    },

    acceptChallenge: (challengeId, solverGroupId) => {
      const { challenges, questions } = get();
      const challenge = challenges.find((c) => c.id === challengeId);
      if (!challenge) return [];
      const qs = challenge.questionIds
        .map((qid) => questions.find((q) => q.id === qid))
        .filter(Boolean) as Question[];
      if (qs.length === 0) {
        return questions
          .filter((q) => q.topicId === challenge.topicId)
          .slice(0, 10)
          .map((q) => ({ ...q }));
      }
      return qs.map((q) => ({ ...q }));
    },

    submitChallengeAnswers: (challengeId, solverGroupId, answers) => {
      const { topics, questions, quizSessions, challenges } = get();
      let accuracy = 0;
      let earned = 0;

      const nextChallenges = challenges.map((c) => {
        if (c.id !== challengeId) return c;
        const qs = c.questionIds
          .map((qid) => questions.find((q) => q.id === qid))
          .filter(Boolean) as Question[];
        const actualQs =
          qs.length > 0
            ? qs
            : questions.filter((q) => q.topicId === c.topicId).slice(0, 10);
        let correct = 0;
        actualQs.forEach((q) => {
          const ua = answers[q.id];
          if (ua !== undefined && isAnswerCorrect(q, ua)) correct++;
        });
        const total = actualQs.length || 1;
        accuracy = correct / total;

        const result = useCoinStore.getState().settleChallenge(c, solverGroupId, accuracy);
        earned = result.solverReward;

        const submission: ChallengeSubmission = {
          groupId: solverGroupId,
          answers,
          accuracy,
          earned,
          submittedAt: new Date(),
        };
        return { ...c, submissions: [...c.submissions, submission] };
      });

      persist(topics, questions, quizSessions, nextChallenges);
      set({ challenges: nextChallenges });
      // 后端按当前 JWT 用户组重新评分并正式结算，完成后重拉对齐余额与挑战流水。
      syncToApi(async () => {
        await theoryApi.submitChallenge(challengeId, answers);
        await refetchAfterChallenge();
      }, 'challenges.submit');
      return { accuracy, earned };
    },
  };
});
