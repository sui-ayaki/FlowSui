import React, { useEffect, useState } from 'react';
import { Target, Calendar as CalendarIcon, Flag } from 'lucide-react';
import YearView, { type YearItem } from './YearView';
import LongGoalView, { type LongGoalItem, type Member } from './LongGoalView';

type GoalViewProps = {
  theme?: 'light' | 'dark';
  tasks: any[];
  eventColor: string;
  goalColor: string;
  memoColor: string;
  yearItems: YearItem[];
  setYearItems: React.Dispatch<React.SetStateAction<YearItem[]>>;
  longItems: LongGoalItem[];
  setLongItems: React.Dispatch<React.SetStateAction<LongGoalItem[]>>;
  members: Member[];
  manualSync?: () => void; // ★ 追加：リモートから最新を引っ張るための関数（任意）
};

export default function GoalView({
  theme = 'light',
  tasks,
  eventColor,
  goalColor,
  memoColor,
  yearItems,
  setYearItems,
  longItems,
  setLongItems,
  members,
  manualSync, // ★ propsで受け取る
}: GoalViewProps) {
  const isDark = theme === 'dark';
  const [activeSubTab, setActiveSubTab] = useState<'MONTH' | 'LONG'>('MONTH');

  // ★ 追加：GoalViewが開かれた時、および内部のサブタブ（MONTH/LONG）が切り替った時に自動で最新を取得
  useEffect(() => {
    if (manualSync) {
      manualSync();
    }
  }, [activeSubTab, manualSync]);

  return (
    <div className={`flex flex-col h-full rounded-2xl border overflow-hidden ${
      isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
    }`}>
      {/* タブ切り替えヘッダー */}
      <div className={`px-6 py-4 border-b flex items-center justify-between shrink-0 ${
        isDark ? 'bg-slate-950/50 border-slate-800' : 'bg-slate-50 border-slate-100'
      }`}>
        <div className="flex items-center gap-2">
          <div className="p-2 bg-amber-500/10 text-amber-500 rounded-xl">
            <Target className="w-5 h-5" />
          </div>
          <div>
            <h2 className={`font-black text-lg ${isDark ? 'text-white' : 'text-slate-800'}`}>
              目標管理 (Goals)
            </h2>
            <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              月別目標および中長期のロードマップを管理します
            </p>
          </div>
        </div>

        {/* サブタブ切替ボタン */}
        <div className={`flex items-center p-1 rounded-xl border ${
          isDark ? 'bg-slate-900 border-slate-800' : 'bg-slate-100 border-slate-200'
        }`}>
          <button
            type="button"
            onClick={() => setActiveSubTab('MONTH')}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeSubTab === 'MONTH'
                ? 'bg-amber-600 text-white shadow-xs'
                : (isDark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-600 hover:text-slate-900')
            }`}
          >
            <CalendarIcon className="w-3.5 h-3.5" /> Month Goals
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab('LONG')}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeSubTab === 'LONG'
                ? 'bg-amber-600 text-white shadow-xs'
                : (isDark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-600 hover:text-slate-900')
            }`}
          >
            <Flag className="w-3.5 h-3.5" /> Long Goals
          </button>
        </div>
      </div>

      {/* コンテンツ表示エリア */}
      <div className="flex-1 overflow-hidden">
        {activeSubTab === 'MONTH' ? (
          <YearView
            theme={theme}
            tasks={tasks}
            eventColor={eventColor}
            goalColor={goalColor}
            memoColor={memoColor}
            yearItems={yearItems}
            setYearItems={setYearItems}
            members={members}
          />
        ) : (
          <LongGoalView
            theme={theme}
            longItems={longItems}
            setLongItems={setLongItems}
            goalColor={goalColor}
            members={members} 
          />
        )}
      </div>
    </div>
  );
}