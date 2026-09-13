// src/components/tabs/SyncTab.tsx
import { useState } from 'react';
import { RefreshCw, Key, CheckCircle2, AlertCircle, Plus, Trash2, Check, Shield } from 'lucide-react';
import type { ConnectionProfile, UserProfile } from '../../types';

type SyncTabProps = {
  profiles: ConnectionProfile[];
  activeProfile: ConnectionProfile | null;
  onSwitchProfile: (id: string) => void;
  onAddProfile: (params: {
    profileName: string;
    owner: string;
    repo: string;
    branch?: string;
    filePath?: string;
    token: string;
  }) => Promise<void>;
  onRemoveProfile: (id: string) => void;
  onManualSync: () => void;
  isSyncing: boolean;
  syncError: string | null;
  lastSyncedAt: string;
  theme?: 'light' | 'dark';
  currentUser: UserProfile;
};

export default function SyncTab({
  profiles,
  activeProfile,
  onSwitchProfile,
  onAddProfile,
  onRemoveProfile,
  onManualSync,
  isSyncing,
  syncError,
  lastSyncedAt,
  theme = 'light',
}: SyncTabProps) {
  const isDark = theme === 'dark';

  // 新規プロファイル追加フォームの状態
  const [profileName, setProfileName] = useState('');
  const [owner, setOwner] = useState('');
  const [repo, setRepo] = useState('');
  const [branch, setBranch] = useState('main');
  const [filePath, setFilePath] = useState('flowsui-data.json');
  const [token, setToken] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState(false);

  // フォーム送信（新規プロファイル追加）
  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileName || !owner || !repo || !token) {
      setErrorMsg('必須項目をすべて入力してください。');
      return;
    }

    try {
      setIsLoading(true);
      setErrorMsg(null);
      
      // トークンを検証しつつプロファイルを追加（裏で fetchGitHubUser が走ります）
      await onAddProfile({
        profileName,
        owner,
        repo,
        branch: branch || 'main',
        filePath: filePath || 'flowsui-data.json',
        token,
      });

      // フォームをクリア
      setProfileName('');
      setOwner('');
      setRepo('');
      setBranch('main');
      setFilePath('flowsui-data.json');
      setToken('');
      setSuccessMsg(true);
      setTimeout(() => setSuccessMsg(false), 3000);
    } catch (err: any) {
      setErrorMsg(err.message || 'プロファイルの追加に失敗しました。トークンを確認してください。');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={`p-8 max-w-4xl mx-auto space-y-8 ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black flex items-center gap-2">
            <RefreshCw className={`w-6 h-6 text-blue-500 ${isSyncing ? 'animate-spin' : ''}`} />
            GitHub 接続プロファイル管理
          </h2>
          <p className={`text-sm mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            複数のプロジェクト（リポジトリ）やアカウントを切り替えて共同編集を行います。
          </p>
        </div>
      </div>

      {/* 現在アクティブな接続のステータスカード */}
      {activeProfile ? (
        <div className={`p-5 rounded-2xl border flex items-center justify-between ${
          isDark ? 'bg-slate-900/50 border-slate-800' : 'bg-slate-50 border-slate-200'
        }`}>
          <div className="flex items-center gap-4">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
              syncError ? 'bg-red-500/10 text-red-500' : 'bg-emerald-500/10 text-emerald-500'
            }`}>
              {syncError ? <AlertCircle className="w-5 h-5" /> : <CheckCircle2 className="w-5 h-5" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm">接続中: {activeProfile.profileName}</span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                  isDark ? 'bg-slate-800 text-slate-300' : 'bg-slate-200 text-slate-700'
                }`}>
                  {activeProfile.owner}/{activeProfile.repo}
                </span>
              </div>
              <div className={`text-xs mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                操作ユーザー: <span className="font-bold text-blue-500">@{activeProfile.currentUser.login}</span> | 最終同期: {lastSyncedAt ? new Date(lastSyncedAt).toLocaleString() : '未同期'}
              </div>
            </div>
          </div>

          <button
            onClick={onManualSync}
            disabled={isSyncing}
            className={`px-4 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 transition-all ${
              isSyncing
                ? 'opacity-50 cursor-not-allowed bg-slate-300 text-slate-600 dark:bg-slate-800 dark:text-slate-500'
                : 'bg-blue-600 hover:bg-blue-700 text-white shadow-md cursor-pointer'
            }`}
          >
            <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
            今すぐ手動同期
          </button>
        </div>
      ) : (
        <div className={`p-5 rounded-2xl border text-center text-sm ${
          isDark ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' : 'bg-amber-50 border-amber-200 text-amber-700'
        }`}>
          ⚠️ 接続プロファイルが選択されていません。下記から新しくプロファイルを追加してください。
        </div>
      )}

      {/* 登録済みプロファイル一覧 ＆ 切り替え */}
      <div className={`p-6 rounded-2xl border space-y-4 ${
        isDark ? 'bg-slate-900/50 border-slate-800' : 'bg-white border-slate-200 shadow-xs'
      }`}>
        <h3 className="font-bold text-sm flex items-center gap-2">
          <Shield className="w-4 h-4 text-blue-500" />
          保存済みプロファイル一覧
        </h3>

        {profiles.length === 0 ? (
          <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            まだプロファイルが登録されていません。
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {profiles.map(profile => {
              const isActive = profile.id === activeProfile?.id;
              return (
                <div
                  key={profile.id}
                  className={`p-4 rounded-xl border flex items-center justify-between transition-all ${
                    isActive
                      ? isDark ? 'bg-blue-600/10 border-blue-500/50' : 'bg-blue-50 border-blue-300'
                      : isDark ? 'bg-slate-800/50 border-slate-700' : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <img
                      src={profile.currentUser.avatarUrl}
                      alt={profile.currentUser.login}
                      className="w-9 h-9 rounded-full border border-slate-500/30"
                    />
                    <div>
                      <div className="font-bold text-sm flex items-center gap-2">
                        {profile.profileName}
                        {isActive && (
                          <span className="text-[10px] px-2 py-0.5 rounded bg-blue-600 text-white font-bold">
                            アクティブ
                          </span>
                        )}
                      </div>
                      <div className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                        {profile.owner} / {profile.repo} ({profile.branch || 'main'}) • ユーザー: @{profile.currentUser.login}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {!isActive && (
                      <button
                        onClick={() => onSwitchProfile(profile.id)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          isDark ? 'bg-slate-700 hover:bg-slate-600 text-white' : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-300'
                        }`}
                      >
                        切り替える
                      </button>
                    )}
                    <button
                      onClick={() => onRemoveProfile(profile.id)}
                      className="p-2 rounded-lg text-red-500 hover:bg-red-500/10 transition-all cursor-pointer"
                      title="プロファイルを削除"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 新規プロファイル追加フォーム */}
      <form onSubmit={handleAddSubmit} className={`p-6 rounded-2xl border space-y-4 ${
        isDark ? 'bg-slate-900/50 border-slate-800' : 'bg-white border-slate-200 shadow-xs'
      }`}>
        <h3 className="font-bold text-sm flex items-center gap-2">
          <Plus className="w-4 h-4 text-emerald-500" />
          新しい接続プロファイルを追加
        </h3>
        <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
          GitHubの個人用アクセス トークン（PAT）を入力すると、自動であなたのGitHubアカウントが特定され、プロファイルが作成されます。
        </p>

        {errorMsg && (
          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-xs font-bold">
            {errorMsg}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={`block text-xs font-bold mb-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
              プロファイル名（識別用・例: A社プロジェクト）
            </label>
            <input
              type="text"
              placeholder="例: 個人用リポ、チーム開発"
              value={profileName}
              onChange={(e) => setProfileName(e.target.value)}
              className={`w-full px-3 py-2 rounded-xl text-sm border outline-none ${
                isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-800'
              }`}
              required
            />
          </div>

          <div>
            <label className={`block text-xs font-bold mb-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
              GitHub オーナー名（ユーザーまたは組織名）
            </label>
            <input
              type="text"
              placeholder="例: b-san"
              value={owner}
              onChange={(e) => setOwner(e.target.value)}
              className={`w-full px-3 py-2 rounded-xl text-sm border outline-none ${
                isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-800'
              }`}
              required
            />
          </div>

          <div>
            <label className={`block text-xs font-bold mb-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
              リポジトリ名
            </label>
            <input
              type="text"
              placeholder="例: flowsui-shared-data"
              value={repo}
              onChange={(e) => setRepo(e.target.value)}
              className={`w-full px-3 py-2 rounded-xl text-sm border outline-none ${
                isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-800'
              }`}
              required
            />
          </div>

          <div>
            <label className={`block text-xs font-bold mb-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
              ブランチ名 (デフォルト: main)
            </label>
            <input
              type="text"
              value={branch}
              onChange={(e) => setBranch(e.target.value)}
              className={`w-full px-3 py-2 rounded-xl text-sm border outline-none ${
                isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-800'
              }`}
            />
          </div>

          <div>
            <label className={`block text-xs font-bold mb-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
              JSONファイルのパス
            </label>
            <input
              type="text"
              value={filePath}
              onChange={(e) => setFilePath(e.target.value)}
              className={`w-full px-3 py-2 rounded-xl text-sm border outline-none ${
                isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-800'
              }`}
            />
          </div>
        </div>

        <div>
          <label className={`block text-xs font-bold mb-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
            GitHub Personal Access Token (PAT)
          </label>
          <input
            type="password"
            placeholder="ghp_xxxxxxxxxxxx または Fine-grained token"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            className={`w-full px-3 py-2 rounded-xl text-sm border outline-none ${
              isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-800'
            }`}
            required
          />
        </div>

        <div className="flex items-center justify-between pt-2">
          {successMsg ? (
            <span className="text-xs text-emerald-500 font-bold flex items-center gap-1">
              <Check className="w-4 h-4" /> プロファイルを正常に追加しました！
            </span>
          ) : <span />}
          <button
            type="submit"
            disabled={isLoading}
            className={`px-5 py-2.5 rounded-xl font-bold text-sm transition-all cursor-pointer flex items-center gap-2 ${
              isLoading
                ? 'opacity-50 cursor-not-allowed bg-slate-600 text-white'
                : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-md'
            }`}
          >
            {isLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            {isLoading ? 'トークンを検証中...' : 'プロファイルを追加して接続'}
          </button>
        </div>
      </form>
    </div>
  );
}