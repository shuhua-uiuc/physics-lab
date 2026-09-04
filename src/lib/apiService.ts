/**
 * 后端资源服务门面：把 REST 端点封装为按业务领域组织的方法，
 * 返回结构与前端 src/data/mockData.ts 的类型保持一致（camelCase）。
 *
 * 供后续 store 接入后端时调用；apiEnabled 为 false 时不应被使用。
 */
import { api } from './apiClient';
import type {
  Group,
  SchoolClass,
  User,
  PhysicsTopic,
  Question,
  QuizSession,
  Challenge,
  Project,
  Recruitment,
  ShowcaseItem,
  ClassMeta,
} from '../data/mockData';

// ---------- Classes ----------
export const classesApi = {
  list: () => api.get<SchoolClass[]>('/api/classes'),
  create: (name: string) => api.post<SchoolClass>('/api/classes', { name }),
  rename: (id: string, name: string) => api.patch<SchoolClass>(`/api/classes/${id}`, { name }),
  remove: (id: string) => api.delete<{ ok: boolean }>(`/api/classes/${id}`),
  listStudents: (classId: string) => api.get<User[]>(`/api/classes/${classId}/students`),
  uploadStudents: (classId: string, students: { name: string; username?: string; password?: string }[]) =>
    api.post<User[]>(`/api/classes/${classId}/students/batch`, { students }),
  deleteStudent: (userId: string) => api.delete<{ ok: boolean }>(`/api/students/${userId}`),
};

// ---------- Admin: Teacher management ----------
export interface TeacherInfo {
  id: string;
  username: string;
  name: string;
  avatar: string;
}

export const teachersApi = {
  list: () => api.get<TeacherInfo[]>('/api/teachers'),
  create: (username: string, password: string, name?: string) =>
    api.post<TeacherInfo>('/api/teachers', { username, password, name }),
  remove: (id: string) => api.delete<{ ok: boolean }>(`/api/teachers/${id}`),
  resetPassword: (id: string, password: string) =>
    api.patch<{ ok: boolean }>(`/api/teachers/${id}/password`, { password }),
};

// ---------- Groups / Users ----------
export const groupsApi = {
  list: (classId?: string) =>
    api.get<Group[]>(`/api/groups${classId ? `?class_id=${classId}` : ''}`),
  create: (name: string, initialCoins: number, classId?: string) =>
    api.post<Group>('/api/groups', { name, initialCoins, classId }),
  rename: (id: string, name: string) => api.patch<Group>(`/api/groups/${id}`, { name }),
  remove: (id: string) => api.delete<{ ok: boolean }>(`/api/groups/${id}`),
  updateContribution: (groupId: string, ratioRecord: Record<string, number>) =>
    api.put<Group>(`/api/groups/${groupId}/contribution`, { ratioRecord }),
  setLeader: (groupId: string, userId: string) =>
    api.put<{ ok: boolean }>(`/api/groups/${groupId}/leader/${userId}`),
  adjustCoins: (groupId: string, delta: number) =>
    api.post<{ balanceAfter: number }>(`/api/groups/${groupId}/coins`, { delta }),
  join: (groupId: string) => api.post<User>(`/api/groups/${groupId}/join`),
};

export const usersApi = {
  list: (groupId?: string) =>
    api.get<User[]>(`/api/users${groupId ? `?group_id=${groupId}` : ''}`),
  listByClass: (classId: string) =>
    api.get<User[]>(`/api/users?class_id=${classId}`),
  listUnassigned: () => api.get<User[]>('/api/users?unassigned=true'),
  get: (userId: string) => api.get<User>(`/api/users/${userId}`),
  updateAvatar: (userId: string, avatar: string) =>
    api.put<User>(`/api/users/${userId}/avatar`, { avatar }),
  assignGroup: (userId: string, groupId: string | null, role: 'leader' | 'member' = 'member') =>
    api.put<User>(`/api/users/${userId}/group`, { groupId, role }),
};

// ---------- Admin: Group class transfer ----------
export const adminGroupsApi = {
  moveClass: (groupId: string, classId: string) =>
    api.patch<Group>(`/api/groups/${groupId}/class`, { classId }),
};

