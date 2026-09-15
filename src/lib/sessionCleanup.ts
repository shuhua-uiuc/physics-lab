/**
 * 退出登录时清掉「属于这个人」的数据，避免共享电脑上换人登录读到上一个人的记录。
 *
 * 只清这些是有讲究的：
 *  - `quizSessions` 后端没有随 bootstrap 强拉的读取来源（在线时虽会拉，但登出到
 *    下次登录之间会残留），必须清；
 *  - `coinTxs` 虽会被 bootstrap 重拉，但清掉能缩短「上一个人的流水还挂在那儿」的窗口；
 *  - `groups` / `projects` / `topics` 等 org 级数据**不清**——它们登录时会被强制重拉，
 *    清了反而会在登录失败时闪一片空白；
 *  - `review_questions`（题库审核池）**不清**——那是师生共用的本地数据，
 *    清了会把教师上传的题一起删掉。
 *
 * 是否调用由调用方按 `apiEnabled` 判断：离线模式没有后端可回填，清了会把本地演示数据清光。
 * 这里不自己判断也不 import apiClient，免得形成 sessionCleanup → apiClient 的循环依赖。
 */
import { LS_KEYS } from '../data/mockData';
import { useTheoryStore } from '../store/theoryStore';
import { useCoinStore } from '../store/coinStore';

export function clearBusinessData(): void {
  useTheoryStore.setState({ quizSessions: [] });
  useCoinStore.setState({ coinTxs: [] });
  clearPersonalKeys();
}

/** 只清 localStorage 里的个人数据。401 分支做整页跳转、拿不到 store 时也能单独用。 */
export function clearPersonalKeys(): void {
  try {
    localStorage.removeItem(LS_KEYS.QUIZ_SESSIONS);
  } catch {
    /* 隐私模式等 localStorage 不可用时忽略 */
  }
}
