import React, { useState } from 'react';
import { X, Shield, User, Tag as TagIcon, Palette, Sliders, Sun, Moon, CalendarDays, ArrowLeftRight } from 'lucide-react';
import type { UserProfile } from '../types';

export type TagItem = {
  id: string;
  name: string;
  color: string;
  isDeleted?: boolean;
  updatedAt?: string;
};

export type LineStyle = 'solid' | 'dashed' | 'dotted';

type SettingsViewProps = {
  onClose: () => void;
  currentUser: UserProfile;
  tags: TagItem[];
  setTags: React.Dispatch<React.SetStateAction<TagItem[]>>;
  defaultTaskColor: string;
  setDefaultTaskColor: React.Dispatch<React.SetStateAction<string>>;
  colorPriority: 'tag' | 'task';
  setColorPriority: React.Dispatch<React.SetStateAction<'tag' | 'task'>>;
  dependencyMarginType: 'strict' | 'same_day' | 'fully_allowed' | 'custom';
  setDependencyMarginType: React.Dispatch<React.SetStateAction<'strict' | 'same_day' | 'fully_allowed' | 'custom'>>;
  dependencyCustomDays: number;
  setDependencyCustomDays: React.Dispatch<React.SetStateAction<number>>;
  overlapCondition: 'all' | 'tag_match';
  setOverlapCondition: React.Dispatch<React.SetStateAction<'all' | 'tag_match'>>;
  
  eventColor: string;
  setEventColor: React.Dispatch<React.SetStateAction<string>>;
  goalColor: string;
  setGoalColor: React.Dispatch<React.SetStateAction<string>>;
  memoColor: string;
  setMemoColor: React.Dispatch<React.SetStateAction<string>>;

  showOverlapBorder: boolean;
  setShowOverlapBorder: React.Dispatch<React.SetStateAction<boolean>>;
  theme: 'light' | 'dark';
  setTheme: React.Dispatch<React.SetStateAction<'light' | 'dark'>>;
  scrollYears: number;
  setScrollYears: React.Dispatch<React.SetStateAction<number>>;
  todayOffsetDays: number;
  setTodayOffsetDays: React.Dispatch<React.SetStateAction<number>>;
};

