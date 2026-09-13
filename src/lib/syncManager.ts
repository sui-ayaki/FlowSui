// src/lib/syncManager.ts

import type { AppSyncData, AuditLog, UserProfile } from '../types';

/**
 * トークンの種類やフォーマットを安全に正規化し、適切な Authorization ヘッダーを生成する
 */
function getAuthHeader(token: string): string {
  const cleanToken = token ? token.trim() : '';
  if (cleanToken.startsWith('github_pat_')) {
    return `Bearer ${cleanToken}`;
  }
  return cleanToken.startsWith('ghp_') ? `token ${cleanToken}` : `Bearer ${cleanToken}`;
}

/**
 * GitHubのトークンからユーザー情報を安全に取得する（簡易ログイン・自動特定用）
 */
export async function fetchGitHubUser(token: string): Promise<{ login: string; name?: string; avatarUrl: string }> {
  const authHeader = getAuthHeader(token);

  const response = await fetch("https://api.github.com/user", {
    headers: {
      'Authorization': authHeader,
      'Accept': 'application/vnd.github+json',
    },
    cache: 'no-store',
  });

  if (!response.ok) {
    const errBody = await response.text().catch(() => '');
    throw new Error(`GitHubトークンの検証に失敗しました (${response.status}): トークンが正しくないか、必要なスコープ(権限)が不足しています。 (${errBody})`);
  }

  const data = await response.json();
  return {
    login: data.login,
    name: data.name || data.login,
    avatarUrl: data.avatar_url,
  };
}

/**
 * updatedAt を持つ一般的なアイテム用のマージ (Last-Write-Wins)
 */
export function mergeArrays<T extends { id: string; updatedAt: string }>(
  local: T[],
  remote: T[]
): T[] {
  const mergedMap = new Map<string, T>();

  for (const item of remote) {
    mergedMap.set(item.id, item);
  }

  for (const item of local) {
    const existing = mergedMap.get(item.id);
    if (!existing || new Date(item.updatedAt) > new Date(existing.updatedAt)) {
      mergedMap.set(item.id, item);
    }
  }

  return Array.from(mergedMap.values());
}

/**
 * timestamp を持つ監査ログ用のマージ
 */
export function mergeLogs(local: AuditLog[], remote: AuditLog[]): AuditLog[] {
  const mergedMap = new Map<string, AuditLog>();

  for (const log of remote) {
    mergedMap.set(log.id, log);
  }

  for (const log of local) {
    if (!mergedMap.has(log.id)) {
      mergedMap.set(log.id, log);
    }
  }

  return Array.from(mergedMap.values())
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 1000);
}

export function createAuditLog(
  currentUser: UserProfile,
  action: AuditLog['action'],
  details: string
): AuditLog {
  return {
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    userId: currentUser.id,
    userName: currentUser.name,
    action,
    details,
  };
}

export function mergeAppSyncData(localData: AppSyncData, remoteData: AppSyncData): AppSyncData {
  return {
    events: mergeArrays(localData.events, remoteData.events),
    tasks: mergeArrays(localData.tasks, remoteData.tasks),
    goals: mergeArrays(localData.goals, remoteData.goals),
    tags: mergeArrays(localData.tags, remoteData.tags),
    members: mergeArrays(localData.members, remoteData.members),
    logs: mergeLogs(localData.logs, remoteData.logs),
    lastSyncedAt: new Date().toISOString(),
  };
}

type GithubConfig = {
  owner: string;
  repo: string;
  branch?: string;
  filePath: string;
  token: string;
};

export type CoreSyncData = Omit<AppSyncData, 'logs'>;

/**
 * 内部用の単一ファイル取得ヘルパー
 */
async function fetchFromGitHubRaw(config: GithubConfig, path: string): Promise<{ data: any | null; sha: string | null }> {
  const branch = config.branch || 'main';
  const url = `https://api.github.com/repos/${config.owner}/${config.repo}/contents/${path}?ref=${branch}&t=${Date.now()}`;

  try {
    const response = await fetch(url, {
      headers: {
        'Authorization': getAuthHeader(config.token),
        'Accept': 'application/vnd.github+json',
      },
      cache: 'no-store',
    });

    if (response.status === 404) {
      return { data: null, sha: null };
    }

    if (!response.ok) {
      throw new Error(`GitHubからのデータ取得に失敗しました (${path}): ${response.statusText}`);
    }

    const result = await response.json();
    const decodedContent = decodeURIComponent(
      atob(result.content)
        .split('')
        .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );

    return { data: JSON.parse(decodedContent), sha: result.sha };
  } catch (error) {
    return { data: null, sha: null };
  }
}

/**
 * GitHubからメインデータとログデータを両方取得する
 */
export async function fetchAllFromGitHub(config: GithubConfig): Promise<{ data: AppSyncData | null; sha: string | null }> {
  const logsFilePath = config.filePath.replace(/\.json$/, '-logs.json');
  
  const [mainResult, logsResult] = await Promise.all([
    fetchFromGitHubRaw(config, config.filePath),
    fetchFromGitHubRaw(config, logsFilePath),
  ]);

  if (!mainResult.data && !logsResult.data) {
    return { data: null, sha: null };
  }

  const combinedData: AppSyncData = {
    events: mainResult.data?.events || [],
    tasks: mainResult.data?.tasks || [],
    goals: mainResult.data?.goals || [],
    tags: mainResult.data?.tags || [],
    members: mainResult.data?.members || [],
    logs: logsResult.data?.logs || [],
    lastSyncedAt: new Date().toISOString(),
  };

  return {
    data: combinedData,
    sha: mainResult.sha,
  };
}

