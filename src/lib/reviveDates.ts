/**
 * 把后端返回的日期字符串反序列化为 Date（前端类型多处使用 Date）。
 * 供 bootstrap 与各 store 在重拉后端数据后统一复用。
 */
export function reviveDates<T>(items: T[], dateKeys: string[]): T[] {
  return items.map((item) => {
    const clone: any = { ...item };
    for (const key of dateKeys) {
      if (clone[key]) clone[key] = new Date(clone[key]);
    }
    return clone;
  });
}
