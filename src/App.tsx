// src/App.tsx
import { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import TimelineView, { type TaskItem as TimelineTaskItem } from './components/TimelineView';
import SettingsView, { type TagItem as SettingsTagItem, type LineStyle } from './components/SettingsView';
import AnalyticsView from './components/AnalyticsView';
import GoalView from './components/GoalView';
import { type YearItem } from './components/YearView';
import { type LongGoalItem } from './components/LongGoalView';
import CalendarContainer, { type CalendarEvent as CalendarComponentEvent } from './components/calendar/CalendarContainer';

import MembersTab from './components/tabs/MembersTab';
import LogsTab from './components/tabs/LogsTab';
import SyncTab from './components/tabs/SyncTab';

import { 
  type AppSyncData, 
  type TaskItem as CentralTaskItem, 
  type CalendarEvent as CentralCalendarEvent, 
  type GoalItem as CentralGoalItem, 
  type TagItem as CentralTagItem, 
  type UserProfile,
  type UserRole,
  type ConnectionProfile
} from './types';

import { useAppSync } from './hooks/useAppSync';
import { fetchGitHubUser } from './lib/syncManager';

export default function App() {
  const [activeTab, setActiveTab] = useState('HOME');
  
  const [showOverlapBorder, setShowOverlapBorder] = useState(true);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [scrollYears, setScrollYears] = useState<number>(1);
  const [todayOffsetDays, setTodayOffsetDays] = useState<number>(3);

  const [dependencyMarginType, setDependencyMarginType] = useState<'strict' | 'same_day' | 'fully_allowed' | 'custom'>('strict');
  const [dependencyCustomDays, setDependencyCustomDays] = useState<number>(2);
  const [overlapCondition, setOverlapCondition] = useState<'all' | 'tag_match'>('all');

  const [eventColor, setEventColor] = useState<string>('#3b82f6');
  const [goalColor, setGoalColor] = useState<string>('#f59e0b');
  const [memoColor, setMemoColor] = useState<string>('#10b981');

  const [defaultTaskColor, setDefaultTaskColor] = useState('#64748b');
  const [colorPriority, setColorPriority] = useState<'tag' | 'task'>('tag');
  const [dependencyLineColor] = useState('#94a3b8');
  const [dependencyLineStyle] = useState<LineStyle>('solid');

  // ==========================================
  // 複数接続プロファイルの状態管理
  // ==========================================
  const [profiles, setProfiles] = useState<ConnectionProfile[]>(() => {
    const saved = localStorage.getItem('app_connection_profiles');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse connection profiles', e);
      }
    }
    const oldConfig = localStorage.getItem('app_github_config');
    if (oldConfig) {
      try {
        const parsed = JSON.parse(oldConfig);
        return [{
          id: 'default-migrated',
          profileName: 'デフォルトプロファイル',
          owner: parsed.owner,
          repo: parsed.repo,
          branch: parsed.branch || 'main',
          filePath: parsed.filePath || 'data/app-sync-data.json',
          token: parsed.token,
          currentUser: { login: parsed.owner, avatarUrl: `https://github.com/${parsed.owner}.png` },
          isOwner: true,
          createdAt: new Date().toISOString()
        }];
      } catch (e) {
        console.error('Failed to migrate old github config', e);
      }
    }
    return [];
  });

  const [activeProfileId, setActiveProfileId] = useState<string>(() => {
    return localStorage.getItem('app_active_profile_id') || (profiles[0]?.id ?? '');
  });

  useEffect(() => {
    localStorage.setItem('app_connection_profiles', JSON.stringify(profiles));
  }, [profiles]);

  useEffect(() => {
    if (activeProfileId) {
      localStorage.setItem('app_active_profile_id', activeProfileId);
    } else {
      localStorage.removeItem('app_active_profile_id');
    }
  }, [activeProfileId]);

  const activeProfile = profiles.find(p => p.id === activeProfileId) || profiles[0] || null;

  // プロファイルに保存された isOwner フラグを取得
  const isRepoOwner = activeProfile ? (activeProfile as any).isOwner : false;

  const handleAddProfile = async (params: {
    profileName: string;
    owner: string;
    repo: string;
    branch?: string;
    filePath?: string;
    token: string;
  }) => {
    const ghUser = await fetchGitHubUser(params.token);
    const targetBranch = params.branch || 'main';
    const targetFilePath = params.filePath || 'data/app-sync-data.json';

    // リポジトリの本当のオーナー情報をGitHub APIで検証
    let isOwner = false;
    try {
      const cleanToken = params.token.trim();
      const authHeader = cleanToken.startsWith('github_pat_') ? `Bearer ${cleanToken}` : cleanToken.startsWith('ghp_') ? `token ${cleanToken}` : `Bearer ${cleanToken}`;
      
      const repoRes = await fetch(`https://api.github.com/repos/${params.owner}/${params.repo}`, {
        headers: {
          'Authorization': authHeader,
          'Accept': 'application/vnd.github+json',
        },
      });

      if (repoRes.ok) {
        const repoData = await repoRes.json();
        if (repoData.owner && repoData.owner.login.toLowerCase() === ghUser.login.toLowerCase()) {
          isOwner = true;
        }
      }
    } catch (e) {
      console.warn('Failed to verify repository owner via API, falling back to name comparison:', e);
      isOwner = params.owner.toLowerCase() === ghUser.login.toLowerCase();
    }

    const newProfile: ConnectionProfile & { isOwner?: boolean } = {
      id: 'prof_' + Date.now(),
      profileName: params.profileName,
      owner: params.owner,
      repo: params.repo,
      branch: targetBranch,
      filePath: targetFilePath,
      token: params.token,
      currentUser: {
        login: ghUser.login,
        name: ghUser.name,
        avatarUrl: ghUser.avatarUrl,
      },
      isOwner: isOwner,
    };

    setProfiles(prev => [...prev, newProfile]);
    if (!activeProfileId) {
      setActiveProfileId(newProfile.id);
    }
  };

  const handleRemoveProfile = (id: string) => {
    setProfiles(prev => {
      const next = prev.filter(p => p.id !== id);
      if (activeProfileId === id) {
        setActiveProfileId(next[0]?.id || '');
      }
      return next;
    });
  };

  const handleSwitchProfile = (id: string) => {
    setActiveProfileId(id);
  };

  const githubConfigForSync = activeProfile ? {
    owner: activeProfile.owner,
    repo: activeProfile.repo,
    branch: activeProfile.branch,
    filePath: activeProfile.filePath,
    token: activeProfile.token,
  } : null;

  const today = new Date();
  const formatDate = (offsetDays: number) => {
    const d = new Date(today);
    d.setDate(today.getDate() + offsetDays);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const initialMembers: UserProfile[] = [];

  const initialAppData: AppSyncData = {
    events: [],
    tasks: [],
    goals: [],
    tags: [
      { id: 'tag-1', name: '開発', color: '#3b82f6', isDeleted: false, updatedAt: '2020-01-01T00:00:00.000Z' },
      { id: 'tag-2', name: '緊急', color: '#ef4444', isDeleted: false, updatedAt: '2020-01-01T00:00:00.000Z' },
      { id: 'tag-3', name: 'レビュー', color: '#10b981', isDeleted: false, updatedAt: '2020-01-01T00:00:00.000Z' },
    ],
    members: initialMembers,
    logs: [
      {
        id: 'log-init',
        timestamp: '2020-01-01T00:00:00.000Z',
        userId: '1',
        userName: 'System',
        action: 'SYNC_GITHUB',
        details: 'システム初期化およびローカルデータ読み込み'
      }
    ],
    lastSyncedAt: '2020-01-01T00:00:00.000Z'
  };

  // 1. 先に useAppSync を呼び出して `data` を定義
  const { data, updateDataWithAction, isSyncing, syncError, manualSync } = useAppSync({
    initialData: initialAppData,
    currentUser: { 
      id: '1', 
      name: activeProfile?.currentUser?.login || '山田 太郎', 
      role: isRepoOwner ? 'owner' : 'member', 
      updatedAt: new Date().toISOString() 
    },
    githubConfig: githubConfigForSync,
  });

  // 2. その後で `data` を利用して `currentUser` を解決
  const githubLogin = activeProfile?.currentUser?.login;
  const githubAvatar = activeProfile?.currentUser?.avatarUrl;

  const activeMembersForView = data.members.filter(m => !m.isDeleted);
  
  const currentUser: UserProfile = (() => {
    if (githubLogin) {
      const found = activeMembersForView.find(m => m.name === githubLogin || m.id === `gh_${githubLogin}`);
      if (found) return found;
      return {
        id: `gh_${githubLogin}`,
        name: githubLogin,
        role: isRepoOwner ? 'owner' : 'member',
        roleTitle: isRepoOwner ? `リポジトリオーナー (${githubLogin})` : `メンバー (${githubLogin})`,
        avatarUrl: githubAvatar,
        updatedAt: new Date().toISOString(),
        isDeleted: false
      };
    }
    return activeMembersForView[0] || {
      id: '1',
      name: 'ゲスト',
      role: 'member',
      roleTitle: '未接続',
      updatedAt: new Date().toISOString()
    };
  })();

  // 6. メンバー設定・管理更新 (MembersTab) 先に定義
  const setMembersWithLog = (updater: React.SetStateAction<UserProfile[]>) => {
    updateDataWithAction(
      (prev) => {
        // ※ 削除済みを含めた全メンバーをベースに更新をかけられるように修正
        const next = typeof updater === 'function' ? updater(prev.members) : (updater as any);
        
        const existingMap = new Map(prev.members.map(m => [m.id, m]));
        const nextIds = new Set(next.map((m: any) => m.id));

        const tombstonedMembers = prev.members.map(m => {
          if (!nextIds.has(m.id) && !m.isDeleted) {
            return { ...m, isDeleted: true, updatedAt: new Date().toISOString() };
          }
          return m;
        });

        const memberMap = new Map(tombstonedMembers.map(m => [m.id, m]));
        
        next.forEach((m: any) => {
          const existing = existingMap.get(m.id);
          if (m.isDeleted) {
            memberMap.set(m.id, {
              ...(existing || {}),
              id: m.id,
              name: m.name,
              role: m.role || 'member',
              roleTitle: m.roleTitle,
              avatarUrl: m.avatarUrl,
              isDeleted: true,
              updatedAt: new Date().toISOString()
            });
            return;
          }

          const hasChanged = !existing ||
            existing.name !== m.name ||
            existing.role !== m.role ||
            existing.roleTitle !== m.roleTitle ||
            existing.avatarUrl !== m.avatarUrl ||
            existing.isDeleted !== false; // 復元された場合も変更とみなす

          memberMap.set(m.id, {
            id: m.id,
            name: m.name,
            role: m.role || 'member',
            roleTitle: m.roleTitle,
            avatarUrl: m.avatarUrl,
            isDeleted: false,
            updatedAt: hasChanged ? new Date().toISOString() : (existing?.updatedAt || new Date().toISOString())
          });
        });

        return {
          ...prev,
          members: Array.from(memberMap.values())
        };
      },
      'MEMBER_ADD',
      'メンバー情報が更新されました',
      0
    );
  };

  const handleAddMember = (newMember: UserProfile) => {
    setMembersWithLog(prev => {
      // 既に同じID、または同じ名前のメンバーが過去に存在するかチェック
      const existingIndex = prev.findIndex(
        m => m.id === newMember.id || m.name.toLowerCase() === newMember.name.toLowerCase()
      );

      if (existingIndex !== -1) {
        // すでに存在する場合は、データを上書きして isDeleted: false で復活させる
        return prev.map((m, idx) => 
          idx === existingIndex 
            ? { ...m, ...newMember, id: m.id, isDeleted: false, updatedAt: new Date().toISOString() } 
            : m
        );
      }

      // 存在しない場合は新規追加
      return [...prev, newMember];
    });
  };

  const handleRemoveMember = (id: string) => {
    setMembersWithLog(prev => prev.map(m => m.id === id ? { ...m, isDeleted: true, updatedAt: new Date().toISOString() } : m));
  };

  const handleRestoreMember = (id: string) => {
    setMembersWithLog(prev => prev.map(m => m.id === id ? { ...m, isDeleted: false, updatedAt: new Date().toISOString() } : m));
  };

  const handleUpdateRole = (id: string, role: UserRole) => {
    setMembersWithLog(prev => prev.map(m => m.id === id ? { ...m, role, updatedAt: new Date().toISOString() } : m));
  };

  // ★ GitHubのログインユーザーが members に未登録（または削除済み）の場合、自動で追加または復活させる処理
  useEffect(() => {
    if (!githubLogin) return;
    
    const targetId = `gh_${githubLogin}`;
    const existingMember = data.members.find(m => m.name.toLowerCase() === githubLogin.toLowerCase() || m.id === targetId);

    if (!existingMember) {
      const newMember: UserProfile = {
        id: targetId,
        name: githubLogin,
        role: isRepoOwner ? 'owner' : 'member',
        roleTitle: isRepoOwner ? `リポジトリオーナー (${githubLogin})` : `メンバー (${githubLogin})`,
        avatarUrl: githubAvatar,
        updatedAt: new Date().toISOString(),
        isDeleted: false
      };
      setMembersWithLog(prev => [...prev, newMember]);
    } else if (existingMember.isDeleted) {
      // 削除済みとして存在していた場合は復活させる
      handleRestoreMember(existingMember.id);
    }
  }, [githubLogin, githubAvatar, data.members, isRepoOwner]);

  // 1. タスク更新 (TimelineView)
  const setTasksWithLog = (updater: React.SetStateAction<TimelineTaskItem[]>) => {
    updateDataWithAction(
      (prev) => {
        const currentTasks: TimelineTaskItem[] = prev.tasks.filter(t => !t.isDeleted).map(t => ({
          id: t.id,
          title: t.title,
          startDate: t.startDate,
          endDate: t.endDate,
          progress: t.progress,
          memberId: t.assigneeId || '',
          color: t.color,
          tagId: t.tag,
          memo: t.memo,
          parentIds: t.dependencies,
          isDeleted: t.isDeleted,
        }));
        const next = typeof updater === 'function' ? updater(currentTasks) : (updater as any);
        
        const existingMap = new Map(prev.tasks.map(t => [t.id, t]));
        const nextIds = new Set(next.map((t: any) => t.id));

        const updatedTasks: CentralTaskItem[] = prev.tasks.map(pt => {
          if (!nextIds.has(pt.id) && !pt.isDeleted) {
            return {
              ...pt,
              isDeleted: true,
              updatedBy: currentUser.id,
              updatedAt: new Date().toISOString()
            };
          }
          return pt;
        });

        const finalMap = new Map(updatedTasks.map(t => [t.id, t]));

        next.forEach((t: any) => {
          const existing = existingMap.get(t.id);
          if (t.isDeleted) {
            finalMap.set(t.id, {
              ...(existing || {
                createdBy: currentUser.id,
                startDate: t.startDate || formatDate(0),
                endDate: t.endDate || formatDate(0),
              }),
              id: t.id,
              title: t.title,
              startDate: t.startDate,
              endDate: t.endDate,
              progress: t.progress || 0,
              assigneeId: t.memberId,
              color: t.color,
              tag: t.tagId,
              memo: t.memo,
              dependencies: t.parentIds,
              updatedBy: currentUser.id,
              isDeleted: true,
              updatedAt: new Date().toISOString()
            });
            return;
          }

          const hasChanged = !existing || 
            existing.title !== t.title ||
            existing.startDate !== t.startDate ||
            existing.endDate !== t.endDate ||
            existing.progress !== (t.progress || 0) ||
            existing.assigneeId !== t.memberId ||
            existing.color !== t.color ||
            existing.tag !== t.tagId ||
            existing.memo !== t.memo ||
            existing.isDeleted !== t.isDeleted ||
            JSON.stringify(existing.dependencies || []) !== JSON.stringify(t.parentIds || []);

          finalMap.set(t.id, {
            id: t.id,
            title: t.title,
            startDate: t.startDate,
            endDate: t.endDate,
            progress: t.progress || 0,
            assigneeId: t.memberId,
            color: t.color,
            tag: t.tagId,
            memo: t.memo,
            dependencies: t.parentIds,
            createdBy: existing ? existing.createdBy : currentUser.id,
            updatedBy: currentUser.id,
            isDeleted: false,
            updatedAt: hasChanged ? new Date().toISOString() : (existing?.updatedAt || new Date().toISOString())
          });
        });

        return {
          ...prev,
          tasks: Array.from(finalMap.values())
        };
      },
      'TASK_UPDATE',
      'タイムラインタスクが更新されました',
      800
    );
  };

  // 2. 月別目標更新 (GoalView - month)
  const setYearItemsWithLog = (updater: React.SetStateAction<YearItem[]>) => {
    updateDataWithAction(
      (prev) => {
        const currentYearItems: YearItem[] = prev.goals
          .filter(g => !g.isDeleted && g.category === 'month')
          .map(g => {
            const [y, m] = (g.targetPeriod || '2026-01').split('-');
            return {
              id: g.id,
              title: g.title,
              description: g.description,
              year: Number(y),
              month: Number(m),
              memberId: g.memberIds?.[0],
              memberIds: g.memberIds,
              isDeleted: g.isDeleted,
            } as any;
          });
        const next = typeof updater === 'function' ? updater(currentYearItems) : (updater as any);
        const otherGoals = prev.goals.filter(g => g.category !== 'month');
        
        const existingMap = new Map(prev.goals.map(g => [g.id, g]));
        const nextIds = new Set(next.map((y: any) => y.id));

        const updatedOtherGoals = otherGoals.map(g => {
          if (g.category === 'month' && !nextIds.has(g.id) && !g.isDeleted) {
            return { ...g, isDeleted: true, updatedBy: currentUser.id, updatedAt: new Date().toISOString() };
          }
          return g;
        });

        const goalMap = new Map(updatedOtherGoals.map(g => [g.id, g]));

        next.forEach((y: any) => {
          const existing = existingMap.get(y.id);
          if (y.isDeleted) {
            goalMap.set(y.id, {
              ...(existing || { createdBy: currentUser.id, targetPeriod: '2026-01', category: 'month' }),
              id: y.id,
              title: y.title,
              description: y.description,
              targetPeriod: `${y.year}-${String(y.month || 1).padStart(2, '0')}`,
              category: 'month',
              memberIds: y.memberIds || (y.memberId ? [y.memberId] : undefined),
              updatedBy: currentUser.id,
              isDeleted: true,
              updatedAt: new Date().toISOString()
            });
            return;
          }

          const hasChanged = !existing ||
            existing.title !== y.title ||
            existing.description !== y.description ||
            existing.targetPeriod !== `${y.year}-${String(y.month || 1).padStart(2, '0')}` ||
            JSON.stringify(existing.memberIds || []) !== JSON.stringify(y.memberIds || (y.memberId ? [y.memberId] : []));

          goalMap.set(y.id, {
            id: y.id,
            title: y.title,
            description: y.description,
            targetPeriod: `${y.year}-${String(y.month || 1).padStart(2, '0')}`,
            category: 'month',
            memberIds: y.memberIds || (y.memberId ? [y.memberId] : undefined),
            createdBy: existing ? existing.createdBy : currentUser.id,
            updatedBy: currentUser.id,
            isDeleted: false,
            updatedAt: hasChanged ? new Date().toISOString() : (existing?.updatedAt || new Date().toISOString())
          });
        });

        return { ...prev, goals: Array.from(goalMap.values()) };
      },
      'GOAL_UPDATE',
      '年間・月別目標が更新されました'
    );
  };

  // 3. 中長期目標更新 (GoalView - long)
  const setLongItemsWithLog = (updater: React.SetStateAction<LongGoalItem[]>) => {
    updateDataWithAction(
      (prev) => {
        const currentLongItems: LongGoalItem[] = prev.goals
          .filter(g => !g.isDeleted && g.category === 'long')
          .map(g => ({
            id: g.id,
            title: g.title,
            description: g.description,
            year: Number(g.targetPeriod) || 2026,
            memberIds: g.memberIds,
            isDeleted: g.isDeleted,
          } as any));
        const next = typeof updater === 'function' ? updater(currentLongItems) : (updater as any);
        const otherGoals = prev.goals.filter(g => g.category !== 'long');

        const existingMap = new Map(prev.goals.map(g => [g.id, g]));
        const nextIds = new Set(next.map((l: any) => l.id));

        const updatedOtherGoals = otherGoals.map(g => {
          if (g.category === 'long' && !nextIds.has(g.id) && !g.isDeleted) {
            return { ...g, isDeleted: true, updatedBy: currentUser.id, updatedAt: new Date().toISOString() };
          }
          return g;
        });

        const goalMap = new Map(updatedOtherGoals.map(g => [g.id, g]));

        next.forEach((l: any) => {
          const existing = existingMap.get(l.id);
          if (l.isDeleted) {
            goalMap.set(l.id, {
              ...(existing || { createdBy: currentUser.id, targetPeriod: '2026', category: 'long' }),
              id: l.id,
              title: l.title,
              description: l.description,
              targetPeriod: String(l.year),
              category: 'long',
              memberIds: l.memberIds,
              updatedBy: currentUser.id,
              isDeleted: true,
              updatedAt: new Date().toISOString()
            });
            return;
          }

          const hasChanged = !existing ||
            existing.title !== l.title ||
            existing.description !== l.description ||
            existing.targetPeriod !== String(l.year) ||
            JSON.stringify(existing.memberIds || []) !== JSON.stringify(l.memberIds || []);

          goalMap.set(l.id, {
            id: l.id,
            title: l.title,
            description: l.description,
            targetPeriod: String(l.year),
            category: 'long',
            memberIds: l.memberIds,
            createdBy: existing ? existing.createdBy : currentUser.id,
            updatedBy: currentUser.id,
            isDeleted: false,
            updatedAt: hasChanged ? new Date().toISOString() : (existing?.updatedAt || new Date().toISOString())
          });
        });

        return { ...prev, goals: Array.from(goalMap.values()) };
      },
      'GOAL_UPDATE',
      '中長期目標が更新されました'
    );
  };

  // 4. カレンダーイベント更新 (CalendarContainer)
  const setCalendarEventsWithLog = (updater: React.SetStateAction<CalendarComponentEvent[]>) => {
    updateDataWithAction(
      (prev) => {
        const activePrevEvents = (prev.events as CalendarComponentEvent[]).filter(e => !e.isDeleted);
        const next = typeof updater === 'function' ? updater(activePrevEvents) : (updater as any);
        
        const existingMap = new Map((prev.events as CentralCalendarEvent[]).map(e => [e.id, e]));
        const nextIds = new Set(next.map((e: any) => e.id));

        const tombstonedEvents = (prev.events as CentralCalendarEvent[]).map(e => {
          if (!nextIds.has(e.id) && !e.isDeleted) {
            return { ...e, isDeleted: true, updatedBy: currentUser.id, updatedAt: new Date().toISOString() };
          }
          return e;
        });

        const newEventsMap = new Map(tombstonedEvents.map(e => [e.id, e]));
        
        next.forEach((e: any) => {
          const existing = existingMap.get(e.id);
          if (e.isDeleted) {
            newEventsMap.set(e.id, {
              ...(existing || { createdBy: currentUser.id }),
              id: e.id,
              title: e.title,
              date: e.date,
              endDate: e.endDate,
              startTime: e.startTime,
              endTime: e.endTime,
              description: e.description,
              memberIds: e.memberIds || [currentUser.id],
              tags: e.tags || [],
              color: e.color,
              updatedBy: currentUser.id,
              isDeleted: true,
              updatedAt: new Date().toISOString()
            });
            return;
          }

          const hasChanged = !existing ||
            existing.title !== e.title ||
            existing.date !== e.date ||
            existing.endDate !== e.endDate ||
            existing.startTime !== e.startTime ||
            existing.endTime !== e.endTime ||
            existing.description !== e.description ||
            existing.color !== e.color ||
            JSON.stringify(existing.memberIds || []) !== JSON.stringify(e.memberIds || [currentUser.id]) ||
            JSON.stringify(existing.tags || []) !== JSON.stringify(e.tags || []);

          newEventsMap.set(e.id, {
            id: e.id,
            title: e.title,
            date: e.date,
            endDate: e.endDate,
            startTime: e.startTime,
            endTime: e.endTime,
            description: e.description,
            memberIds: e.memberIds || [currentUser.id],
            tags: e.tags || [],
            color: e.color,
            createdBy: existing ? existing.createdBy : currentUser.id,
            updatedBy: currentUser.id,
            isDeleted: false,
            updatedAt: hasChanged ? new Date().toISOString() : (existing?.updatedAt || new Date().toISOString())
          });
        });

        return {
          ...prev,
          events: Array.from(newEventsMap.values())
        };
      },
      'EVENT_UPDATE',
      'カレンダーイベントが更新されました'
    );
  };

  // 5. タグ設定更新 (SettingsView)
  const setTagsWithLog = (updater: React.SetStateAction<SettingsTagItem[]>) => {
    updateDataWithAction(
      (prev) => {
        const activeTags = prev.tags.filter(t => !t.isDeleted);
        const next = typeof updater === 'function' ? updater(activeTags as SettingsTagItem[]) : (updater as any);
        
        const existingMap = new Map(prev.tags.map(t => [t.id, t]));
        const nextIds = new Set(next.map((t: any) => t.id));

        const tombstonedTags = prev.tags.map(t => {
          if (!nextIds.has(t.id) && !t.isDeleted) {
            return { ...t, isDeleted: true, updatedAt: new Date().toISOString() };
          }
          return t;
        });

        const tagMap = new Map(tombstonedTags.map(t => [t.id, t]));
        
        next.forEach((tag: any) => {
          const existing = existingMap.get(tag.id);
          if (tag.isDeleted) {
            tagMap.set(tag.id, {
              ...(existing || {}),
              id: tag.id,
              name: tag.name,
              color: tag.color,
              isDeleted: true,
              updatedAt: new Date().toISOString()
            });
            return;
          }

          const hasChanged = !existing ||
            existing.name !== tag.name ||
            existing.color !== tag.color;

          tagMap.set(tag.id, {
            id: tag.id,
            name: tag.name,
            color: tag.color,
            isDeleted: false,
            updatedAt: hasChanged ? new Date().toISOString() : (existing?.updatedAt || new Date().toISOString())
          });
        });

        return {
          ...prev,
          tags: Array.from(tagMap.values())
        };
      },
      'SYNC_GITHUB',
      'タグ設定が更新されました'
    );
  };

  const tasksForView: TimelineTaskItem[] = data.tasks
    .filter(t => !t.isDeleted)
    .map(t => ({
      id: t.id,
      title: t.title,
      startDate: t.startDate,
      endDate: t.endDate,
      progress: t.progress,
      memberId: t.assigneeId || '',
      color: t.color,
      tagId: t.tag,
      memo: t.memo,
      parentIds: t.dependencies,
    }));

  const yearItemsForView: YearItem[] = data.goals
    .filter(g => !g.isDeleted && g.category === 'month')
    .map(g => {
      const [y, m] = (g.targetPeriod || '2026-01').split('-');
      return {
        id: g.id,
        title: g.title,
        description: g.description,
        year: Number(y),
        month: Number(m),
        memberId: g.memberIds?.[0],
        memberIds: g.memberIds
      };
    });

  const longItemsForView: LongGoalItem[] = data.goals
    .filter(g => !g.isDeleted && g.category === 'long')
    .map(g => ({
      id: g.id,
      title: g.title,
      description: g.description,
      year: Number(g.targetPeriod) || 2026,
      memberIds: g.memberIds
    }));

  const activeTagsForView = data.tags.filter(t => !t.isDeleted);
  const activeEventsForView = (data.events as CalendarComponentEvent[]).filter(e => !e.isDeleted);

  const normalizedTab = activeTab.toUpperCase();
  const isDark = theme === 'dark';

  return (
    <div className={`flex h-screen font-sans overflow-hidden transition-colors duration-300 ${
      isDark ? 'bg-slate-950 text-slate-100' : 'bg-slate-100/60 text-slate-800'
    }`}>
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        theme={theme}
        manualSync={manualSync}
      />

      <main className="flex-1 p-6 overflow-hidden flex flex-col">
        <div className="flex justify-between items-center mb-3 px-3 py-1.5 bg-slate-800/40 rounded border border-slate-700/40 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-slate-400">現在の操作者 (GitHub):</span>
            <div className="flex items-center gap-1.5 bg-slate-900 text-slate-200 px-2 py-0.5 rounded border border-slate-700">
              {currentUser.avatarUrl && (
                <img src={currentUser.avatarUrl} alt="" className="w-4 h-4 rounded-full" />
              )}
              <span className="font-medium">{currentUser.name}</span>
              <span className="text-slate-400 text-[10px]">({activeProfile?.profileName || '未選択'})</span>
            </div>
          </div>
          <span className="text-slate-500">Sync Data Items: {tasksForView.length} tasks</span>
        </div>

        <div className="flex-1 overflow-y-auto">
          {normalizedTab === 'HOME' && (
            <TimelineView 
              leftOffsetDays={todayOffsetDays}
              rangeYears={scrollYears}
              showOverlapBorder={showOverlapBorder}
              setShowOverlapBorder={setShowOverlapBorder}
              onOpenSettings={() => setActiveTab('Setting')}
              tags={activeTagsForView}
              members={data.members}
              defaultTaskColor={defaultTaskColor}
              colorPriority={colorPriority}
              tasks={tasksForView}
              setTasks={setTasksWithLog}
              dependencyLineColor={dependencyLineColor}
              dependencyLineStyle={dependencyLineStyle}
              dependencyMarginType={dependencyMarginType}
              dependencyCustomDays={dependencyCustomDays}
              overlapCondition={overlapCondition}
              theme={theme}
            />
          )}

          {(normalizedTab === 'ANALYTICS' || normalizedTab === 'ANALYSIS') && (
            <AnalyticsView tasks={tasksForView} members={activeMembersForView} theme={theme} />
          )}

          {normalizedTab === 'SETTING' && (
            <SettingsView 
              onClose={() => setActiveTab('HOME')}
              currentUser={currentUser}
              tags={activeTagsForView}
              setTags={setTagsWithLog}
              defaultTaskColor={defaultTaskColor}
              setDefaultTaskColor={setDefaultTaskColor}
              colorPriority={colorPriority}
              setColorPriority={setColorPriority}
              dependencyMarginType={dependencyMarginType}
              setDependencyMarginType={setDependencyMarginType}
              dependencyCustomDays={dependencyCustomDays}
              setDependencyCustomDays={setDependencyCustomDays}
              overlapCondition={overlapCondition}
              setOverlapCondition={setOverlapCondition}
              eventColor={eventColor}
              setEventColor={setEventColor}
              goalColor={goalColor}
              setGoalColor={setGoalColor}
              memoColor={memoColor}
              setMemoColor={setMemoColor}
              showOverlapBorder={showOverlapBorder}
              setShowOverlapBorder={setShowOverlapBorder}
              theme={theme}
              setTheme={setTheme}
              scrollYears={scrollYears}
              setScrollYears={setScrollYears}
              todayOffsetDays={todayOffsetDays}
              setTodayOffsetDays={setTodayOffsetDays}
            />
          )}

          {normalizedTab === 'GOAL' && (
            <GoalView 
              theme={theme}
              tasks={tasksForView}
              eventColor={eventColor}
              goalColor={goalColor}
              memoColor={memoColor}
              yearItems={yearItemsForView}
              setYearItems={setYearItemsWithLog}
              longItems={longItemsForView}
              setLongItems={setLongItemsWithLog}
              members={activeMembersForView}
            />
          )}

          {normalizedTab === 'CALENDAR' && (
            <CalendarContainer 
              theme={theme}
              members={activeMembersForView}
              tags={activeTagsForView}
              events={activeEventsForView}
              setEvents={setCalendarEventsWithLog}
            />
          )}

          {normalizedTab === 'USERS' && (
            <MembersTab 
              members={data.members}
              currentUser={currentUser}
              onAddMember={handleAddMember}
              onRemoveMember={handleRemoveMember}
              onRestoreMember={handleRestoreMember}
              onUpdateRole={handleUpdateRole}
              theme={theme}
            />
          )}

          {(normalizedTab === 'LOGS' || normalizedTab === 'LOG') && (
            <LogsTab 
              logs={data.logs}
              theme={theme}
            />
          )}

          {normalizedTab === 'SYNC' && (
            <SyncTab 
              profiles={profiles}
              activeProfile={activeProfile}
              onSwitchProfile={handleSwitchProfile}
              onAddProfile={handleAddProfile}
              onRemoveProfile={handleRemoveProfile}
              currentUser={currentUser}
              onManualSync={manualSync}
              isSyncing={isSyncing}
              syncError={syncError}
              lastSyncedAt={data.lastSyncedAt || new Date().toISOString()}
              theme={theme}
            />
          )}
        </div>
      </main>
    </div>
  );
}