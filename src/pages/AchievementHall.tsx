import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Trophy,
  Heart,
  Eye,
  Image as ImageIcon,
  Video,
  FileText,
  Box,
  Medal,
  Sparkles,
  MessageSquare,
  LineChart,
  BarChart3,
  Activity,
  BookOpen,
  Upload,
  X,
  Plus,
} from 'lucide-react';
import {
  LineChart as ReLineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import MissionShell from '@/components/layout/MissionShell';
import AvatarStack from '@/components/ui/AvatarStack';
import { useGroupStore } from '@/store/groupStore';
import { useProjectStore } from '@/store/projectStore';
import { useAuthStore } from '@/store/authStore';
import { useUIStore } from '@/store/uiStore';
import { User } from '@/data/mockData';
import { cn } from '@/lib/utils';

type GalleryTab = 'photo' | 'video' | 'paper' | 'model' | 'award';

const GALLERY_TABS: Array<{ key: GalleryTab; label: string; icon: any }> = [
  { key: 'photo', label: '照片展', icon: ImageIcon },
  { key: 'video', label: '视频', icon: Video },
  { key: 'paper', label: '论文', icon: FileText },
  { key: 'model', label: '模型', icon: Box },
  { key: 'award', label: '获奖作品', icon: Medal },
];

function useTicker(target: number, duration = 800) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    let raf: number;
    const t0 = performance.now();
    const step = (now: number) => {
      const p = Math.min(1, (now - t0) / duration);
      const ease = 1 - Math.pow(1 - p, 3);
      setVal(Math.round(target * ease));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return val;
}

interface ShowcaseCard {
  id: string;
  imageUrl: string;
  title: string;
  groupId: string;
  loves: number;
  views: number;
  spanRows: number;
  spanCols: number;
  authorId: string;
}

const PHYSICS_IMAGES = [
  'https://images.unsplash.com/photo-1551985974-b826bc6379f5?w=800&q=80',
  'https://images.unsplash.com/photo-1589492477829-5e65395b667c?w=800&q=80',
  'https://images.unsplash.com/photo-1581093638397-826761c65f61?w=800&q=80',
  'https://images.unsplash.com/photo-1614529072589-3f6c59b6d9d5?w=800&q=80',
  'https://images.unsplash.com/photo-1592861956093-46574388857e?w=800&q=80',
  'https://images.unsplash.com/photo-1583465766507-a37458119065?w=800&q=80',
  'https://images.unsplash.com/photo-1598431786950-17348736a25a?w=800&q=80',
  'https://images.unsplash.com/photo-1594812470835-245e7e979070?w=800&q=80',
  'https://images.unsplash.com/photo-1596854407442-870262d3d051?w=800&q=80',
  'https://images.unsplash.com/photo-1621361164796-86878265944d?w=800&q=80',
  'https://images.unsplash.com/photo-1551985974-b826bc6379f5?w=800&q=80',
  'https://images.unsplash.com/photo-1589492477829-5e65395b667c?w=800&q=80',
  'https://images.unsplash.com/photo-1581093638397-826761c65f61?w=800&q=80',
  'https://images.unsplash.com/photo-1614529072589-3f6c59b6d9d5?w=800&q=80',
  'https://images.unsplash.com/photo-1592861956093-46574388857e?w=800&q=80',
  'https://images.unsplash.com/photo-1583465766507-a37458119065?w=800&q=80',
  'https://images.unsplash.com/photo-1598431786950-17348736a25a?w=800&q=80',
  'https://images.unsplash.com/photo-1594812470835-245e7e979070?w=800&q=80',
];

const TITLES_BY_TYPE: Record<GalleryTab, string[]> = {
  photo: [
    '磁悬浮列车模型 · 稳定悬浮 12mm',
    '太阳能电池效率对比曲线',
    '驻波共振 · 弦振动节点可视化',
    '数字示波器自动采集系统',
    '黑体辐射维恩位移定律验证',
    '云室 α 粒子径迹拍摄',
    '霍尔效应三维磁场扫描图',
    '自制简易电动机 · 转速 3600rpm',
    '单摆测重力加速度 · 9.798 m/s²',
    'RLC 串联谐振 Q 值测量',
    '薄膜干涉 · 牛顿环拍摄',
    '多普勒效应声频演示',
  ],
  video: [
    '核链式反应科普动画短片',
    '电磁感应发电原理演示',
    '光的双缝干涉实验视频',
    '自由落体运动慢动作',
    '回旋加速器工作原理',
    '热力学第二定律演示',
    '楞次定律动画讲解',
    '平抛运动轨迹追踪',
    '电磁振荡阻尼演示',
    '光电效应实验录像',
    '布朗运动微观观察',
    '热传导过程可视化',
  ],
  paper: [
    '光纤通信 BER 眼图实测分析',
    '弗兰克-赫兹实验 4.9eV 激发峰研究',
    '密立根油滴 · 元电荷测量论文',
    '迈克尔逊干涉仪激光校准方法',
    '康普顿散射能谱拟合研究',
    '塞曼效应实验数据分析',
    '普朗克常数测量误差分析',
    '原子光谱精细结构研究',
    '真空二极管伏安特性',
    '压电效应频率响应测量',
    '核磁共振信号检测',
    '超导临界温度测定',
  ],
  model: [
    '电磁炮原理演示模型',
    '风力发电机原型设计',
    '太阳能小车驱动系统',
    '简易示波器电路模型',
    '蒸汽机原理演示器',
    '全息投影光路搭建',
    '无线电发射接收装置',
    '电解水制氢装置',
    '地震波检测仪模型',
    '微型火箭推进系统',
    '热机效率演示装置',
    '磁流体发电模型',
  ],
  award: [
    '全国青少年科技创新大赛一等奖',
    '省级物理实验竞赛金奖',
    '市青少年科技节特等奖',
    '创新实践活动优秀成果奖',
    '科普作品创作大赛一等奖',
    '实验技能竞赛团体冠军',
    '研究性学习成果一等奖',
    '科技创新市长奖',
    '优秀科技辅导员奖',
    '青少年科学影像节一等奖',
    '机器人大赛创新奖',
    '科技论文评比一等奖',
  ],
};

function buildShowcaseCards(type: GalleryTab): ShowcaseCard[] {
  const titles = TITLES_BY_TYPE[type];
  const result: ShowcaseCard[] = [];
  for (let i = 0; i < 12; i++) {
    let spanRows = 1;
    let spanCols = 1;
    if (i % 4 === 0) spanRows = 2;
    if (i % 6 === 0) spanCols = 2;
    result.push({
      id: `sc-${type}-${i + 1}`,
      imageUrl: PHYSICS_IMAGES[i % PHYSICS_IMAGES.length],
      title: titles[i] || `${type}成果 #${i + 1}`,
      groupId: `g-${(i % 6) + 1}`,
      loves: 40 + ((i * 13) % 120),
      views: 300 + ((i * 47) % 900),
      spanRows,
      spanCols,
      authorId: `u-${String(((i * 3) % 30) + 1).padStart(2, '0')}`,
    });
  }
  return result;
}

const HALL_OF_FAME = [
  {
    id: 'hof-1',
    imageUrl: 'https://images.unsplash.com/photo-1621361164796-86878265944d?w=600&q=80',
    rank: 1,
    title: '磁悬浮列车 · 电磁推进原型车',
    author: '杨静',
    authorId: 'u-06',
    groupId: 'g-1',
    comment: '结构设计大胆，线圈排布合理，悬浮稳定性极为出色。建议下一步尝试加入直线电机段。',
    tutor: '李教授 · 电磁学教研室',
    loves: 248,
  },
  {
    id: 'hof-2',
    imageUrl: 'https://images.unsplash.com/photo-1592861956093-46574388857e?w=600&q=80',
    rank: 2,
    title: '黑体辐射 · 高温铂金片拟合曲线',
    author: '赵磊',
    authorId: 'u-07',
    groupId: 'g-2',
    comment: '数据点覆盖了 300K→1200K 宽温区，与普朗克公式相关系数高达 0.997，实验报告可作范本。',
    tutor: '王副教授 · 热物理实验室',
    loves: 196,
  },
  {
    id: 'hof-3',
    imageUrl: 'https://images.unsplash.com/photo-1583465766507-a37458119065?w=600&q=80',
    rank: 3,
    title: '云室 α 径迹 · 扩散云室自制装置',
    author: '马超',
    authorId: 'u-13',
    groupId: 'g-3',
    comment: '学生团队独立完成了扩散云室的搭建，密封与温控做得非常专业，径迹清晰可辨。',
    tutor: '陈研究员 · 近代物理中心',
    loves: 162,
  },
];

const DATASETS = [
  {
    id: 'ds-1',
    title: '电磁感应发电效率曲线对比',
    subtitle: '3 种线圈匝数 · 5 级转速',
    color: '#4F7CFF',
    chip: 'chip-mission',
    chart: 'line' as const,
    data: [
      { rpm: '300', 'N=50': 42, 'N=100': 68, 'N=200': 88 },
      { rpm: '600', 'N=50': 58, 'N=100': 85, 'N=200': 115 },
      { rpm: '900', 'N=50': 74, 'N=100': 112, 'N=200': 152 },
      { rpm: '1200', 'N=50': 88, 'N=100': 138, 'N=200': 188 },
      { rpm: '1500', 'N=50': 102, 'N=100': 160, 'N=200': 218 },
      { rpm: '1800', 'N=50': 115, 'N=100': 178, 'N=200': 242 },
    ],
  },
  {
    id: 'ds-2',
    title: '各小组课题完成度分布',
    subtitle: '6 舰队 · 3 种进度状态',
    color: '#FF8A34',
    chip: 'chip-energy',
    chart: 'bar' as const,
    data: [
      { name: '牛顿', done: 8, progress: 4, frozen: 1 },
      { name: '麦氏', done: 7, progress: 5, frozen: 0 },
      { name: '爱因', done: 6, progress: 6, frozen: 2 },
      { name: '特斯', done: 6, progress: 4, frozen: 1 },
      { name: '伽利', done: 5, progress: 7, frozen: 0 },
      { name: '薛定', done: 4, progress: 6, frozen: 2 },
    ],
  },
  {
    id: 'ds-3',
    title: '挑战大厅 · 平均正确率趋势',
    subtitle: '近 8 场综合知识挑战',
    color: '#22C55E',
    chip: 'chip-growth',
    chart: 'line' as const,
    data: [
      { round: 'R1', 牛顿: 68, 麦氏: 62, 爱因: 71, 特斯: 65 },
      { round: 'R2', 牛顿: 72, 麦氏: 65, 爱因: 68, 特斯: 70 },
      { round: 'R3', 牛顿: 70, 麦氏: 70, 爱因: 75, 特斯: 68 },
      { round: 'R4', 牛顿: 76, 麦氏: 68, 爱因: 72, 特斯: 74 },
      { round: 'R5', 牛顿: 74, 麦氏: 73, 爱因: 78, 特斯: 76 },
      { round: 'R6', 牛顿: 79, 麦氏: 71, 爱因: 76, 特斯: 78 },
      { round: 'R7', 牛顿: 77, 麦氏: 75, 爱因: 80, 特斯: 79 },
      { round: 'R8', 牛顿: 82, 麦氏: 78, 爱因: 83, 特斯: 81 },
    ],
  },
];

const GROUP_NAMES6 = ['牛顿先锋队', '麦克斯韦闪电队', '爱因斯坦脑洞组', '特斯拉电流团', '伽利略观测站', '薛定谔猫队'];

export default function AchievementHall() {
  const { groups, users } = useGroupStore();
  const { showcaseItems, addShowcaseItem } = useProjectStore();
  const { groupId, userId } = useAuthStore();
  const pushToast = useUIStore((s) => s.pushToast);
  
  const [tab, setTab] = useState<GalleryTab>('photo');
  const [lovedCards, setLovedCards] = useState<Set<string>>(new Set());
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [uploadForm, setUploadForm] = useState({
    type: 'photo' as GalleryTab,
    title: '',
    description: '',
    imageUrl: '',
  });

  const toggleLove = (id: string) => {
    setLovedCards((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setUploadForm((prev) => ({ ...prev, imageUrl: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUpload = () => {
    if (!uploadForm.title.trim()) return pushToast('请填写作品标题', 'warning');
    if (!uploadForm.imageUrl) return pushToast('请上传图片', 'warning');
    if (!groupId) return pushToast('请先登录', 'warning');
    
    addShowcaseItem({
      title: uploadForm.title.trim(),
      coverImage: uploadForm.imageUrl,
      groupId,
      description: uploadForm.description.trim(),
    });
    
    pushToast('作品上传成功！', 'success');
    setUploadDialogOpen(false);
    setUploadForm({ type: 'photo', title: '', description: '', imageUrl: '' });
  };

  const distributeByWaterfall = (list: ShowcaseCard[], cols: number) => {
    const colHeights = Array(cols).fill(0);
    const colCards: ShowcaseCard[][] = Array.from({ length: cols }, () => []);
    list.forEach((card) => {
      const minIdx = colHeights.indexOf(Math.min(...colHeights));
      colCards[minIdx].push(card);
      colHeights[minIdx] += card.spanRows;
    });
    return colCards;
  };

  const cards = useMemo(() => {
    // 真实展示墙：用 showcaseItems，不再拼接 buildShowcaseCards 的假卡片
    return showcaseItems.map((item) => ({
      id: item.id,
      imageUrl: item.coverImage,
      title: item.title,
      groupId: item.groupId,
      loves: item.loves,
      views: item.loves * 2 + 60,
      spanRows: 1,
      spanCols: 1,
      authorId: userId || '',
    }));
  }, [showcaseItems, userId]);

  const columns3 = distributeByWaterfall(cards, 3);

  return (
    <MissionShell>
      <div className="space-y-6">
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="glass-card p-6 md:p-8 rounded-[28px] relative overflow-hidden"
        >
          <div className="absolute -top-10 right-10 w-72 h-72 rounded-full bg-alert-400/10 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-20 left-0 w-80 h-80 rounded-full bg-nova-400/10 blur-3xl pointer-events-none" />
          <div className="relative z-10 grid grid-cols-12 gap-6 items-center">
            <div className="col-span-12 lg:col-span-7">
              <div className="flex flex-wrap items-center gap-4">
                <div className="relative shrink-0">
                  <div className="w-20 h-20 rounded-[24px] bg-gradient-to-br from-alert-400 via-energy-500 to-danger-500 flex items-center justify-center shadow-glowEnergy">
                    <Trophy size={34} className="text-white" />
                  </div>
                  <div className="absolute -inset-2 rounded-[28px] bg-gradient-to-br from-alert-400/20 via-energy-400/15 to-transparent blur-xl -z-10 animate-pulse" />
                  <Sparkles
                    size={20}
                    className="absolute -top-2 -right-2 text-alert-400 animate-floatY drop-shadow-[0_0_10px_rgba(245,158,11,0.6)]"
                  />
                </div>
                <div className="min-w-0">
                  <span className="mission-label">HALL OF ACHIEVEMENTS · PUBLIC EXHIBITION</span>
                  <h1 className="mt-3 text-[30px] md:text-[36px] font-extrabold text-ink-900 leading-[1.1] tracking-tight">
                    Achievement Hall
                    <span className="block text-gradient-energy mt-1">成果展览馆</span>
                  </h1>
                  <p className="mt-2 text-[14px] text-ink-500 max-w-xl">
                    优秀研究成果将被整个基地看见。最佳作品可获得教授推荐信、全国创新大赛直通名额。
                  </p>
                </div>
              </div>
            </div>
            <div className="col-span-12 lg:col-span-5">
              <div className="glass-card !shadow-none p-1.5 rounded-2xl border-mission-100/70 inline-flex flex-wrap gap-1 w-full justify-end">
                {GALLERY_TABS.map((t) => {
                  const Icon = t.icon;
                  const active = tab === t.key;
                  return (
                    <button
                      key={t.key}
                      onClick={() => setTab(t.key)}
                      className={cn(
                        'px-3.5 py-2 rounded-xl text-[12.5px] font-semibold transition-all flex items-center gap-1.5 flex-1 justify-center',
                        active
                          ? 'bg-gradient-to-br from-mission-500 to-nova-500 text-white shadow-glowMission'
                          : 'text-ink-600 hover:bg-mission-50/60 hover:text-mission-700'
                      )}
                    >
                      <Icon size={14} />
                      {t.label}
                    </button>
                  );
                })}
                <button
                  onClick={() => setUploadDialogOpen(true)}
                  className={cn(
                    'px-3.5 py-2 rounded-xl text-[12.5px] font-semibold transition-all flex items-center gap-1.5',
                    'bg-gradient-to-br from-emerald-500 to-teal-500 text-white shadow-glowEmerald hover:shadow-glowEmerald/80'
                  )}
                >
                  <Upload size={14} />
                  上传作品
                </button>
              </div>
            </div>
          </div>
        </motion.section>

        <div className="grid grid-cols-12 gap-6">
          <div className="col-span-12 lg:col-span-9">
            <div className="flex items-center justify-between mb-4">
              <h2 className="flex items-center gap-2 text-[18px] font-bold text-ink-800">
                <ImageIcon size={20} className="text-mission-500" />
                精选展廊
              </h2>
              <div className="flex items-center gap-3 text-[12px] text-ink-500">
                <span className="chip-mission">{cards.length} 项</span>
                <span className="chip-growth">大成果卡 ×5</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {columns3.map((col, ci) => (
                <div key={ci} className="waterfall-col">
                  {col.map((card, i) => {
                    const group = groups.find((g) => g.id === card.groupId);
                    const gi = parseInt(card.groupId.split('-')[1]) - 1;
                    const loved = lovedCards.has(card.id);
                    const groupChipColor = ['chip-mission', 'chip-energy', 'chip-growth', 'chip-nova', 'chip-alert', 'chip-ink'][gi % 6];
                    return (
                      <motion.article
                        key={card.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4, delay: (ci * 6 + i) * 0.04 }}
                        className={cn(
                          'glass-card glass-card-hover rounded-[22px] overflow-hidden relative group',
                          card.spanRows === 2 && 'row-span-2'
                        )}
                        style={{
                          gridColumn: card.spanCols === 2 && ci === 0 ? 'span 2' : undefined,
                        }}
                      >
                        <div
                          className={cn(
                            'relative w-full overflow-hidden',
                            card.spanRows === 2 ? 'h-64' : 'h-44'
                          )}
                          style={{
                            aspectRatio: card.spanCols === 2 ? '16/9' : undefined,
                          }}
                        >
                          <img
                            src={card.imageUrl}
                            alt={card.title}
                            loading="lazy"
                            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-ink-900/80 via-ink-900/20 to-transparent" />
                          <div className="absolute top-3 left-3">
                            <span className={cn(groupChipColor, '!py-0.5 !px-2 !text-[10px] backdrop-blur-md bg-opacity-80')}>
                              {GROUP_NAMES6[gi % 6]?.slice(0, 4)}
                            </span>
                          </div>
                          {card.spanCols === 2 && (
                            <div className="absolute top-3 right-3">
                              <span className="chip-alert !py-0.5 !px-2 !text-[10px] backdrop-blur-md">
                                <Sparkles size={10} />
                                重磅成果
                              </span>
                            </div>
                          )}
                          <div className="absolute inset-x-0 bottom-0 p-4 pt-10">
                            <h3 className="font-bold text-[14px] md:text-[15px] text-white leading-snug drop-shadow-md mb-2">
                              {card.title}
                            </h3>
                          </div>
                        </div>
                        <div className="p-4 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => toggleLove(card.id)}
                              className={cn(
                                'flex items-center gap-1 text-[12px] font-semibold transition-all',
                                loved ? 'text-danger-600' : 'text-ink-500 hover:text-danger-600'
                              )}
                            >
                              <Heart
                                size={15}
                                fill={loved ? 'currentColor' : 'none'}
                                className={loved ? 'scale-110 transition-transform' : ''}
                              />
                              <span className="ticker tabular-nums">
                                {card.loves + (loved ? 1 : 0)}
                              </span>
                            </button>
                            <div className="flex items-center gap-1 text-[12px] text-ink-500 font-semibold">
                              <Eye size={14} />
                              <span className="ticker tabular-nums">{card.views}</span>
                            </div>
                          </div>
                          <div className="text-[11px] text-ink-400 font-mono">
                            #{card.id.split('-')[1]}
                          </div>
                        </div>
                      </motion.article>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>

          <div className="col-span-12 lg:col-span-3 space-y-5">
            <motion.section
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.45, delay: 0.1 }}
              className="glass-card p-5 rounded-[24px]"
            >
              <div className="flex items-center gap-2.5 mb-4">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-alert-400 to-energy-500 flex items-center justify-center text-white shadow-lg shadow-energy-500/20">
                  <Medal size={18} />
                </div>
                <div>
                  <h3 className="font-bold text-ink-800 text-[15px]">Hall of Fame</h3>
                  <p className="text-[11px] text-ink-400">本月 Top3 杰作</p>
                </div>
              </div>
              <div className="space-y-4">
                {HALL_OF_FAME.map((hof, i) => {
                  const author = users.find((u) => u.id === hof.authorId);
                  return (
                    <motion.div
                      key={hof.id}
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.35, delay: 0.15 + i * 0.06 }}
                      className="p-3 rounded-2xl bg-gradient-to-br from-alert-50/60 via-energy-50/40 to-mission-50/30 border border-alert-100/50 relative"
                    >
                      <div className="absolute -left-1 -top-2 w-8 h-8 rounded-full bg-gradient-to-br from-alert-400 to-energy-500 flex items-center justify-center text-white font-black text-[13px] shadow-lg shadow-energy-500/30 ring-2 ring-white">
                        #{hof.rank}
                      </div>
                      <div className="rounded-xl overflow-hidden aspect-[16/10] mb-3 ring-1 ring-white/60 shadow-sm">
                        <img
                          src={hof.imageUrl}
                          alt={hof.title}
                          loading="lazy"
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <h4 className="font-bold text-[13px] text-ink-800 leading-snug mb-1">{hof.title}</h4>
                      <div className="flex items-center justify-between text-[11px] text-ink-500 mb-2">
                        <span className="flex items-center gap-1.5">
                          {author && (
                            <img
                              src={author.avatar}
                              alt={author.name}
                              className="w-4 h-4 rounded-full ring-1 ring-white"
                            />
                          )}
                          作者：{hof.author}
                        </span>
                        <span className="flex items-center gap-1 font-semibold text-danger-600">
                          <Heart size={11} fill="currentColor" />
                          {hof.loves}
                        </span>
                      </div>
                      <div className="pt-2 border-t border-alert-100/60">
                        <div className="text-[10px] font-semibold text-alert-700 mb-1 flex items-center gap-1">
                          <MessageSquare size={10} />
                          {hof.tutor}
                        </div>
                        <p className="text-[11.5px] text-ink-600 leading-relaxed line-clamp-2">
                          「{hof.comment}」
                        </p>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </motion.section>

            <motion.section
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.45, delay: 0.2 }}
              className="glass-card p-5 rounded-[24px]"
            >
              <div className="flex items-center gap-2.5 mb-4">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-mission-400 to-growth-500 flex items-center justify-center text-white shadow-lg shadow-mission-500/20">
                  <Activity size={18} />
                </div>
                <div>
                  <h3 className="font-bold text-ink-800 text-[15px]">精选数据集</h3>
                  <p className="text-[11px] text-ink-400">开放共享 · 可下载</p>
                </div>
              </div>
              <div className="space-y-3">
                {DATASETS.map((ds, i) => (
                  <motion.div
                    key={ds.id}
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.35, delay: 0.25 + i * 0.06 }}
                    className="p-3.5 rounded-2xl bg-gradient-to-br from-ink-50/80 to-white/60 border border-ink-100/70"
                  >
                    <div className="flex items-start justify-between mb-1">
                      <h4 className="font-bold text-[12.5px] text-ink-800 leading-snug pr-2">{ds.title}</h4>
                      <span className={cn(ds.chip, '!py-0.5 !px-2 !text-[10px] shrink-0 mt-0.5')}>
                        {ds.chart === 'line' ? (
                          <LineChart size={10} />
                        ) : (
                          <BarChart3 size={10} />
                        )}
                      </span>
                    </div>
                    <p className="text-[11px] text-ink-500 mb-2">{ds.subtitle}</p>
                    <div className="h-[90px] -mx-2">
                      <ResponsiveContainer width="100%" height="100%">
                        {ds.chart === 'line' ? (
                          <ReLineChart data={ds.data} margin={{ top: 6, right: 10, left: -22, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                            <XAxis
                              dataKey={Object.keys(ds.data[0])[0]}
                              tick={{ fontSize: 9, fill: '#94A3B8' }}
                              tickLine={false}
                              axisLine={false}
                            />
                            <Tooltip
                              contentStyle={{
                                borderRadius: 10,
                                fontSize: 11,
                                border: '1px solid rgba(255,255,255,0.9)',
                                background: 'rgba(255,255,255,0.95)',
                                boxShadow: '0 8px 24px rgba(15,23,42,0.1)',
                              }}
                            />
                            {Object.keys(ds.data[0])
                              .slice(1)
                              .map((k, ki) => {
                                const palette = ['#4F7CFF', '#FF8A34', '#22C55E', '#8B5CF6'];
                                return (
                                  <Line
                                    key={k}
                                    type="monotone"
                                    dataKey={k}
                                    stroke={palette[ki % 4]}
                                    strokeWidth={1.8}
                                    dot={false}
                                  />
                                );
                              })}
                          </ReLineChart>
                        ) : (
                          <BarChart data={ds.data} margin={{ top: 6, right: 10, left: -22, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                            <XAxis
                              dataKey="name"
                              tick={{ fontSize: 9, fill: '#94A3B8' }}
                              tickLine={false}
                              axisLine={false}
                            />
                            <Tooltip
                              contentStyle={{
                                borderRadius: 10,
                                fontSize: 11,
                                border: '1px solid rgba(255,255,255,0.9)',
                                background: 'rgba(255,255,255,0.95)',
                                boxShadow: '0 8px 24px rgba(15,23,42,0.1)',
                              }}
                            />
                            <Legend wrapperStyle={{ fontSize: 10 }} />
                            <Bar dataKey="done" stackId="a" fill="#22C55E" radius={[0, 0, 0, 0]} />
                            <Bar dataKey="progress" stackId="a" fill="#FF8A34" />
                            <Bar dataKey="frozen" stackId="a" fill="#F04438" radius={[3, 3, 0, 0]} />
                          </BarChart>
                        )}
                      </ResponsiveContainer>
                    </div>
                    <button className="mt-1 w-full btn-ghost !py-1.5 !px-2 text-[11px] justify-start" onClick={() => {
                        const csvContent = [
                          Object.keys(ds.data[0]).join(','),
                          ...ds.data.map(row => Object.values(row).join(','))
                        ].join('\n');
                        const blob = new Blob([`\uFEFF${csvContent}`], { type: 'text/csv;charset=utf-8;' });
                        const link = document.createElement('a');
                        link.href = URL.createObjectURL(blob);
                        link.download = `${ds.title.replace(/[^\w\u4e00-\u9fa5]/g, '_')}.csv`;
                        link.click();
                      }}>
                      <BookOpen size={12} />
                      查看详情 · 下载 CSV
                    </button>
                  </motion.div>
                ))}
              </div>
            </motion.section>
          </div>
        </div>
      </div>
    {uploadDialogOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
        >
          <div className="absolute inset-0 bg-ink-900/60 backdrop-blur-sm" onClick={() => setUploadDialogOpen(false)} />
          <motion.div
            initial={{ scale: 0.95, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.95, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="relative w-full max-w-md glass-card rounded-[28px] p-6 shadow-2xl"
          >
            <button
              onClick={() => setUploadDialogOpen(false)}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-ink-100/50 flex items-center justify-center text-ink-500 hover:bg-ink-200 transition-colors"
            >
              <X size={16} />
            </button>
            
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center text-white shadow-lg shadow-emerald-500/20">
                <Upload size={20} />
              </div>
              <div>
                <h3 className="font-bold text-ink-800 text-lg">上传作品</h3>
                <p className="text-[12px] text-ink-500">分享你的研究成果</p>
              </div>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-[12px] font-semibold text-ink-700 mb-2">作品分类</label>
                <div className="flex flex-wrap gap-2">
                  {GALLERY_TABS.map((t) => {
                    const Icon = t.icon;
                    const active = uploadForm.type === t.key;
                    return (
                      <button
                        key={t.key}
                        onClick={() => setUploadForm((prev) => ({ ...prev, type: t.key }))}
                        className={cn(
                          'px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all flex items-center gap-1',
                          active
                            ? 'bg-mission-500 text-white shadow-md'
                            : 'bg-ink-50 text-ink-600 hover:bg-ink-100'
                        )}
                      >
                        <Icon size={12} />
                        {t.label}
                      </button>
                    );
                  })}
                </div>
              </div>
              
              <div>
                <label className="block text-[12px] font-semibold text-ink-700 mb-2">作品标题</label>
                <input
                  type="text"
                  value={uploadForm.title}
                  onChange={(e) => setUploadForm((prev) => ({ ...prev, title: e.target.value }))}
                  placeholder="输入作品标题..."
                  className="w-full px-4 py-2.5 rounded-xl bg-white/80 border border-ink-200 text-ink-800 text-sm focus:outline-none focus:border-mission-400 focus:ring-2 focus:ring-mission-500/10 transition-all"
                />
              </div>
              
              <div>
                <label className="block text-[12px] font-semibold text-ink-700 mb-2">作品描述</label>
                <textarea
                  value={uploadForm.description}
                  onChange={(e) => setUploadForm((prev) => ({ ...prev, description: e.target.value }))}
                  placeholder="描述你的作品..."
                  rows={3}
                  className="w-full px-4 py-2.5 rounded-xl bg-white/80 border border-ink-200 text-ink-800 text-sm focus:outline-none focus:border-mission-400 focus:ring-2 focus:ring-mission-500/10 transition-all resize-none"
                />
              </div>
              
              <div>
                <label className="block text-[12px] font-semibold text-ink-700 mb-2">作品图片</label>
                <div className="relative">
                  {uploadForm.imageUrl ? (
                    <div className="aspect-video rounded-xl overflow-hidden ring-2 ring-mission-400/50">
                      <img src={uploadForm.imageUrl} alt="预览" className="w-full h-full object-cover" />
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center w-full h-32 rounded-xl border-2 border-dashed border-ink-300 bg-ink-50/50 hover:border-mission-400 hover:bg-mission-50/50 transition-all cursor-pointer">
                      <Plus size={24} className="text-ink-400 mb-2" />
                      <span className="text-[12px] text-ink-500">点击上传图片</span>
                      <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                    </label>
                  )}
                </div>
              </div>
              
              <button
                onClick={handleUpload}
                className="w-full py-3 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 text-white font-semibold shadow-lg shadow-emerald-500/25 hover:shadow-xl hover:shadow-emerald-500/30 transition-all"
              >
                确认上传
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </MissionShell>
  );
}
