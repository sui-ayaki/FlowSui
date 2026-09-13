// src/hooks/useAppSync.ts
import { useState, useEffect, useRef, useCallback } from 'react';
import type { AppSyncData, AuditLog, UserProfile } from '../types';
import { fetchAllFromGitHub, pushToGitHub, mergeAppSyncData, createAuditLog } from '../lib/syncManager';

type UseAppSyncProps = {
  initialData: AppSyncData;
  currentUser: UserProfile;
  githubConfig: {
    owner: string;
    repo: string;
    branch?: string;
    filePath: string;
    token: string;
  } | null;
};

export function useAppSync({ initialData, currentUser, githubConfig }: UseAppSyncProps) {
  const [data, setData] = useState<AppSyncData>(initialData);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  
  // 初回のリモートPullが完了するまで自動プッシュを完全にロックするフラグ
  const [isInitialized, setIsInitialized] = useState<boolean>(false);
  
  const isInitialMount = useRef(true);
  const logTimerRef = useRef<{ [key: string]: ReturnType<typeof setTimeout> }>({});

  // 状態を保持するためのref（非同期処理内での最新の isSyncing 参照用）
  const isSyncingRef = useRef(isSyncing);
  useEffect(() => {
    isSyncingRef.current = isSyncing;
  }, [isSyncing]);

  // 1. リモートから最新を取得してマージする関数（多重実行ガード付き）
  const pullFromRemote = useCallback(async () => {
    if (!githubConfig || !githubConfig.token) {
      setIsInitialized(true);
      return;
    }

    if (isSyncingRef.current) {
      return;
    }

    setIsSyncing(true);
    setSyncError(null);

    try {
      const { data: remoteData } = await fetchAllFromGitHub(githubConfig);
      if (remoteData) {
        setData(local => mergeAppSyncData(local, remoteData));
      }
    } catch (err: any) {
      setSyncError(err.message || '同期エラーが発生しました');
    } finally {
      setIsSyncing(false);
      setIsInitialized(true);
    }
  }, [githubConfig?.owner, githubConfig?.repo, githubConfig?.branch, githubConfig?.filePath, githubConfig?.token]);

  // 初回マウント時に取得
  useEffect(() => {
    pullFromRemote();
  }, [pullFromRemote]);

  // タブ切り替え & 10秒ごとの定期ポーリング
  useEffect(() => {
    if (!githubConfig || !githubConfig.token) return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log('[Sync] Tab became visible. Pulling latest data...');
        pullFromRemote();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    const interval = setInterval(() => {
      pullFromRemote();
    }, 10000);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      clearInterval(interval);
    };
  }, [githubConfig?.token, pullFromRemote]);

  // 2. 自動同期（デバウンス: 変更後3秒間操作がなければプッシュ）
  useEffect(() => {
    if (!isInitialized) return;

    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    if (!githubConfig || !githubConfig.token) return;

    const timer = setTimeout(async () => {
      setIsSyncing(true);
      try {
        await pushToGitHub(githubConfig, data);
        setSyncError(null);
      } catch (err: any) {
        setSyncError(`自動同期失敗: ${err.message}`);
      } finally {
        setIsSyncing(false);
      }
    }, 3000);

    return () => clearTimeout(timer);
  }, [data, githubConfig, isInitialized]);

  // 3. データを更新しつつ、自動で監査ログを残す汎用セッター
  const updateDataWithAction = useCallback((
    updater: (prev: AppSyncData) => AppSyncData,
    action: AuditLog['action'],
    details: string,
    debounceTime = 1000
  ) => {
    setData(prev => {
      const nextData = updater(prev);

      if (debounceTime > 0) {
        if (logTimerRef.current[action]) {
          clearTimeout(logTimerRef.current[action]);
        }
        logTimerRef.current[action] = setTimeout(() => {
          setData(current => {
            const newLog = createAuditLog(currentUser, action, details);
            return {
              ...current,
              logs: [newLog, ...current.logs].slice(0, 1000),
            };
          });
        }, debounceTime);
      } else {
        const newLog = createAuditLog(currentUser, action, details);
        return {
          ...nextData,
          logs: [newLog, ...nextData.logs].slice(0, 1000),
        };
      }

      return nextData;
    });
  }, [currentUser]);

  return {
    data,
    setData,
    updateDataWithAction,
    isSyncing,
    syncError,
    manualSync: pullFromRemote,
  };
}