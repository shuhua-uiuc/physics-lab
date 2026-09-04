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
    const [
      groups,
      users,
      topics,
      questions,
      challenges,
      projects,
      recruitments,
      showcase,
      coinTxs,
      classMeta,
    ] = await Promise.all([
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

    useGroupStore.setState({
      groups,
      users,
      classMeta,
    });

    useTheoryStore.setState({
      topics,
      questions,
      challenges: reviveDates(challenges, ['deadline']),
    });

    useProjectStore.setState({
      projects: reviveDates(projects, ['startDate', 'dueDate']),
      recruitments: reviveDates(recruitments, ['deadline']),
      showcaseItems: reviveDates(showcase, ['createdAt']),
    });

    useCoinStore.setState({
      // 后端返回最新在前，这里归一化为时间正序（与离线模式的追加顺序一致），
      // 避免依赖数组顺序的展示逻辑（如 reverse+slice）取错区间
      coinTxs: reviveDates(coinTxs, ['createdAt']).sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      ),
    });

    loaded = true;
  })();

  try {
    await loadingPromise;
  } finally {
    loadingPromise = null;
  }
}
