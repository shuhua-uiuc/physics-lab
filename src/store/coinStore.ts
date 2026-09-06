import { create } from 'zustand';
import {
  CoinTransaction,
  CoinSource,
  Challenge,
  Recruitment,
  Project,
  LS_KEYS,
  loadLS,
  saveLS,
} from '../data/mockData';
import { useGroupStore } from './groupStore';
import { syncToApi } from '../lib/syncQueue';
import { coinsApi } from '../lib/apiService';

/**
 * 能量币 store。
 *
 * 后端模式下的记账契约（避免双重记账）：
 *   - 交易记录与小组余额由后端在对应业务端点内统一生成：
 *       · 教师/组间金币变动 → groupStore.updateGroupCoins → POST /groups/{id}/coins
 *       · 挑战结算 → POST /challenges/{id}/submit（后端 settle_challenge）
 *       · 招募结算 → PUT /recruitments/{id}/resolve（后端 settle_recruitment）
 *       · 项目完成 → POST /projects/{id}/done（后端 settle_project_done）
 *       · 组间转账 → transferCoins → POST /coins/transfer（后端原子记账，收支共享 refId）
 *   - 因此本 store 的 addTx / settleXxx 仅做“本地乐观更新”，用于即时展示流水，
 *     不再单独向后端推送交易；下次 bootstrapFromApi 重拉时以后端为准对齐。
 */

interface CoinState {
  coinTxs: CoinTransaction[];
  addTx: (
    groupId: string,
    tx: { source: CoinSource; refId: string; delta: number; note: string },
    userId?: string
  ) => CoinTransaction;
  settleChallenge: (
    challenge: Challenge,
    solverGroupId: string,
    accuracy: number
  ) => { solverReward: number; creatorRefund: number };
  settleRecruitment: (
    recruitment: Recruitment,
    result: 'success' | 'partial' | 'fail',
    ownerGroupId?: string
  ) => { assigneePay: number; ownerRefund: number };
  settleProjectDone: (project: Project) => Record<string, number>;
  /** 组间能量币转账：本地乐观更新 + 后端原子记账（source='transfer'，收支共享 refId）。 */
  transferCoins: (
    fromGroupId: string,
    toGroupId: string,
    amount: number,
    note: string,
    userId?: string
  ) => void;
  getRankings: () => {
    groupRanking: { groupId: string; name: string; totalCoins: number; rank: number }[];
    personalRanking: { userId: string; name: string; personalCoins: number; groupId: string; rank: number }[];
  };
}

