/**
 * 学生名单管理 —— 教师/管理员视图
 *
 * 功能：
 *  - 按班级查看学生名单（表格）
 *  - 重命名班级
 *  - 批量上传学生（粘贴名单 / JSON）
 *  - 删除学生
 *  - 每班人数上限 30
 */
import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users,
  School,
  Pencil,
  Plus,
  Trash2,
  X,
  Upload,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
} from 'lucide-react';
import { useUIStore } from '@/store/uiStore';
import { classesApi } from '@/lib/apiService';
import type { SchoolClass, User } from '@/data/mockData';
import { cn } from '@/lib/utils';

const MAX_STUDENTS = 30;

export default function StudentRoster() {
  const pushToast = useUIStore((s) => s.pushToast);

  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [students, setStudents] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  // 班级重命名
  const [editingClass, setEditingClass] = useState<{ id: string; name: string } | null>(null);

  // 上传学生
  const [showUpload, setShowUpload] = useState(false);
  const [uploadText, setUploadText] = useState('');
  const [uploading, setUploading] = useState(false);

  // 删除学生
  const [deleteStudentId, setDeleteStudentId] = useState<{ id: string; name: string } | null>(null);

  // 批量选择
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showBatchDelete, setShowBatchDelete] = useState(false);
  const [batchDeleting, setBatchDeleting] = useState(false);

  const loadClasses = useCallback(async () => {
    try {
      const list = await classesApi.list();
      setClasses(list);
      if (list.length > 0 && !selectedClassId) {
        setSelectedClassId(list[0].id);
      }
    } catch {
      pushToast('班级列表加载失败', 'error');
    }
  }, [pushToast, selectedClassId]);

  const loadStudents = useCallback(async () => {
    if (!selectedClassId) return;
    setLoading(true);
    setSelectedIds(new Set());
    try {
      const list = await classesApi.listStudents(selectedClassId);
      setStudents(list);
    } catch {
      pushToast('学生名单加载失败', 'error');
    } finally {
      setLoading(false);
    }
  }, [selectedClassId, pushToast]);

  useEffect(() => {
    loadClasses();
  }, [loadClasses]);

  useEffect(() => {
    if (selectedClassId) loadStudents();
  }, [selectedClassId, loadStudents]);

  // ---- 操作 ----
  const handleRenameClass = async () => {
    if (!editingClass) return;
    const name = editingClass.name.trim();
    if (!name) return;
    try {
      const cls = await classesApi.rename(editingClass.id, name);
      setClasses((prev) => prev.map((c) => (c.id === cls.id ? cls : c)));
      setEditingClass(null);
      pushToast('班级重命名成功', 'success');
    } catch (err: any) {
      pushToast(err?.message || '重命名失败', 'error');
    }
  };

  const handleUpload = async () => {
    if (!selectedClassId || !uploadText.trim()) return;
    // 解析输入：每行一个学生名，或 JSON 格式
    let items: { name: string; username?: string; password?: string }[] = [];
    const text = uploadText.trim();
    try {
      // 尝试 JSON 解析
      const parsed = JSON.parse(text);
      if (Array.isArray(parsed)) {
        items = parsed.map((p: any) => ({
          name: typeof p === 'string' ? p : p.name,
          username: p.username,
          password: p.password,
        }));
      }
    } catch {
      // 非 JSON，按行解析
      items = text
        .split(/[\n,，]/)
        .map((s) => s.trim())
        .filter((s) => s.length > 0)
        .map((name) => ({ name }));
    }

    if (items.length === 0) {
      pushToast('未解析到有效学生名', 'warning');
      return;
    }

    setUploading(true);
    try {
      const created = await classesApi.uploadStudents(selectedClassId, items);
      setStudents((prev) => [...prev, ...created]);
      setUploadText('');
      setShowUpload(false);
      pushToast(`成功导入 ${created.length} 名学生`, 'success');
    } catch (err: any) {
      pushToast(err?.message || '上传失败', 'error');
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteStudent = async () => {
    if (!deleteStudentId) return;
    try {
      await classesApi.deleteStudent(deleteStudentId.id);
      setStudents((prev) => prev.filter((u) => u.id !== deleteStudentId.id));
      setDeleteStudentId(null);
      pushToast(`已删除学生「${deleteStudentId.name}」`, 'success');
    } catch (err: any) {
      pushToast(err?.message || '删除失败', 'error');
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === students.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(students.map((s) => s.id)));
    }
  };

  const handleBatchDelete = async () => {
    setBatchDeleting(true);
    const ids = Array.from(selectedIds);
    let ok = 0;
    let fail = 0;
    for (const id of ids) {
      try {
        await classesApi.deleteStudent(id);
        ok++;
      } catch {
        fail++;
      }
    }
    setStudents((prev) => prev.filter((u) => !selectedIds.has(u.id)));
    setSelectedIds(new Set());
    setShowBatchDelete(false);
    setBatchDeleting(false);
    if (fail === 0) {
      pushToast(`已批量删除 ${ok} 名学生`, 'success');
    } else {
      pushToast(`删除完成：成功 ${ok} 人，失败 ${fail} 人`, 'warning');
    }
  };

  const selectedClass = classes.find((c) => c.id === selectedClassId);
  const remainingSlots = MAX_STUDENTS - students.length;

  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-mission-400 to-nova-600 flex items-center justify-center text-white shadow-lg">
          <Users size={28} strokeWidth={2.2} />
        </div>
        <div>
          <span className="chip-mission !py-0.5 !px-2 !text-[10px]">ROSTER</span>
          <h1 className="mt-1 text-[24px] font-extrabold text-ink-900 tracking-tight">学生名单</h1>
          <p className="text-[13px] text-ink-500 font-medium">按班级查看 · 批量导入 · 每班上限 {MAX_STUDENTS} 人</p>
        </div>
      </div>

      {/* 班级选择 + 操作栏 */}
      <div className="glass-card p-5 rounded-[22px] flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 flex-1 min-w-[200px]">
          <School size={18} className="text-mission-500 shrink-0" />
          <select
            value={selectedClassId}
            onChange={(e) => setSelectedClassId(e.target.value)}
            className="input-field cursor-pointer"
          >
            {classes.length === 0 ? (
              <option value="">暂无班级</option>
            ) : (
              classes.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))
            )}
          </select>
        </div>
        {selectedClass && (
          <>
            <button
              onClick={() => setEditingClass({ id: selectedClass.id, name: selectedClass.name })}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl glass-card glass-card-hover text-[13px] font-semibold text-ink-600 hover:text-mission-600"
            >
              <Pencil size={15} /> 改班级名
            </button>
            <button
              onClick={() => setShowUpload(true)}
              disabled={remainingSlots <= 0}
              className="btn-mission disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2 !py-2.5"
            >
              <Upload size={16} /> 导入学生
            </button>
            {selectedIds.size > 0 && (
              <button
                onClick={() => setShowBatchDelete(true)}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-br from-danger-400 to-danger-600 text-white text-[13px] font-semibold hover:shadow-[0_0_0_1px_rgba(239,68,68,0.25),0_12px_40px_rgba(239,68,68,0.22)] transition-all"
              >
                <Trash2 size={15} /> 批量删除 ({selectedIds.size})
              </button>
            )}
          </>
        )}
      </div>

      {/* 统计 */}
      {selectedClass && !loading && (
        <div className="flex items-center gap-3 flex-wrap">
          <span className="chip-mission !py-1 !px-3 inline-flex items-center gap-1.5">
            <Users size={13} /> {students.length} / {MAX_STUDENTS} 人
          </span>
          {remainingSlots > 0 ? (
            <span className="chip-nova !py-1 !px-3">还可导入 {remainingSlots} 人</span>
          ) : (
            <span className="chip-alert !py-1 !px-3 inline-flex items-center gap-1.5">
              <AlertTriangle size={13} /> 已满员
            </span>
          )}
        </div>
      )}

      {/* 学生名单表格 */}
      {loading ? (
        <div className="glass-card p-10 rounded-[22px] text-center text-ink-400 flex items-center justify-center gap-2">
          <Loader2 size={20} className="animate-spin" /> 加载中…
        </div>
      ) : students.length === 0 ? (
        <div className="glass-card p-10 rounded-[22px] text-center text-ink-400">
          该班级暂无学生，点击「导入学生」添加
        </div>
      ) : (
        <div className="glass-card rounded-[22px] overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-ink-100/60">
                <th className="px-5 py-3 w-10">
                  <input
                    type="checkbox"
                    checked={selectedIds.size === students.length && students.length > 0}
                    onChange={toggleSelectAll}
                    className="w-4 h-4 rounded accent-mission-500 cursor-pointer"
                  />
                </th>
                <th className="text-left text-[11px] font-bold text-ink-400 uppercase tracking-wider px-5 py-3">序号</th>
                <th className="text-left text-[11px] font-bold text-ink-400 uppercase tracking-wider px-5 py-3">姓名</th>
                <th className="text-left text-[11px] font-bold text-ink-400 uppercase tracking-wider px-5 py-3">用户名</th>
                <th className="text-left text-[11px] font-bold text-ink-400 uppercase tracking-wider px-5 py-3">小组</th>
                <th className="text-left text-[11px] font-bold text-ink-400 uppercase tracking-wider px-5 py-3">角色</th>
                <th className="text-right text-[11px] font-bold text-ink-400 uppercase tracking-wider px-5 py-3">操作</th>
              </tr>
            </thead>
            <tbody>
              {students.map((s, i) => (
                <tr key={s.id} className="border-b border-ink-50/40 hover:bg-mission-50/30 transition group">
                  <td className="px-5 py-3">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(s.id)}
                      onChange={() => toggleSelect(s.id)}
                      className="w-4 h-4 rounded accent-mission-500 cursor-pointer"
                    />
                  </td>
                  <td className="px-5 py-3 text-[13px] text-ink-400 font-mono">{i + 1}</td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2.5">
                      <img src={s.avatar} alt={s.name} className="w-7 h-7 rounded-lg object-cover bg-mission-100" />
                      <span className="text-[13px] font-semibold text-ink-800">{s.name}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-[12px] text-ink-500 font-mono">{s.id}</td>
                  <td className="px-5 py-3 text-[12px] text-ink-500">{s.groupId || <span className="text-ink-300">未分组</span>}</td>
                  <td className="px-5 py-3">
                    {s.role === 'leader' ? (
                      <span className="chip-nova !py-0 !px-1.5 !text-[10px]">组长</span>
                    ) : (
                      <span className="text-[12px] text-ink-400">组员</span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-right">
                    <button
                      onClick={() => setDeleteStudentId({ id: s.id, name: s.name })}
                      className="w-7 h-7 rounded-lg hover:bg-danger-50 flex items-center justify-center text-ink-400 hover:text-danger-600 transition opacity-0 group-hover:opacity-100 inline-flex"
                      title="删除"
                    >
                      <Trash2 size={13} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ===== Modals ===== */}

      {/* 重命名班级 */}
      <Modal open={!!editingClass} onClose={() => setEditingClass(null)} title="重命名班级" icon={Pencil}>
        <input
          type="text"
          value={editingClass?.name || ''}
          onChange={(e) => setEditingClass((prev) => (prev ? { ...prev, name: e.target.value } : null))}
          className="input-field"
          placeholder="班级名称"
          autoFocus
          onKeyDown={(e) => e.key === 'Enter' && handleRenameClass()}
        />
        <div className="flex gap-2 mt-4">
          <button className="btn-ghost-mission flex-1" onClick={() => setEditingClass(null)}>取消</button>
          <button className="btn-mission flex-1" onClick={handleRenameClass}>确认</button>
        </div>
      </Modal>

      {/* 导入学生 */}
      <Modal open={showUpload} onClose={() => setShowUpload(false)} title="批量导入学生" icon={Upload}>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="field-label">学生名单</label>
            <span className="text-[11px] text-ink-400">
              当前 {students.length} 人 · 还可导入 {remainingSlots} 人
            </span>
          </div>
          <textarea
            value={uploadText}
            onChange={(e) => setUploadText(e.target.value)}
            className="input-field min-h-[180px] resize-y font-mono text-[13px]"
            placeholder={'每行一个学生姓名，或用逗号分隔：\n张三\n李四\n王五\n\n或 JSON 格式：\n[{"name":"张三","username":"zs001","password":"abc123"}]'}
            autoFocus
          />
          <div className="flex items-center gap-2 text-[12px] text-ink-400">
            <CheckCircle2 size={14} className="text-growth-500" />
            未提供用户名/密码时将自动生成，默认密码 student123
          </div>
        </div>
        <div className="flex gap-2 mt-4">
          <button className="btn-ghost-mission flex-1" onClick={() => setShowUpload(false)}>取消</button>
          <button
            className="btn-mission flex-1 inline-flex items-center justify-center gap-2"
            onClick={handleUpload}
            disabled={uploading || !uploadText.trim()}
          >
            {uploading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
            {uploading ? '导入中…' : '确认导入'}
          </button>
        </div>
      </Modal>

      {/* 删除学生确认 */}
      <ConfirmModal
        open={!!deleteStudentId}
        onClose={() => setDeleteStudentId(null)}
        onConfirm={handleDeleteStudent}
        title="删除学生"
        message={`确定删除学生「${deleteStudentId?.name}」吗？此操作不可撤销，该学生将无法登录。`}
        confirmText="确认删除"
        danger
      />

      {/* 批量删除确认 */}
      <ConfirmModal
        open={showBatchDelete}
        onClose={() => setShowBatchDelete(false)}
        onConfirm={handleBatchDelete}
        title="批量删除学生"
        message={`确定删除选中的 ${selectedIds.size} 名学生吗？此操作不可撤销，被删除的学生将无法登录。`}
        confirmText={batchDeleting ? '删除中…' : '确认批量删除'}
        danger
      />
    </div>
  );
}

// ---------- Reusable modals ----------

function Modal({
  open,
  onClose,
  title,
  icon: Icon,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  icon: any;
  children: React.ReactNode;
}) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] bg-black/30 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, y: 10 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.95, y: 10 }}
            className="glass-card w-full max-w-[520px] rounded-[24px] p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-mission-400 to-nova-500 flex items-center justify-center text-white">
                  <Icon size={16} />
                </div>
                <h3 className="text-[16px] font-bold text-ink-800">{title}</h3>
              </div>
              <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-ink-100 flex items-center justify-center text-ink-400">
                <X size={16} />
              </button>
            </div>
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function ConfirmModal({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmText,
  danger,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText: string;
  danger?: boolean;
}) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] bg-black/30 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, y: 10 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.95, y: 10 }}
            className="glass-card w-full max-w-[400px] rounded-[24px] p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3 mb-4">
              <div className={cn(
                'w-10 h-10 rounded-xl flex items-center justify-center shrink-0',
                danger ? 'bg-danger-50 text-danger-600' : 'bg-alert-50 text-alert-600'
              )}>
                <AlertTriangle size={20} />
              </div>
              <div>
                <h3 className="text-[16px] font-bold text-ink-800">{title}</h3>
                <p className="text-[13px] text-ink-500 mt-1 leading-relaxed">{message}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button className="btn-ghost-mission flex-1" onClick={onClose}>取消</button>
              <button
                className={cn('flex-1 inline-flex items-center justify-center gap-2 !py-2.5 rounded-xl text-[14px] font-semibold text-white transition-all', danger ? 'bg-gradient-to-br from-danger-400 to-danger-600 hover:shadow-[0_0_0_1px_rgba(239,68,68,0.25),0_12px_40px_rgba(239,68,68,0.22)]' : 'btn-mission')}
                onClick={onConfirm}
              >
                <CheckCircle2 size={16} /> {confirmText}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
