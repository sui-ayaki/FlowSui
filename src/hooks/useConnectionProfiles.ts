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

// アクティブなプロファイルのGitHubユーザーを、アプリ用の `UserProfile` として自動解決
  const isRepoOwner = activeProfile && activeProfile.owner.toLowerCase() === activeProfile.currentUser.login.toLowerCase();

  const currentUser: UserProfile = activeProfile ? {
    id: `gh_${activeProfile.currentUser.login}`,
    name: activeProfile.currentUser.name || activeProfile.currentUser.login,
    role: isRepoOwner ? 'owner' : 'member', // リポジトリの所有者なら owner、違えば member
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
    // 1. まずトークンから実際のGitHubユーザー情報を取得する
    const githubUser = await fetchGitHubUser(params.token);

    const targetBranch = params.branch || 'main';
    const targetFilePath = params.filePath || 'flowsui-data.json';

    // 2. 「同じリポジトリ・ファイルパス」かつ「同一のGitHubユーザー(login)」のプロファイルが既に存在するかチェック
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

    const newProfile: ConnectionProfile = {
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