const uid = () => `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

export const useCoinStore = create<CoinState>((set, get) => {
  const initialTxs = loadLS<CoinTransaction[]>(LS_KEYS.COIN_TXS, []);

  const persist = (txs: CoinTransaction[]) => {
    saveLS(LS_KEYS.COIN_TXS, txs);
  };

  return {
    coinTxs: initialTxs,

    addTx: (groupId, tx, userId) => {
      // 仅本地乐观更新（后端由业务端点统一记账），不触发 groupsApi.adjustCoins
      const balanceAfter = useGroupStore.getState().adjustGroupCoinsLocal(groupId, tx.delta);
      const newTx: CoinTransaction = {
        id: uid(),
        groupId,
        userId,
        source: tx.source,
        refId: tx.refId,
        delta: tx.delta,
        balanceAfter,
        createdAt: new Date(),
        note: tx.note,
      };
      const nextTxs = [...get().coinTxs, newTx];
      persist(nextTxs);
      set({ coinTxs: nextTxs });
      return newTx;
    },

    transferCoins: (fromGroupId, toGroupId, amount, note, userId) => {
      const { adjustGroupCoinsLocal, getGroupById } = useGroupStore.getState();
      if (!Number.isInteger(amount) || amount <= 0) return;
      const fromGroup = getGroupById(fromGroupId);
      if (!fromGroup || fromGroup.totalCoins < amount) return;
      const toGroup = getGroupById(toGroupId);
      const refId = uid();

      // 本地乐观更新：余额变更不走 updateGroupCoins（避免触发教师端点同步造成重复记账）
      const fromBalance = adjustGroupCoinsLocal(fromGroupId, -amount);
      const toBalance = adjustGroupCoinsLocal(toGroupId, amount);

      const trimmedNote = note.trim();
      const txOut: CoinTransaction = {
        id: uid(),
        groupId: fromGroupId,
        userId,
        source: 'transfer',
        refId,
        delta: -amount,
        balanceAfter: fromBalance,
        createdAt: new Date(),
        note: `转账给${toGroup?.name ?? toGroupId}${trimmedNote ? `：${trimmedNote}` : ''}`,
      };
      const txIn: CoinTransaction = {
        id: uid(),
        groupId: toGroupId,
        source: 'transfer',
        refId,
        delta: amount,
        balanceAfter: toBalance,
        createdAt: new Date(),
        note: `收到${fromGroup?.name ?? fromGroupId}转账${trimmedNote ? `：${trimmedNote}` : ''}`,
      };
      const nextTxs = [...get().coinTxs, txOut, txIn];
      persist(nextTxs);
      set({ coinTxs: nextTxs });

      // 后端原子记账：余额校验、两笔流水均由后端完成
      syncToApi(
        () =>
          coinsApi.transfer({
            sourceGroupId: fromGroupId,
            targetGroupId: toGroupId,
            amount,
            note: trimmedNote,
          }),
        'coins.transfer'
      );
    },

    settleChallenge: (challenge, solverGroupId, accuracy) => {
      const reward = Math.floor(challenge.reward * accuracy);
      const bonus = accuracy >= 0.95 ? Math.floor(challenge.reward * 0.2) : 0;
      const solverReward = reward + bonus;
      const creatorRefund = challenge.reward - reward;

      const addTx = get().addTx;

      addTx(solverGroupId, {
        source: 'challenge',
        refId: challenge.id,
        delta: solverReward,
        note: `挑战「${challenge.title}」答对奖励${accuracy >= 0.95 ? '(含卓越加成)' : ''}`,
      });

      if (creatorRefund > 0) {
        addTx(challenge.creatorGroupId, {
          source: 'challenge',
          refId: challenge.id,
          delta: creatorRefund,
          note: `挑战「${challenge.title}」剩余能量币回收`,
        });
      }

      return { solverReward, creatorRefund };
    },

    settleRecruitment: (recruitment, result, ownerGroupId) => {
      const { addTx } = get();
      const { getUserById } = useGroupStore.getState();
      const assigneeUser = recruitment.assigneeUserId
        ? getUserById(recruitment.assigneeUserId)
        : undefined;
      const assigneeGroupId = assigneeUser?.groupId;

      let assigneePay = 0;
      let ownerRefund = 0;

      if (result === 'success') {
        assigneePay = recruitment.reward;
      } else if (result === 'partial') {
        assigneePay = Math.floor(recruitment.reward * 0.5);
        ownerRefund = recruitment.reward - assigneePay;
      } else {
        ownerRefund = recruitment.reward;
      }

      if (assigneePay > 0 && assigneeGroupId) {
        addTx(
          assigneeGroupId,
          {
            source: 'recruit',
            refId: recruitment.id,
            delta: assigneePay,
            note: `招募「${recruitment.title}」${result === 'success' ? '全额' : '部分'}酬劳`,
          },
          recruitment.assigneeUserId
        );
      }

      if (ownerRefund > 0 && ownerGroupId) {
        addTx(ownerGroupId, {
          source: 'recruit',
          refId: recruitment.id,
          delta: ownerRefund,
          note: `招募「${recruitment.title}」${result === 'fail' ? '失败' : '部分完成'}回收`,
        });
      }

      return { assigneePay, ownerRefund };
    },

    settleProjectDone: (project) => {
      const { addTx } = get();
      const { getGroupById, getGroupUsers, updateUserPersonalCoins } = useGroupStore.getState();
      const group = getGroupById(project.ownerGroupId);
      const userEarnings: Record<string, number> = {};

      if (!group) return userEarnings;

      const members = getGroupUsers(project.ownerGroupId);
      const totalReward = project.rewardCoins;

      members.forEach((member) => {
        const ratio = group.contributionRatio[member.id] || 0;
        const personalEarning = Math.floor((totalReward * ratio) / 100);
        if (personalEarning > 0) {
          userEarnings[member.id] = personalEarning;
          updateUserPersonalCoins(member.id, personalEarning);
        }
      });

      addTx(project.ownerGroupId, {
        source: 'project',
        refId: project.id,
        delta: totalReward,
        note: `项目「${project.title}」完成奖励`,
      });

      return userEarnings;
    },

    getRankings: () => {
      const { groups, users } = useGroupStore.getState();

      const groupRanking = [...groups]
        .sort((a, b) => b.totalCoins - a.totalCoins)
        .map((g, idx) => ({
          groupId: g.id,
          name: g.name,
          totalCoins: g.totalCoins,
          rank: idx + 1,
        }));

      const personalRanking = [...users]
        .sort((a, b) => b.personalCoins - a.personalCoins)
        .map((u, idx) => ({
          userId: u.id,
          name: u.name,
          personalCoins: u.personalCoins,
          groupId: u.groupId,
          rank: idx + 1,
        }));

      return { groupRanking, personalRanking };
    },
  };
});
