import { useState } from 'react';
import { 
  ArrowLeft, ChevronLeft, ChevronRight, Activity, CheckCircle2, 
  User, Flame, BarChart3, PieChart, Layers, AlertCircle 
} from 'lucide-react';
import type { TaskItem } from './TimelineView';
import type { UserProfile } from '../types';

type AnalyticsViewProps = {
  tasks: TaskItem[];
  members: UserProfile[];
  theme?: 'light' | 'dark';
};

export default function AnalyticsView({ tasks, members, theme = 'light' }: AnalyticsViewProps) {
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const isDark = theme === 'dark';

  // 共通カードクラス
  const cardBgClass = isDark ? 'bg-slate-800 border-slate-700 text-slate-100' : 'bg-white border-slate-200 text-slate-800';
  const subBgClass = isDark ? 'bg-slate-900/60 border-slate-700' : 'bg-slate-50 border-slate-200';
  const textMutedClass = isDark ? 'text-slate-400' : 'text-slate-500';

  const calculateMemberMetrics = (memberId: string) => {
    // 削除済み（isDeleted）のタスクを除外して計算
    const memberTasks = tasks.filter((t) => t.memberId === memberId && !t.isDeleted);
    if (memberTasks.length === 0) {
      return { score: 0, status: 'OPTIMAL', color: 'emerald', label: '余裕あり', totalDays: 0, dependencyCount: 0 };
    }

    let totalDays = 0;
    let dependencyCount = 0;

    memberTasks.forEach((task) => {
      const start = new Date(task.startDate).getTime();
      const end = new Date(task.endDate).getTime();
      const diffDays = Math.max(1, Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1);
      totalDays += diffDays;

      if (task.parentIds && task.parentIds.length > 0) {
        dependencyCount += task.parentIds.length;
      }
    });

    const score = Math.min(100, Math.round((totalDays / 20) * 100));
    let status = 'OPTIMAL';
    let color = 'emerald';
    let label = '適正な負荷';

    if (score >= 80) {
      status = 'CRITICAL';
      color = 'rose';
      label = '過密（要調整）';
    } else if (score >= 50) {
      status = 'HIGH LOAD';
      color = 'amber';
      label = '高負荷';
    }

    return { score, status, color, label, totalDays, dependencyCount };
  };

  const selectedMember = members.find((m) => m.id === selectedMemberId);
  const selectedMemberIndex = members.findIndex((m) => m.id === selectedMemberId);

  const handlePrevMember = () => {
    if (members.length === 0) return;
    setSelectedMemberId(members[selectedMemberIndex > 0 ? selectedMemberIndex - 1 : members.length - 1].id);
  };

  const handleNextMember = () => {
    if (members.length === 0) return;
    setSelectedMemberId(members[selectedMemberIndex < members.length - 1 ? selectedMemberIndex + 1 : 0].id);
  };

  return (
    <div className={`h-full flex flex-col rounded-2xl p-6 overflow-y-auto border shadow-sm transition-colors ${
      isDark ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-slate-50/50 border-slate-200/80 text-slate-800'
    }`}>
      {/* ヘッダー */}
      <div className={`flex items-center justify-between pb-5 border-b ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
        <div className="flex items-center gap-3">
          <div className={`p-2.5 rounded-xl border ${isDark ? 'bg-blue-950/60 border-blue-800 text-blue-400' : 'bg-blue-50 border-blue-200 text-blue-600'}`}>
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold tracking-tight">チーム負荷・パフォーマンス分析</h2>
            <p className={`text-xs ${textMutedClass}`}>メンバーごとの稼働率・アサイン状況・ボトルネックの可視化</p>
          </div>
        </div>

        {selectedMemberId && (
          <button
            onClick={() => setSelectedMemberId(null)}
            className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-xl border transition-all cursor-pointer shadow-sm ${
              isDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700' : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'
            }`}
          >
            <ArrowLeft className="w-4 h-4" />
            全員一覧に戻る
          </button>
        )}
      </div>

      {/* コンテンツ */}
      {!selectedMemberId ? (
        <div className="pt-6 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className={`text-xs font-bold uppercase tracking-wider flex items-center gap-2 ${textMutedClass}`}>
              <BarChart3 className="w-4 h-4 text-blue-500" />
              メンバー稼働サマリー
            </h3>
            <span className={`text-xs font-medium ${textMutedClass}`}>対象: {members.length} 名</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {members.map((member) => {
              const metrics = calculateMemberMetrics(member.id);
              // 削除済みタスクを除外
              const memberTasks = tasks.filter((t) => t.memberId === member.id && !t.isDeleted);

              return (
                <div
                  key={member.id}
                  onClick={() => setSelectedMemberId(member.id)}
                  className={`group border rounded-2xl p-5 cursor-pointer transition-all duration-200 shadow-sm flex flex-col justify-between space-y-4 ${cardBgClass} ${
                    isDark ? 'hover:border-blue-500 hover:bg-slate-800/80' : 'hover:border-blue-400 hover:bg-slate-50/80'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold border transition-colors ${
                      isDark ? 'bg-slate-700 border-slate-600 text-slate-200 group-hover:bg-blue-900 group-hover:text-blue-300' : 'bg-slate-100 border-slate-200 text-slate-600 group-hover:bg-blue-50 group-hover:text-blue-600'
                    }`}>
                      <User className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm group-hover:text-blue-500 transition-colors">
                        {member.name}
                      </h4>
                      <p className={`text-[11px] ${textMutedClass}`}>{member.roleTitle || member.role}</p>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center text-xs">
                      <span className={textMutedClass}>想定稼働率</span>
                      <span className={`font-mono font-bold ${
                        metrics.color === 'rose' ? 'text-rose-500' : metrics.color === 'amber' ? 'text-amber-500' : 'text-emerald-500'
                      }`}>
                        {metrics.score}%
                      </span>
                    </div>

                    <div className={`w-full h-2 rounded-full overflow-hidden p-0.5 border ${isDark ? 'bg-slate-900 border-slate-700' : 'bg-slate-100 border-slate-200'}`}>
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          metrics.color === 'rose' ? 'bg-rose-500' :
                          metrics.color === 'amber' ? 'bg-amber-500' : 'bg-emerald-500'
                        }`}
                        style={{ width: `${metrics.score}%` }}
                      />
                    </div>
                  </div>

                  <div className={`pt-2 border-t flex items-center justify-between text-xs ${isDark ? 'border-slate-700 text-slate-400' : 'border-slate-100 text-slate-500'}`}>
                    <span>担当: <b>{memberTasks.length}</b> 件 ({metrics.totalDays}日分)</span>
                    <span className="text-blue-500 font-bold group-hover:translate-x-0.5 transition-transform">詳細 →</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="pt-6 space-y-6 flex-1 flex flex-col">
          <div className={`flex items-center justify-between p-3.5 rounded-2xl border shadow-sm ${cardBgClass}`}>
            <div className="flex items-center gap-2">
              <button
                onClick={handlePrevMember}
                className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                  isDark ? 'bg-slate-700 border-slate-600 text-slate-200 hover:bg-slate-600' : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <select
                value={selectedMemberId}
                onChange={(e) => setSelectedMemberId(e.target.value)}
                className={`font-bold text-sm px-3 py-1.5 rounded-lg border focus:outline-none focus:border-blue-500 cursor-pointer ${
                  isDark ? 'bg-slate-900 border-slate-700 text-slate-100' : 'bg-slate-50 border-slate-200 text-slate-800'
                }`}
              >
                {members.map((m) => (
                  <option key={m.id} value={m.id}>{m.name} ({m.roleTitle || m.role})</option>
                ))}
              </select>
              <button
                onClick={handleNextMember}
                className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                  isDark ? 'bg-slate-700 border-slate-600 text-slate-200 hover:bg-slate-600' : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
            <span className={`text-xs font-mono ${textMutedClass}`}>ID: {selectedMember?.id}</span>
          </div>

          {selectedMember && (() => {
            const metrics = calculateMemberMetrics(selectedMember.id);
            // 削除済みタスクを除外
            const memberTasks = tasks.filter((t) => t.memberId === selectedMember.id && !t.isDeleted);

            return (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1">
                <div className={`border rounded-2xl p-6 space-y-6 flex flex-col justify-between shadow-sm ${cardBgClass}`}>
                  <div>
                    <div className={`flex items-center gap-4 border-b pb-5 ${isDark ? 'border-slate-700' : 'border-slate-100'}`}>
                      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-black text-xl border ${
                        isDark ? 'bg-blue-950/80 border-blue-700 text-blue-400' : 'bg-blue-50 border-blue-200 text-blue-600'
                      }`}>
                        {selectedMember.name[0]}
                      </div>
                      <div>
                        <h3 className="text-base font-bold">{selectedMember.name}</h3>
                        <p className={`text-xs ${textMutedClass}`}>{selectedMember.roleTitle || selectedMember.role}</p>
                      </div>
                    </div>

                    <div className="pt-5 space-y-4">
                      <h4 className={`text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 ${textMutedClass}`}>
                        <Flame className="w-4 h-4 text-amber-500" />
                        稼働指標アナライザー
                      </h4>

                      <div className={`p-4 rounded-xl border text-center space-y-2 ${subBgClass}`}>
                        <div className="text-3xl font-black font-mono">
                          {metrics.score}<span className={`text-sm font-normal ${textMutedClass}`}>%</span>
                        </div>
                        <div className={`inline-block text-xs font-bold px-2.5 py-0.5 rounded-full border ${
                          metrics.color === 'rose' ? 'bg-rose-500/10 border-rose-500/30 text-rose-400' :
                          metrics.color === 'amber' ? 'bg-amber-500/10 border-amber-500/30 text-amber-400' :
                          'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                        }`}>
                          {metrics.label}
                        </div>
                        <p className={`text-[11px] pt-1 ${textMutedClass}`}>
                          合計想定日数: <b>{metrics.totalDays} 日分</b>
                        </p>
                      </div>
                    </div>

                    <div className="pt-4 space-y-2">
                      <h5 className={`text-xs font-bold ${textMutedClass}`}>分析ポイント</h5>
                      <div className="space-y-2 text-xs">
                        <div className={`p-2.5 rounded-lg border flex items-center gap-2 ${subBgClass}`}>
                          <Layers className="w-4 h-4 text-blue-500 shrink-0" />
                          <span>依存タスク受領: <b>{metrics.dependencyCount} 件</b></span>
                        </div>
                        {metrics.score > 70 && (
                          <div className="p-2.5 bg-rose-500/10 rounded-lg border border-rose-500/30 flex items-center gap-2 text-rose-400">
                            <AlertCircle className="w-4 h-4 shrink-0" />
                            <span>期間重複によるキャパシティオーバーの可能性あり</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className={`text-[11px] text-center border-t pt-3 ${isDark ? 'border-slate-700 text-slate-500' : 'border-slate-100 text-slate-400'}`}>
                    ステータス: リアルタイム同期中
                  </div>
                </div>

                <div className="lg:col-span-2 space-y-6 flex flex-col">
                  <div className={`border rounded-2xl p-6 flex-1 shadow-sm space-y-4 ${cardBgClass}`}>
                    <h4 className="text-sm font-bold flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <PieChart className="w-4 h-4 text-blue-500" />
                        アサイン中のタスク一覧 ({memberTasks.length}件)
                      </span>
                    </h4>

                    {memberTasks.length === 0 ? (
                      <div className={`p-10 text-center border-2 border-dashed rounded-xl text-xs ${isDark ? 'border-slate-700 text-slate-500' : 'border-slate-200 text-slate-400'}`}>
                        現在このメンバーに割り当てられているタスクはありません。（負荷 0%）
                      </div>
                    ) : (
                      <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
                        {memberTasks.map((t) => (
                          <div
                            key={t.id}
                            className={`p-3.5 border rounded-xl flex items-center justify-between transition-colors ${subBgClass}`}
                          >
                            <div className="space-y-0.5">
                              <div className="flex items-center gap-2">
                                <span
                                  className="w-2.5 h-2.5 rounded-full shrink-0"
                                  style={{ backgroundColor: t.color || '#3b82f6' }}
                                />
                                <h5 className="font-bold text-sm">{t.title}</h5>
                              </div>
                              {t.memo && <p className={`text-xs pl-4 ${textMutedClass}`}>{t.memo}</p>}
                            </div>
                            <div className={`text-right text-xs font-mono shrink-0 pl-4 ${textMutedClass}`}>
                              <div>{t.startDate} 〜</div>
                              <div>{t.endDate}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className={`p-4 border rounded-xl flex items-center gap-3 text-xs ${
                    isDark ? 'bg-blue-950/40 border-blue-800/80 text-blue-300' : 'bg-blue-50/60 border-blue-200/80 text-blue-800'
                  }`}>
                    <CheckCircle2 className="w-5 h-5 text-blue-500 shrink-0" />
                    <span>管理者設定にて「分析手法（工数重み付け/期間検知/タグ比率）」のオン/オフモジュール追加が可能です。</span>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}