// ---------- Theory ----------
export const theoryApi = {
  topics: () => api.get<PhysicsTopic[]>('/api/topics'),
  questions: (topicId?: string) =>
    api.get<Question[]>(`/api/questions${topicId ? `?topic_id=${topicId}` : ''}`),
  startQuiz: (topicId: string) => api.post<QuizSession>('/api/quiz/start', { topicId }),
  submitAnswer: (sessionId: string, qid: string, answer: unknown) =>
    api.post<QuizSession>(`/api/quiz/${sessionId}/answer`, { qid, answer }),
  gradeQuiz: (sessionId: string) => api.post<QuizSession>(`/api/quiz/${sessionId}/grade`),
  challenges: () => api.get<Challenge[]>('/api/challenges'),
  createChallenge: (payload: {
    title: string;
    topicId: string;
    questionIds: string[];
    reward: number;
    deadline: string;
  }) => api.post<Challenge>('/api/challenges', payload),
  challengeQuestions: (challengeId: string) =>
    api.get<Question[]>(`/api/challenges/${challengeId}/questions`),
  submitChallenge: (challengeId: string, answers: Record<string, unknown>) =>
    api.post<Challenge>(`/api/challenges/${challengeId}/submit`, { answers }),
};

// ---------- Projects / Recruitments / Showcase ----------
export const projectsApi = {
  list: () => api.get<Project[]>('/api/projects'),
  get: (id: string) => api.get<Project>(`/api/projects/${id}`),
  create: (payload: Partial<Project> & { title: string; topic: string }) =>
    api.post<Project>('/api/projects', payload),
  updateStatus: (id: string, status: string) =>
    api.put<Project>(`/api/projects/${id}/status`, { status }),
  updateProgress: (id: string, progress: number) =>
    api.put<Project>(`/api/projects/${id}/progress`, { progress }),
  markDone: (id: string) => api.post<Project>(`/api/projects/${id}/done`),
  markSafetyPass: (id: string) => api.post<Project>(`/api/projects/${id}/safety-pass`),
};

export const recruitmentsApi = {
  list: (projectId?: string) =>
    api.get<Recruitment[]>(`/api/recruitments${projectId ? `?project_id=${projectId}` : ''}`),
  create: (payload: {
    projectId: string;
    title: string;
    description: string;
    skills: string[];
    reward: number;
    deadline: string;
  }) => api.post<Recruitment>('/api/recruitments', payload),
  bid: (recId: string, payload: { userId: string; skillDesc: string; hours: number }) =>
    api.post<Recruitment>(`/api/recruitments/${recId}/bid`, payload),
  assign: (recId: string, userId: string) =>
    api.put<Recruitment>(`/api/recruitments/${recId}/assign`, { userId }),
  resolve: (recId: string, result: 'success' | 'partial' | 'fail') =>
    api.put<Recruitment>(`/api/recruitments/${recId}/resolve`, { result }),
};

export const showcaseApi = {
  list: () => api.get<ShowcaseItem[]>('/api/showcase'),
  create: (payload: {
    projectId?: string;
    title: string;
    coverImage: string;
    groupId: string;
    description?: string;
  }) => api.post<ShowcaseItem>('/api/showcase', payload),
  toggleLove: (showcaseId: string) =>
    api.post<ShowcaseItem>(`/api/showcase/${showcaseId}/love`),
};

// ---------- Coins / Rankings / Meta ----------
export interface GroupRankRow {
  groupId: string;
  name: string;
  totalCoins: number;
  rank: number;
}
export interface PersonalRankRow {
  userId: string;
  name: string;
  personalCoins: number;
  groupId: string;
  rank: number;
}

export const coinsApi = {
  transactions: (groupId?: string) =>
    api.get(`/api/coin-transactions${groupId ? `?group_id=${groupId}` : ''}`),
  rankings: () =>
    api.get<{ groupRanking: GroupRankRow[]; personalRanking: PersonalRankRow[] }>('/api/rankings'),
  classMeta: () => api.get<ClassMeta>('/api/class-meta'),
};
