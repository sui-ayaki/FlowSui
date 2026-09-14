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
  storageKey?: string; // ローカルストレージに保存する際のキー名
};

export function useAppSync({ initialData, currentUser, githubConfig, storageKey = 'app_sync_data_v1' }: UseAppSyncProps) {
  // 1. 初期化時にローカルストレージから前回のデータを復元する（なければ initialData）
  const [data, setData] = useState<AppSyncData>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        // initialData とマージして、新しい型やプロパティの欠損を防ぐ
        return {
          ...initialData,
          ...parsed,
        };
      }
    } catch (e) {
      console.error('[Storage] Failed to load from localStorage:', e);
    }
    return initialData;
  });

  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  
  // 初回のリモートPullが完了するまで自動プッシュを完全にロックするフラグ
  const [isInitialized, setIsInitialized] = useState<boolean>(false);
  
  // 未同期の変更があるかどうかのフラグ（ウィンドウ終了ガード用）
  const [isDirty, setIsDirty] = useState<boolean>(false);
  
  const isInitialMount = useRef(true);
  const logTimerRef = useRef<{ [key: string]: ReturnType<typeof setTimeout> }>({});

  // 状態を保持するためのref（非同期処理内での最新の isSyncing 参照用）
  const isSyncingRef = useRef(isSyncing);
  useEffect(() => {
    isSyncingRef.current = isSyncing;
  }, [isSyncing]);

  // 2. データが更新されたら即座にローカルストレージへ保存する
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(data));
    } catch (e) {
      console.error('[Storage] Failed to save to localStorage:', e);
    }
  }, [data, storageKey]);

  // 3. ウィンドウを閉じようとしたときに同期中・未同期変更があれば警告を出すガード
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isSyncing || isDirty) {
        e.preventDefault();
        e.returnValue = ''; // 標準の警告ダイアログを表示
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isSyncing, isDirty]);

  // 4. リモートから最新を取得してマージする関数（多重実行ガード付き）
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
        setData(local => {
          const merged = mergeAppSyncData(local, remoteData);
          return merged;
        });
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

  // 5. 自動同期（デバウンス: 変更後3秒間操作がなければプッシュ）
  useEffect(() => {
    if (!isInitialized) return;

    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    if (!githubConfig || !githubConfig.token) return;

    // 変更が発生したので未同期フラグをON
    setIsDirty(true);

    const timer = setTimeout(async () => {
      setIsSyncing(true);
      try {
        await pushToGitHub(githubConfig, data);
        setSyncError(null);
        // プッシュが成功したら未同期フラグをOFF
        setIsDirty(false);
      } catch (err: any) {
        setSyncError(`自動同期失敗: ${err.message}`);
      } finally {
        setIsSyncing(false);
      }
    }, 3000);

    return () => clearTimeout(timer);
  }, [data, githubConfig, isInitialized]);

  // 6. データを更新しつつ、自動で監査ログを残す汎用セッター（完全維持）
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
    isDirty, // 未保存・未同期の変更があるかどうかのフラグ
    manualSync: pullFromRemote,
  };
}