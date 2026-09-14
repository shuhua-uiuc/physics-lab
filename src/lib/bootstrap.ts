/**
 * 数据引导层。
 *
 * 当启用后端（VITE_API_BASE_URL 已配置）时：
 *   - 登录后调用 bootstrapFromApi()，从后端批量拉取全量数据，
 *     直接注入各 Zustand store 的内存状态。
 *   - 页面组件继续同步读取 store 字段（groups/users/projects...），读路径零改动。
 *
 * 未启用后端时：本模块不做任何事，前端保持原有 localStorage 离线模式。
 */
import { apiEnabled } from './apiClient';
import {
  groupsApi,
  usersApi,
  theoryApi,
  projectsApi,
  recruitmentsApi,
  showcaseApi,
} from './apiService';
import { useGroupStore } from '../store/groupStore';
import { useProjectStore } from '../store/projectStore';
import { useCoinStore } from '../store/coinStore';
import { useTheoryStore } from '../store/theoryStore';
import { useSafetyStore } from '../store/safetyStore';
import { coinsApi } from './apiService';
import { reviveDates } from './reviveDates';

let loaded = false;
let loadingPromise: Promise<void> | null = null;

export function isBootstrapped(): boolean {
  return loaded;
}

export function resetBootstrap(): void {
  loaded = false;
  loadingPromise = null;
}

/**
 * 从后端拉取全量数据并注入各 store。幂等：重复调用返回同一 Promise。
 */
export async function bootstrapFromApi(force = false): Promise<void> {
  if (!apiEnabled) return;
  if (loaded && !force) return;
  if (loadingPromise && !force) return loadingPromise;

  loadingPromise = (async () => {
    const pick = <T>(r: PromiseSettledResult<T>): T | null => (r.status === 'fulfilled' ? r.value : null);

    // 单个接口失败（如过期 token、网络抖动）不再中断整批拉取；成功的部分照常注入，
    // 失败字段保持 store 原有数据，避免整页回退旧数据且无提示。
    const [rGroups, rUsers, rTopics, rQuestions, rChallenges, rProjects, rRecruits, rShowcase, rCoinTxs, rClassMeta] =
      await Promise.allSettled([
        groupsApi.list(),
        usersApi.list(),
        theoryApi.topics(),
        theoryApi.questions(),
        theoryApi.challenges(),
        projectsApi.list(),
        recruitmentsApi.list(),
        showcaseApi.list(),
        coinsApi.transactions() as Promise<any[]>,
        coinsApi.classMeta(),
      ]);

    const groups = pick(rGroups);
    const users = pick(rUsers);
    const classMeta = pick(rClassMeta);
    if (groups != null || users != null || classMeta != null) {
      useGroupStore.setState({
        ...(groups != null ? { groups } : {}),
        ...(users != null ? { users } : {}),
        ...(classMeta != null ? { classMeta } : {}),
      });
    }

    const topics = pick(rTopics);
    const questions = pick(rQuestions);
    const challenges = pick(rChallenges);

    // 安全题与理论题共用 questions 表，必须在这里分流：
    //   - 带 safetyCategory 的 → safetyStore（安全考核用）
    //   - 其余 → theoryStore（理论题库）
    // 分流是必须的：QuizPage 有几处兜底直接用 useTheoryStore.questions.slice(0,10)，
    // 若安全题混进 theoryStore，理论测验可能抽到安全题。
    const safetyQuestions = questions ? questions.filter((q) => q.safetyCategory) : null;
    const theoryQuestions = questions ? questions.filter((q) => !q.safetyCategory) : null;
    if (safetyQuestions != null) {
      useSafetyStore.setState({ questions: safetyQuestions });
    }

    if (topics != null || theoryQuestions != null || challenges != null) {
      useTheoryStore.setState({
        ...(topics != null ? { topics } : {}),
        ...(theoryQuestions != null ? { questions: theoryQuestions } : {}),
        ...(challenges != null ? { challenges: reviveDates(challenges, ['deadline']) } : {}),
      });
    }

    const projects = pick(rProjects);
    const recruitments = pick(rRecruits);
    const showcase = pick(rShowcase);
    if (projects != null || recruitments != null || showcase != null) {
      useProjectStore.setState({
        ...(projects != null ? { projects: reviveDates(projects, ['startDate', 'dueDate']) } : {}),
        ...(recruitments != null ? { recruitments: reviveDates(recruitments, ['deadline']) } : {}),
        ...(showcase != null ? { showcaseItems: reviveDates(showcase, ['createdAt']) } : {}),
      });
    }

    const coinTxs = pick(rCoinTxs);
    if (coinTxs != null) {
      useCoinStore.setState({
        // 后端返回最新在前，这里归一化为时间正序（与离线模式的追加顺序一致），
        // 避免依赖数组顺序的展示逻辑（如 reverse+slice）取错区间
        coinTxs: reviveDates(coinTxs, ['createdAt']).sort(
          (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        ),
      });
    }

    loaded = true;
  })();

  try {
    await loadingPromise;
  } finally {
    loadingPromise = null;
  }
}