// 互換性のための既存 fetchFromGitHub
export async function fetchFromGitHub(config: GithubConfig): Promise<{ data: AppSyncData | null; sha: string | null }> {
  return fetchAllFromGitHub(config);
}

/**
 * Git Database API を使った堅牢なコミット＆プッシュ処理（メイン＆ログ分離対応）
 */
async function executeGitDbPush(
  config: GithubConfig,
  dataToPush: AppSyncData,
  retryCount = 0
): Promise<void> {
  const branch = config.branch || 'main';
  const baseUrl = `https://api.github.com/repos/${config.owner}/${config.repo}`;
  const headers = {
    'Authorization': getAuthHeader(config.token),
    'Accept': 'application/vnd.github+json',
    'Content-Type': 'application/json',
  };

  const logsFilePath = config.filePath.replace(/\.json$/, '-logs.json');

  // 1. 最新のリモートデータを取得してマージ
  const { data: remoteData } = await fetchAllFromGitHub(config);
  const finalData = remoteData ? mergeAppSyncData(dataToPush, remoteData) : dataToPush;

  const coreData: CoreSyncData = {
    events: finalData.events,
    tasks: finalData.tasks,
    goals: finalData.goals,
    tags: finalData.tags,
    members: finalData.members,
    lastSyncedAt: new Date().toISOString(),
  };

  const logsData = {
    logs: finalData.logs,
  };

  const coreJsonString = JSON.stringify(coreData, null, 2);
  const logsJsonString = JSON.stringify(logsData, null, 2);

  // 2. 2つの Blob を作成（メイン用とログ用）
  const [coreBlobRes, logsBlobRes] = await Promise.all([
    fetch(`${baseUrl}/git/blobs`, { method: 'POST', headers, body: JSON.stringify({ content: coreJsonString, encoding: 'utf-8' }) }),
    fetch(`${baseUrl}/git/blobs`, { method: 'POST', headers, body: JSON.stringify({ content: logsJsonString, encoding: 'utf-8' }) }),
  ]);

  if (!coreBlobRes.ok || !logsBlobRes.ok) throw new Error('Failed to create Git blobs for split files');
  
  const coreBlobJson = await coreBlobRes.json();
  const logsBlobJson = await logsBlobRes.json();

  // 3. 現在のブランチの最新コミット（HEAD）を取得
  const refRes = await fetch(`${baseUrl}/git/ref/heads/${branch}`, { headers });
  
  let parentCommitSha: string | null = null;
  let baseTreeSha: string | null = null;

  if (refRes.ok) {
    const refJson = await refRes.json();
    parentCommitSha = refJson.object.sha;

    const commitRes = await fetch(`${baseUrl}/git/commits/${parentCommitSha}`, { headers });
    if (commitRes.ok) {
      const commitJson = await commitRes.json();
      baseTreeSha = commitJson.tree.sha;
    }
  }

  // 4. 新しいツリーを作成（2つのファイルを指定）
  const treeBody: any = {
    tree: [
      {
        path: config.filePath,
        mode: '100644',
        type: 'blob',
        sha: coreBlobJson.sha,
      },
      {
        path: logsFilePath,
        mode: '100644',
        type: 'blob',
        sha: logsBlobJson.sha,
      },
    ],
  };
  if (baseTreeSha) {
    treeBody.base_tree = baseTreeSha;
  }

  const treeRes = await fetch(`${baseUrl}/git/trees`, {
    method: 'POST',
    headers,
    body: JSON.stringify(treeBody),
  });
  if (!treeRes.ok) throw new Error('Failed to create Git tree');
  const treeJson = await treeRes.json();

  // 5. 新しいコミットを作成
  const commitBody: any = {
    message: `Auto-sync (split logs): ${new Date().toISOString()}`,
    tree: treeJson.sha,
    parents: parentCommitSha ? [parentCommitSha] : [],
  };

  const newCommitRes = await fetch(`${baseUrl}/git/commits`, {
    method: 'POST',
    headers,
    body: JSON.stringify(commitBody),
  });
  if (!newCommitRes.ok) throw new Error('Failed to create Git commit');
  const newCommitJson = await newCommitRes.json();

  // 6. ブランチの参照（Ref）を更新
  const updateRefRes = await fetch(`${baseUrl}/git/refs/heads/${branch}`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({
      sha: newCommitJson.sha,
      force: false, 
    }),
  });

  if (!updateRefRes.ok && retryCount < 2) {
    console.warn('[Sync] Ref update conflict. Retrying with fresh merge...');
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 1000));
    return executeGitDbPush(config, finalData, retryCount + 1);
  }

  if (!updateRefRes.ok) {
    const errText = await updateRefRes.text();
    throw new Error(`Git Refの更新に失敗しました: ${errText}`);
  }
}

// --- 排他ロック（Mutex）および最新状態キープ ---
let isSyncLocked = false;
let pendingData: { config: GithubConfig; data: AppSyncData } | null = null;

export async function pushToGitHub(
  config: GithubConfig,
  data: AppSyncData,
  _currentSha?: string | null
): Promise<void> {
  if (isSyncLocked) {
    console.log('[Sync] Communication in progress. Queuing latest state...');
    pendingData = { config, data };
    return;
  }

  isSyncLocked = true;

  try {
    await executeGitDbPush(config, data);
  } catch (error) {
    console.error('[Sync] Git DB Push failed:', error);
    throw error;
  } finally {
    isSyncLocked = false;

    if (pendingData) {
      const nextBatch = pendingData;
      pendingData = null;
      console.log('[Sync] Processing queued latest state...');
      try {
        await pushToGitHub(nextBatch.config, nextBatch.data);
      } catch (err) {
        console.error('[Sync] Queued sync failed:', err);
      }
    }
  }
}