export default function SettingsView({
  onClose,
  currentUser,
  tags,
  setTags,
  defaultTaskColor,
  setDefaultTaskColor,
  colorPriority,
  setColorPriority,
  dependencyMarginType,
  setDependencyMarginType,
  dependencyCustomDays,
  setDependencyCustomDays,
  overlapCondition,
  setOverlapCondition,
  eventColor,
  setEventColor,
  goalColor,
  setGoalColor,
  memoColor,
  setMemoColor,
  showOverlapBorder,
  setShowOverlapBorder,
  theme,
  setTheme,
  scrollYears,
  setScrollYears,
  todayOffsetDays,
  setTodayOffsetDays,
}: SettingsViewProps) {
  const isDark = theme === 'dark';
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState('#3b82f6');

  const isAdmin = currentUser.role === 'owner' || currentUser.role === 'admin';

  const handleAddTag = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTagName.trim()) return;
    const nowIso = new Date().toISOString();
    setTags([...tags, { 
      id: `tag-${Date.now()}`, 
      name: newTagName.trim(), 
      color: newTagColor,
      isDeleted: false,
      updatedAt: nowIso
    }]);
    setNewTagName('');
  };

  const handleDeleteTag = (id: string) => {
    setTags(tags.filter((t) => t.id !== id));
  };

  return (
    <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div className={`w-full max-w-2xl max-h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150 border transition-colors ${
        isDark ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-800'
      }`}>
        
        {/* ヘッダー */}
        <div className={`px-6 py-4 border-b flex items-center justify-between transition-colors ${
          isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-slate-50 border-slate-100'
        }`}>
          <div className="flex items-center gap-3">
            <Sliders className="w-5 h-5 text-blue-500" />
            <h2 className={`font-black text-lg ${isDark ? 'text-white' : 'text-slate-800'}`}>アプリケーション設定</h2>
          </div>

          <div className="flex items-center gap-4">
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold ${
              isAdmin 
                ? 'bg-purple-500/10 border-purple-500/20 text-purple-400' 
                : 'bg-blue-500/10 border-blue-500/20 text-blue-400'
            }`}>
              {isAdmin ? <Shield className="w-3.5 h-3.5" /> : <User className="w-3.5 h-3.5" />}
              <span>{isAdmin ? '管理者モード' : '閲覧モード (一般)'}</span>
            </div>

            <button 
              onClick={onClose}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                isDark ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-200'
              }`}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* スクロール可能な設定本文 */}
        <div className="p-6 overflow-y-auto space-y-8 flex-1">
          
          {/* ════ 1. 全体設定（管理者限定） ════ */}
          <div className="space-y-4">
            <div className={`flex items-center justify-between border-b pb-2 ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-blue-500" />
                <h3 className={`font-extrabold text-sm ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>全体設定（プロジェクト運用ルール / 管理者のみ）</h3>
              </div>
              {!isAdmin && (
                <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md border ${
                  isDark ? 'text-amber-400 bg-amber-950/40 border-amber-800/60' : 'text-amber-600 bg-amber-50 border-amber-200'
                }`}>
                  ⚠️ 閲覧モード
                </span>
              )}
            </div>

            <fieldset disabled={!isAdmin} className={`space-y-6 ${!isAdmin ? 'opacity-60 cursor-not-allowed' : ''}`}>
              
              {/* ① 依存関係（矢印）の矛盾判定ルール */}
              <div className={`p-4 rounded-xl border space-y-3 ${
                isDark ? 'bg-slate-800/40 border-slate-800' : 'bg-slate-50 border-slate-100'
              }`}>
                <div>
                  <h4 className={`font-bold text-sm ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>依存関係（矢印）の矛盾判定ルール</h4>
                  <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-400'}`}>親タスク終了日と子タスク開始日の関係性をどこまで許容するか</p>
                </div>

                <div className={`space-y-2 text-xs font-semibold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="dependencyMargin"
                      checked={dependencyMarginType === 'strict'}
                      onChange={() => setDependencyMarginType('strict')}
                      className="text-blue-600 focus:ring-blue-500"
                    />
                    <span><b>厳密</b>：親の終了日の翌日以降でなければエラー（同日もNG）</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="dependencyMargin"
                      checked={dependencyMarginType === 'same_day'}
                      onChange={() => setDependencyMarginType('same_day')}
                      className="text-blue-600 focus:ring-blue-500"
                    />
                    <span><b>当日OK</b>：親の終了日と子タスクの開始日が同じ日ならセーフ</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="dependencyMargin"
                      checked={dependencyMarginType === 'fully_allowed'}
                      onChange={() => setDependencyMarginType('fully_allowed')}
                      className="text-blue-600 focus:ring-blue-500"
                    />
                    <span><b>完全許容</b>：何日重複していても矛盾エラーは出さない</span>
                  </label>

                  <div className="flex items-center gap-2 pt-1">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="dependencyMargin"
                        checked={dependencyMarginType === 'custom'}
                        onChange={() => setDependencyMarginType('custom')}
                        className="text-blue-600 focus:ring-blue-500"
                      />
                      <span><b>自由指定</b>：最大</span>
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="30"
                      value={dependencyCustomDays}
                      disabled={dependencyMarginType !== 'custom'}
                      onChange={(e) => setDependencyCustomDays(Math.max(1, parseInt(e.target.value) || 1))}
                      className={`w-14 px-2 py-1 border rounded-lg text-center font-bold text-xs ${
                        isDark 
                          ? 'bg-slate-800 border-slate-700 text-slate-100 disabled:bg-slate-900 disabled:text-slate-600' 
                          : 'bg-white border-slate-300 text-slate-800 disabled:bg-slate-100 disabled:text-slate-400'
                      }`}
                    />
                    <span className={isDark ? 'text-slate-400' : 'text-slate-600'}>日までのオーバーラップを許容する</span>
                  </div>
                </div>
              </div>

              {/* ② タスク重複の判定条件 */}
              <div className={`flex items-center justify-between p-4 rounded-xl border ${
                isDark ? 'bg-slate-800/40 border-slate-800' : 'bg-slate-50 border-slate-100'
              }`}>
                <div>
                  <h4 className={`font-bold text-sm ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>タスク重複の判定条件</h4>
                  <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-400'}`}>同一メンバーのタスク期間が被った際、どこで警告を出すか</p>
                </div>
                <select
                  value={overlapCondition}
                  onChange={(e) => setOverlapCondition(e.target.value as 'all' | 'tag_match')}
                  className={`px-3 py-1.5 border rounded-lg font-bold cursor-pointer text-xs ${
                    isDark ? 'bg-slate-800 border-slate-700 text-slate-200' : 'bg-white border-slate-300 text-slate-800'
                  }`}
                >
                  <option value="all">すべての重複期間を警告する</option>
                  <option value="tag_match">同じタグ（カテゴリ）の場合のみ警告</option>
                </select>
              </div>

              {/* カラー設定・優先度 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className={`p-4 rounded-xl border space-y-2 ${
                  isDark ? 'bg-slate-800/40 border-slate-800' : 'bg-slate-50 border-slate-100'
                }`}>
                  <h4 className={`font-bold text-sm flex items-center gap-1.5 ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>
                    <Palette className="w-4 h-4 text-blue-500" />
                    デフォルトカラー & 優先度
                  </h4>
                  <div className="space-y-3 pt-1">
                    <div>
                      <label className={`block text-xs font-semibold mb-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>デフォルトタスクカラー</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={defaultTaskColor}
                          onChange={(e) => setDefaultTaskColor(e.target.value)}
                          className={`w-8 h-8 rounded-lg border cursor-pointer p-0.5 ${
                            isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-300'
                          }`}
                        />
                        <span className={`text-xs font-mono ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>{defaultTaskColor}</span>
                      </div>
                    </div>
                    <div>
                      <label className={`block text-xs font-semibold mb-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>カラー適用優先度</label>
                      <select
                        value={colorPriority}
                        onChange={(e) => setColorPriority(e.target.value as 'tag' | 'task')}
                        className={`w-full px-3 py-1.5 border rounded-lg text-xs font-bold cursor-pointer ${
                          isDark ? 'bg-slate-800 border-slate-700 text-slate-200' : 'bg-white border-slate-300 text-slate-800'
                        }`}
                      >
                        <option value="tag">タグ（カテゴリ）の色を優先</option>
                        <option value="task">タスク個別の色を優先</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* タグ管理 */}
                <div className={`p-4 rounded-xl border space-y-3 ${
                  isDark ? 'bg-slate-800/40 border-slate-800' : 'bg-slate-50 border-slate-100'
                }`}>
                  <h4 className={`font-bold text-sm flex items-center gap-1.5 ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>
                    <TagIcon className="w-4 h-4 text-blue-500" />
                    タグ管理
                  </h4>
                  <form onSubmit={handleAddTag} className="flex gap-2">
                    <input
                      type="text"
                      placeholder="新規タグ名"
                      value={newTagName}
                      onChange={(e) => setNewTagName(e.target.value)}
                      className={`flex-1 px-2.5 py-1.5 border rounded-lg text-xs font-medium ${
                        isDark ? 'bg-slate-800 border-slate-700 text-slate-100 placeholder-slate-500' : 'bg-white border-slate-300 text-slate-800'
                      }`}
                    />
                    <input
                      type="color"
                      value={newTagColor}
                      onChange={(e) => setNewTagColor(e.target.value)}
                      className={`w-8 h-8 rounded-lg border cursor-pointer p-0.5 shrink-0 ${
                        isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-300'
                      }`}
                    />
                    <button
                      type="submit"
                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg cursor-pointer transition-colors"
                    >
                      追加
                    </button>
                  </form>
                  <div className="max-h-28 overflow-y-auto space-y-1.5 pr-1">
                    {tags.map((tag) => (
                      <div key={tag.id} className={`flex items-center justify-between px-2.5 py-1 border rounded-lg text-xs ${
                        isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
                      }`}>
                        <div className="flex items-center gap-2">
                          <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: tag.color }} />
                          <span className={`font-bold ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>{tag.name}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDeleteTag(tag.id)}
                          className="text-slate-400 hover:text-rose-500 font-bold text-xs cursor-pointer"
                        >
                          削除
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* ▼ カレンダー項目（予定・目標・メモ）カラー設定 */}
              <div className={`p-4 rounded-xl border space-y-3 ${
                isDark ? 'bg-slate-800/40 border-slate-800' : 'bg-slate-50 border-slate-100'
              }`}>
                <h4 className={`font-bold text-sm flex items-center gap-1.5 ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>
                  <Palette className="w-4 h-4 text-blue-500" />
                  カレンダー項目カラー設定（予定・目標・メモ）
                </h4>
                <div className="grid grid-cols-3 gap-3 pt-1">
                  <div>
                    <label className={`block text-xs font-semibold mb-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>予定カラー</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={eventColor}
                        onChange={(e) => setEventColor(e.target.value)}
                        className={`w-8 h-8 rounded-lg border cursor-pointer p-0.5 ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-300'}`}
                      />
                      <span className={`text-xs font-mono ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>{eventColor}</span>
                    </div>
                  </div>
                  <div>
                    <label className={`block text-xs font-semibold mb-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>目標カラー</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={goalColor}
                        onChange={(e) => setGoalColor(e.target.value)}
                        className={`w-8 h-8 rounded-lg border cursor-pointer p-0.5 ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-300'}`}
                      />
                      <span className={`text-xs font-mono ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>{goalColor}</span>
                    </div>
                  </div>
                  <div>
                    <label className={`block text-xs font-semibold mb-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>メモカラー</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={memoColor}
                        onChange={(e) => setMemoColor(e.target.value)}
                        className={`w-8 h-8 rounded-lg border cursor-pointer p-0.5 ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-300'}`}
                      />
                      <span className={`text-xs font-mono ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>{memoColor}</span>
                    </div>
                  </div>
                </div>
              </div>

            </fieldset>
          </div>

          <hr className={isDark ? 'border-slate-800' : 'border-slate-100'} />

          {/* ════ 2. 個人設定（全メンバー変更可能） ════ */}
          <div className="space-y-4">
            <div className={`flex items-center gap-2 border-b pb-2 ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
              <User className="w-4 h-4 text-emerald-500" />
              <h3 className={`font-extrabold text-sm ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>個人設定（ユーザーごとの表示設定・常時変更可能）</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* 表示期間（年数） */}
              <div className={`p-4 rounded-xl border flex flex-col justify-between gap-3 ${
                isDark ? 'bg-slate-800/40 border-slate-800' : 'bg-slate-50 border-slate-100'
              }`}>
                <div>
                  <h4 className={`font-bold text-sm flex items-center gap-1.5 ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>
                    <CalendarDays className="w-4 h-4 text-emerald-600" />
                    カレンダー描画期間
                  </h4>
                  <p className={`text-xs mt-1 ${isDark ? 'text-slate-400' : 'text-slate-400'}`}>タイムラインに何年分のカレンダーを生成するか指定します</p>
                </div>
                <select
                  value={scrollYears}
                  onChange={(e) => setScrollYears(Number(e.target.value))}
                  className={`w-full px-3 py-2 border rounded-lg font-bold cursor-pointer text-sm ${
                    isDark ? 'bg-slate-800 border-slate-700 text-slate-200' : 'bg-white border-slate-300 text-slate-800'
                  }`}
                >
                  <option value={1}>1年分</option>
                  <option value={2}>2年分</option>
                  <option value={3}>3年分</option>
                  <option value={5}>5年分</option>
                </select>
              </div>

              {/* 「今日」の位置設定 */}
              <div className={`p-4 rounded-xl border flex flex-col justify-between gap-3 ${
                isDark ? 'bg-slate-800/40 border-slate-800' : 'bg-slate-50 border-slate-100'
              }`}>
                <div>
                  <h4 className={`font-bold text-sm flex items-center gap-1.5 ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>
                    <ArrowLeftRight className="w-4 h-4 text-emerald-600" />
                    「今日」の表示位置（余白）
                  </h4>
                  <p className={`text-xs mt-1 ${isDark ? 'text-slate-400' : 'text-slate-400'}`}>「今日へ」ボタンを押した際、左端から何日分の余白を空けて表示するか</p>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={todayOffsetDays}
                    onChange={(e) => setTodayOffsetDays(Math.max(0, parseInt(e.target.value) || 0))}
                    className={`w-20 px-3 py-2 border rounded-lg text-center font-bold text-sm ${
                      isDark ? 'bg-slate-800 border-slate-700 text-slate-200' : 'bg-white border-slate-300 text-slate-800'
                    }`}
                  />
                  <span className={`text-sm font-bold ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>日目</span>
                </div>
              </div>
            </div>

            {/* テーマ切替 */}
            <div className={`p-4 rounded-xl border flex items-center justify-between ${
              isDark ? 'bg-slate-800/40 border-slate-800' : 'bg-slate-50 border-slate-100'
            }`}>
              <div>
                <h4 className={`font-bold text-sm ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>表示テーマ</h4>
                <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-400'}`}>アプリ全体の見た目（ライト / ダーク）を切り替えます</p>
              </div>
              <div className={`flex p-1 rounded-xl gap-1 ${isDark ? 'bg-slate-800' : 'bg-slate-200/80'}`}>
                <button
                  type="button"
                  onClick={() => setTheme('light')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                    theme === 'light' 
                      ? 'bg-white text-blue-600 shadow-xs' 
                      : isDark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-600 hover:text-slate-800'
                  }`}
                >
                  <Sun className="w-3.5 h-3.5" />
                  ライト
                </button>
                <button
                  type="button"
                  onClick={() => setTheme('dark')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                    theme === 'dark' 
                      ? 'bg-slate-900 text-amber-400 shadow-xs' 
                      : isDark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-600 hover:text-slate-800'
                  }`}
                >
                  <Moon className="w-3.5 h-3.5" />
                  ダーク
                </button>
              </div>
            </div>

            {/* 重複枠線ON/OFF */}
            <div className={`p-4 rounded-xl border flex items-center justify-between ${
              isDark ? 'bg-slate-800/40 border-slate-800' : 'bg-slate-50 border-slate-100'
            }`}>
              <div>
                <h4 className={`font-bold text-sm ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>重複タスクの枠線強調表示</h4>
                <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-400'}`}>タイムライン上で期間が被っているタスクに警告枠線を表示する</p>
              </div>
              <button
                type="button"
                onClick={() => setShowOverlapBorder(!showOverlapBorder)}
                className={`px-4 py-2 text-xs font-bold rounded-xl transition-colors cursor-pointer border ${
                  showOverlapBorder
                    ? 'bg-emerald-600 border-emerald-600 text-white shadow-xs'
                    : isDark
                      ? 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                      : 'bg-white border-slate-300 text-slate-600 hover:bg-slate-100'
                }`}
              >
                {showOverlapBorder ? '有効 (ON)' : '無効 (OFF)'}
              </button>
            </div>
          </div>

        </div>

        {/* フッター */}
        <div className={`px-6 py-4 border-t flex justify-end transition-colors ${
          isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-slate-50 border-slate-100'
        }`}>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl transition-colors shadow-xs cursor-pointer"
          >
            閉じる
          </button>
        </div>

      </div>
    </div>
  );
}