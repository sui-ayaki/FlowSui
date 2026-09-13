// src/hooks/useConnectionProfiles.ts

import { useState, useEffect } from 'react';
import type { ConnectionProfile, UserProfile } from '../types';
import { fetchGitHubUser } from '../lib/syncManager';

const STORAGE_KEY_PROFILES = 'flowsui_connection_profiles_v1';
const STORAGE_KEY_ACTIVE_ID = 'flowsui_active_profile_id_v1';

export function useConnectionProfiles() {
  // 1. プロファイル一覧のステート
  const [profiles, setProfiles] = useState<ConnectionProfile[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_PROFILES);
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      console.error('Failed to load connection profiles from storage:', e);
      return [];
    }
  });

  // 2. 現在アクティブなプロファイルIDのステート
  const [activeProfileId, setActiveProfileId] = useState<string | null>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_ACTIVE_ID);
      return saved || (profiles.length > 0 ? profiles[0].id : null);
    } catch (e) {
      return null;
    }
  });

  // 3. localStorageへ自動保存
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_PROFILES, JSON.stringify(profiles));
    } catch (e) {
      console.error('Failed to save connection profiles:', e);
    }
  }, [profiles]);

  useEffect(() => {
    if (activeProfileId) {
      localStorage.setItem(STORAGE_KEY_ACTIVE_ID, activeProfileId);
    } else {
      localStorage.removeItem(STORAGE_KEY_ACTIVE_ID);
    }
  }, [activeProfileId]);

  // 現在アクティブなプロファイルオブジェクト[cite: 4]
  const activeProfile = profiles.find(p => p.id === activeProfileId) || null;

  // プロファイルに保存された isOwner フラグを信頼してロールを決定（なければフォールバック判定）
  const isRepoOwner = activeProfile ? (activeProfile as any).isOwner : false;

  const currentUser: UserProfile = activeProfile ? {
    id: `gh_${activeProfile.currentUser.login}`,
    name: activeProfile.currentUser.name || activeProfile.currentUser.login,
    role: isRepoOwner ? 'owner' : 'member', 
    roleTitle: isRepoOwner ? `リポジトリオーナー (${activeProfile.currentUser.login})` : `メンバー (${activeProfile.currentUser.login})`,
    avatarUrl: activeProfile.currentUser.avatarUrl,
    updatedAt: new Date().toISOString(),
    isDeleted: false,
  } : {
    id: 'guest',
    name: 'ゲストユーザー',
    role: 'member',
    roleTitle: '未接続',
    updatedAt: new Date().toISOString(),
    isDeleted: false,
  };

  /**
   * 新しいプロファイルを追加する
   */
  const addProfile = async (params: {
    profileName: string;
    owner: string;
    repo: string;
    branch?: string;
    filePath?: string;
    token: string;
  }) => {
    // 1. トークンから実際のGitHubユーザー情報を取得
    const githubUser = await fetchGitHubUser(params.token);

    const targetBranch = params.branch || 'main';
    const targetFilePath = params.filePath || 'flowsui-data.json';

    // 2. GitHub APIを叩いて、リポジトリの本当のオーナー（管理者）情報を取得する
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
        // リポジトリの owner.login と、ログインしてきたユーザーの login が一致するか
        if (repoData.owner && repoData.owner.login.toLowerCase() === githubUser.login.toLowerCase()) {
          isOwner = true;
        }
      }
    } catch (e) {
      console.warn('Failed to verify repository owner via API, falling back to name comparison:', e);
      // フォールバック：API失敗時は従来の文字列比較
      isOwner = params.owner.toLowerCase() === githubUser.login.toLowerCase();
    }

    // 3. 重複チェック
    const isDuplicate = profiles.some(p => 
      p.owner.toLowerCase() === params.owner.toLowerCase() &&
      p.repo.toLowerCase() === params.repo.toLowerCase() &&
      (p.branch || 'main') === targetBranch &&
      (p.filePath || 'flowsui-data.json') === targetFilePath &&
      p.currentUser.login.toLowerCase() === githubUser.login.toLowerCase()
    );

    if (isDuplicate) {
      throw new Error(`このリポジトリ (${params.owner}/${params.repo}) には、すでにユーザー「${githubUser.login}」のプロファイルが登録されています。`);
    }

    const newProfile: ConnectionProfile & { isOwner?: boolean } = {
      id: crypto.randomUUID(),
      profileName: params.profileName,
      owner: params.owner,
      repo: params.repo,
      branch: targetBranch,
      filePath: targetFilePath,
      token: params.token,
      currentUser: {
        login: githubUser.login,
        name: githubUser.name,
        avatarUrl: githubUser.avatarUrl,
      },
      isOwner: isOwner, // 判定結果をここに保持！
    };

    setProfiles(prev => [...prev, newProfile]);
    
    if (!activeProfileId) {
      setActiveProfileId(newProfile.id);
    }

    return newProfile;
  };

  /**
   * プロファイルを削除する
   */
  const removeProfile = (id: string) => {
    setProfiles(prev => {
      const filtered = prev.filter(p => p.id !== id);
      return filtered;
    });

    if (activeProfileId === id) {
      const remaining = profiles.filter(p => p.id !== id);
      setActiveProfileId(remaining.length > 0 ? remaining[0].id : null);
    }
  };

  /**
   * アクティブなプロファイルを切り替える
   */
  const switchProfile = (id: string) => {
    if (profiles.some(p => p.id === id)) {
      setActiveProfileId(id);
    }
  };

  return {
    profiles,
    activeProfile,
    activeProfileId,
    currentUser,
    addProfile,
    removeProfile,
    switchProfile,
  };
}