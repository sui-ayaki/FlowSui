// src/components/tabs/MembersTab.tsx
import { useState } from 'react';
import type { UserProfile, UserRole } from '../../types';
import { Users, UserPlus, Trash2, RotateCcw } from 'lucide-react';

type MembersTabProps = {
  members: UserProfile[];
  currentUser: UserProfile;
  onAddMember: (member: UserProfile) => void;
  onRemoveMember: (id: string) => void;
  onRestoreMember?: (id: string) => void; // ★ 復元用コールバックを追加（オプショナル）
  onUpdateRole: (id: string, role: UserRole) => void;
  theme?: 'light' | 'dark';
};

export default function MembersTab({
  members,
  currentUser,
  onAddMember,
  onRemoveMember,
  onRestoreMember,
  onUpdateRole,
  theme = 'light'
}: MembersTabProps) {
  const isDark = theme === 'dark';
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState<UserRole>('member');
  const [newRoleTitle, setNewRoleTitle] = useState('');

  // オーナー権限チェック（オーナーのみメンバー追加・削除ができる）
  const isOwner = currentUser.role === 'owner';

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    const nowIso = new Date().toISOString();
    const newMember: UserProfile = {
      id: crypto.randomUUID(),
      name: newName.trim(),
      role: newRole,
      roleTitle: newRoleTitle.trim() || undefined,
      isDeleted: false,
      updatedAt: nowIso,
    };

    onAddMember(newMember);
    setNewName('');
    setNewRoleTitle('');
  };

  const getRoleBadgeStyle = (role: UserRole) => {
    switch (role) {
      case 'owner':
        return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
      case 'admin':
        return 'bg-purple-500/10 text-purple-500 border-purple-500/20';
      default:
        return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
    }
  };

  // アクティブなメンバーと削除済みメンバーに分離
  const activeMembers = members.filter(m => !m.isDeleted);
  const deletedMembers = members.filter(m => m.isDeleted);

  return (
    <div className={`p-8 max-w-4xl mx-auto space-y-8 ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black flex items-center gap-2">
            <Users className="w-6 h-6 text-blue-500" />
            メンバー管理・権限設定
          </h2>
          <p className={`text-sm mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            プロジェクトに参加しているメンバーの確認と権限（Owner / Admin / Member）を管理します。
          </p>
        </div>
      </div>

      {/* メンバー追加フォーム（オーナーのみ） */}
      {isOwner && (
        <form onSubmit={handleAdd} className={`p-5 rounded-2xl border ${
          isDark ? 'bg-slate-900/50 border-slate-800' : 'bg-slate-50 border-slate-200'
        } space-y-4`}>
          <h3 className="font-bold text-sm flex items-center gap-2">
            <UserPlus className="w-4 h-4 text-blue-500" />
            新規メンバーの追加
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <input
              type="text"
              placeholder="メンバー名（例: 山田 太郎）"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className={`px-3 py-2 rounded-xl text-sm border outline-none ${
                isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-800'
              }`}
            />
            <input
              type="text"
              placeholder="肩書（例: バックエンド）"
              value={newRoleTitle}
              onChange={(e) => setNewRoleTitle(e.target.value)}
              className={`px-3 py-2 rounded-xl text-sm border outline-none ${
                isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-800'
              }`}
            />
            <div className="flex gap-2">
              <select
                value={newRole}
                onChange={(e) => setNewRole(e.target.value as UserRole)}
                className={`px-3 py-2 rounded-xl text-sm border outline-none flex-1 ${
                  isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-800'
                }`}
              >
                <option value="member">Member (一般)</option>
                <option value="admin">Admin (管理者)</option>
                <option value="owner">Owner (オーナー)</option>
              </select>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl transition-all cursor-pointer"
              >
                追加
              </button>
            </div>
          </div>
        </form>
      )}

      {/* メンバー一覧 */}
      <div className="space-y-3">
        <h3 className="font-bold text-sm">参加メンバー一覧 ({activeMembers.length})</h3>
        <div className="space-y-2">
          {activeMembers.map((member) => (
            <div
              key={member.id}
              className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${
                isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-xs'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${
                  isDark ? 'bg-slate-800 text-blue-400' : 'bg-blue-50 text-blue-600'
                }`}>
                  {member.name.slice(0, 2)}
                </div>
                <div>
                  <div className="font-bold text-sm flex items-center gap-2">
                    {member.name}
                    {member.id === currentUser.id && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500">
                        あなた
                      </span>
                    )}
                  </div>
                  <div className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    {member.roleTitle || '肩書未設定'}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {isOwner ? (
                  <select
                    value={member.role}
                    onChange={(e) => onUpdateRole(member.id, e.target.value as UserRole)}
                    className={`text-xs px-3 py-1.5 rounded-xl border font-semibold outline-none cursor-pointer ${getRoleBadgeStyle(member.role)} ${
                      isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
                    }`}
                  >
                    <option value="owner">Owner</option>
                    <option value="admin">Admin</option>
                    <option value="member">Member</option>
                  </select>
                ) : (
                  <span className={`text-xs px-3 py-1 rounded-full border font-semibold uppercase ${getRoleBadgeStyle(member.role)}`}>
                    {member.role}
                  </span>
                )}

                {isOwner && member.id !== currentUser.id && (
                  <button
                    onClick={() => onRemoveMember(member.id)}
                    className="p-2 text-slate-400 hover:text-red-500 transition-colors cursor-pointer"
                    title="メンバーを削除"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 削除済み（アーカイブ）メンバー一覧 */}
      {isOwner && deletedMembers.length > 0 && (
        <div className="space-y-3 pt-4 border-t border-slate-700/50">
          <h3 className={`font-bold text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            削除済みメンバー ({deletedMembers.length})
          </h3>
          <div className="space-y-2 opacity-75">
            {deletedMembers.map((member) => (
              <div
                key={member.id}
                className={`flex items-center justify-between p-3 rounded-2xl border border-dashed ${
                  isDark ? 'bg-slate-900/40 border-slate-800' : 'bg-slate-50 border-slate-300'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-slate-800 text-slate-500 flex items-center justify-center font-bold text-xs">
                    {member.name.slice(0, 2)}
                  </div>
                  <div>
                    <div className="font-bold text-sm line-through text-slate-400">
                      {member.name}
                    </div>
                    <div className="text-[11px] text-slate-500">
                      {member.roleTitle || '肩書なし'} (削除済み)
                    </div>
                  </div>
                </div>

                {onRestoreMember && (
                  <button
                    type="button"
                    onClick={() => onRestoreMember(member.id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-500 text-xs font-bold rounded-xl transition-all cursor-pointer border border-emerald-500/20"
                    title="メンバーを復元"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    復元
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}