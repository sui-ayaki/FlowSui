// src/components/tabs/LogsTab.tsx
import { useState } from 'react';
import type { AuditLog } from '../../types';
import { History, Search, ShieldAlert, Calendar, CheckSquare, Target, Users, RefreshCw } from 'lucide-react';

type LogsTabProps = {
  logs: AuditLog[];
  theme?: 'light' | 'dark';
};

export default function LogsTab({ logs, theme = 'light' }: LogsTabProps) {
  const isDark = theme == 'dark';
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAction, setSelectedAction] = useState<string>('ALL');

  // アクションに応じたアイコンとカラーを返すヘルパー
  const getActionBadge = (action: AuditLog['action']) => {
    if (action.includes('EVENT')) {
      return { icon: Calendar, color: 'bg-blue-500/10 text-blue-500 border-blue-500/20', label: '予定' };
    }
    if (action.includes('TASK')) {
      return { icon: CheckSquare, color: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20', label: 'タスク' };
    }
    if (action.includes('GOAL')) {
      return { icon: Target, color: 'bg-purple-500/10 text-purple-500 border-purple-500/20', label: '目標' };
    }
    if (action.includes('MEMBER') || action.includes('ROLE')) {
      return { icon: Users, color: 'bg-amber-500/10 text-amber-500 border-amber-500/20', label: 'メンバー' };
    }
    return { icon: RefreshCw, color: 'bg-slate-500/10 text-slate-500 border-slate-500/20', label: '同期・その他' };
  };

  // フィルター処理
  const filteredLogs = logs.filter(log => {
    const matchesSearch = 
      log.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.details.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.action.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesAction = 
      selectedAction === 'ALL' || 
      log.action.startsWith(selectedAction);

    return matchesSearch && matchesAction;
  });

  return (
    <div className={`p-8 max-w-4xl mx-auto space-y-8 ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
      {/* ヘッダー */}
      <div>
        <h2 className="text-2xl font-black flex items-center gap-2">
          <History className="w-6 h-6 text-blue-500" />
          アクティビティ・監査ログ
        </h2>
        <p className={`text-sm mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
          プロジェクト内で行われたすべての変更や操作の履歴をDiscord風に記録・確認できます。
        </p>
      </div>

      {/* 検索・フィルターバー */}
      <div className="flex flex-col md:flex-row gap-3">
        <div className={`flex-1 flex items-center gap-2 px-3 py-2 rounded-xl border ${
          isDark ? 'bg-slate-900/50 border-slate-800' : 'bg-white border-slate-200 shadow-xs'
        }`}>
          <Search className="w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="ユーザー名や詳細で検索..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-transparent text-sm outline-none"
          />
        </div>

        <select
          value={selectedAction}
          onChange={(e) => setSelectedAction(e.target.value)}
          className={`px-4 py-2 rounded-xl text-sm border outline-none cursor-pointer ${
            isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-800'
          }`}
        >
          <option value="ALL">すべてのアクション</option>
          <option value="EVENT">予定 (Event)</option>
          <option value="TASK">タスク (Task)</option>
          <option value="GOAL">目標 (Goal)</option>
          <option value="MEMBER">メンバー・権限 (Member)</option>
          <option value="SYNC">同期 (Sync)</option>
        </select>
      </div>

      {/* ログ一覧 */}
      <div className={`rounded-2xl border divide-y ${
        isDark ? 'bg-slate-900/50 border-slate-800 divide-slate-800' : 'bg-white border-slate-200 divide-slate-100 shadow-xs'
      }`}>
        {filteredLogs.length === 0 ? (
          <div className="p-12 text-center text-sm text-slate-400 flex flex-col items-center gap-2">
            <ShieldAlert className="w-8 h-8 opacity-40" />
            ログが見つかりませんでした
          </div>
        ) : (
          filteredLogs.map((log) => {
            const badge = getActionBadge(log.action);
            const Icon = badge.icon;

            return (
              <div key={log.id} className="p-4 flex items-start gap-4 transition-colors hover:bg-slate-500/5">
                <div className={`p-2.5 rounded-xl border mt-0.5 ${badge.color}`}>
                  <Icon className="w-4 h-4" />
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm">{log.userName}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full border font-semibold ${badge.color}`}>
                        {log.action}
                      </span>
                    </div>
                    <span className={`text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                      {new Date(log.timestamp).toLocaleString()}
                    </span>
                  </div>
                  
                  <p className={`text-sm mt-1 break-words ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                    {log.details}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}