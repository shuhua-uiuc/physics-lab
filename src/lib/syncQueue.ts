/**
 * 后端写同步辅助。
 *
 * 设计目标：让各 store 的写方法保持“同步接口”（UI 层零改动、返回值语义不变），
 * 同时在启用后端时把写操作持久化到 FastAPI 后端。
 *
 * 策略：乐观更新 + 后台同步。
 *   - store 方法先在本地内存/localStorage 完成状态更新并同步返回；
 *   - 若 apiEnabled，则在后台 fire-and-forget 调用后端 API；
 *   - 后端调用失败时记录告警（不回滚本地状态，保证离线可用体验），
 *     并可选地触发一次全量重拉以纠正偏差。
 *
 * 未启用后端时（apiEnabled=false），syncToApi 直接跳过，行为与原离线模式一致。
 */
import { apiEnabled } from './apiClient';
import { useUIStore } from '../store/uiStore';

type Task = () => Promise<unknown>;

let lastError: { at: number; message: string } | null = null;
let lastToastAt = 0;

export function getLastSyncError() {
  return lastError;
}

/**
 * 在后台执行一次后端写操作（fire-and-forget）。
 *
 * @param task    实际的 API 调用（返回 Promise）
 * @param label   用于日志的可读标签
 */
export function syncToApi(task: Task, label: string): void {
  if (!apiEnabled) return;
  // 不 await：保持调用方同步返回
  void task().catch((err: any) => {
    const message = err?.message || String(err);
    lastError = { at: Date.now(), message: `${label}: ${message}` };
    console.warn(`[sync] ${label} 同步后端失败：`, message);
    // 提示用户（节流，避免连发刷屏），让"表面改了但没入库"可见
    const now = Date.now();
    if (now - lastToastAt > 10000) {
      lastToastAt = now;
      useUIStore.getState().pushToast(`同步后端失败：${label}，请刷新或重试`, 'error');
    }
  });
}
