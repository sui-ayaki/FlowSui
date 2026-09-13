// src/components/LongGoalView.tsx
import React, { useState, useRef } from 'react';
import { Target, Plus, Trash2, Edit2, Check, X, Calendar as CalendarIcon, RotateCcw, ListFilter, Users, GripVertical } from 'lucide-react';

export type Member = {
  id: string;
  name: string;
  role?: string;
  avatarColor?: string;
};

export type LongGoalItem = {
  id: string;
  year: number; // 対象の年
  title: string;
  description?: string;
  color?: string;
  memberIds?: string[]; // 担当メンバーのID配列
  updatedAt?: string;   // 同期用タイムスタンプ
  isDeleted?: boolean;  // 論理削除フラグ
};

type LongGoalViewProps = {
  theme?: 'light' | 'dark';
  longItems: LongGoalItem[];
  setLongItems: React.Dispatch<React.SetStateAction<LongGoalItem[]>>;
  goalColor: string;
  members: Member[];
};

export default function LongGoalView({
  theme = 'light',
  longItems = [],
  setLongItems,
  goalColor = '#f59e0b',
  members = [],
}: LongGoalViewProps) {
  const isDark = theme === 'dark';
  const currentYear = new Date().getFullYear();

  // フィルタリング用
  const [filterMemberId, setFilterMemberId] = useState<string>('all');

  // 入力フォームの状態
  const [targetYear, setTargetYear] = useState<number>(currentYear);
  const [titleInput, setTitleInput] = useState<string>('');
  const [descInput, setDescInput] = useState<string>('');
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);

  // 編集中のアイテムIDと一時状態
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editYearInput, setEditYearInput] = useState<number>(currentYear);
  const [editTitleInput, setEditTitleInput] = useState<string>('');
  const [editDescInput, setEditDescInput] = useState<string>('');
  const [editMemberIds, setEditMemberIds] = useState<string[]>([]);

  // ドラッグ＆ドロップ用の状態
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverYear, setDragOverYear] = useState<number | null>(null);

  // 変換中のエンター誤爆防止用
  const [isComposing, setIsComposing] = useState<boolean>(false);
  const titleInputRef = useRef<HTMLInputElement>(null);

  // 表示する年のリスト（削除済みを除く）
  const activeItems = (longItems || []).filter(i => !i.isDeleted);
  const maxItemYear = activeItems.length > 0 
    ? Math.max(...activeItems.map(i => i.year)) 
    : currentYear;
  
  const displayEndYear = Math.max(currentYear + 4, maxItemYear + 1);
  const displayStartYear = Math.min(currentYear - 1, ...(activeItems.map(i => i.year)));

  const allYears = Array.from(
    new Set([
      ...activeItems.map(i => i.year),
      ...Array.from({ length: (displayEndYear - displayStartYear) + 1 }, (_, index) => displayStartYear + index)
    ])
  ).sort((a, b) => a - b);

  // 担当メンバーのトグル補助（新規作成用）
  const toggleMemberSelection = (memberId: string) => {
    if (selectedMemberIds.includes(memberId)) {
      setSelectedMemberIds(selectedMemberIds.filter(id => id !== memberId));
    } else {
      setSelectedMemberIds([...selectedMemberIds, memberId]);
    }
  };

  // 担当メンバーのトグル補助（編集用）
  const toggleEditMemberSelection = (memberId: string) => {
    if (editMemberIds.includes(memberId)) {
      setEditMemberIds(editMemberIds.filter(id => id !== memberId));
    } else {
      setEditMemberIds([...editMemberIds, memberId]);
    }
  };

  // ★ フィルタリングされたアイテム（!item.isDeleted を必ず除外対象に含める）
  const filteredItems = activeItems.filter(item => {
    if (filterMemberId === 'all') return true;
    const itemMembers = item.memberIds || [];
    if (filterMemberId === 'unassigned') return itemMembers.length === 0;
    return itemMembers.includes(filterMemberId);
  });

  const sortedLongItems = [...filteredItems].sort((a, b) => {
    if (a.year !== b.year) return a.year - b.year;
    return a.id.localeCompare(b.id);
  });

  // 項目の追加
  const handleAddItem = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!titleInput.trim()) return;

    const now = new Date().toISOString();
    const newItem: LongGoalItem = {
      id: `long-item-${Date.now()}-${Math.random()}`,
      year: targetYear,
      title: titleInput.trim(),
      description: descInput.trim() || undefined,
      color: goalColor,
      memberIds: selectedMemberIds,
      updatedAt: now,
      isDeleted: false,
    };

    setLongItems([...(longItems || []), newItem]);
    setTitleInput('');
    setDescInput('');
    setSelectedMemberIds([]);

    if (titleInputRef.current) {
      titleInputRef.current.focus();
    }
  };

  const handleAddKeyDown = (e: React.KeyboardEvent) => {
    if (isComposing) return;
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddItem();
    }
  };

  // ★ 削除（論理削除＝墓石化へ変更）
  const handleDeleteItem = (id: string) => {
    const now = new Date().toISOString();
    setLongItems((longItems || []).map(item => {
      if (item.id === id) {
        return {
          ...item,
          isDeleted: true,
          updatedAt: now,
        };
      }
      return item;
    }));
    if (editingId === id) setEditingId(null);
  };

  // 編集開始
  const handleStartEdit = (item: LongGoalItem) => {
    setEditingId(item.id);
    setEditYearInput(item.year);
    setEditTitleInput(item.title);
    setEditDescInput(item.description || '');
    setEditMemberIds(item.memberIds || []);
  };

  // 編集保存
  const handleSaveEdit = (id: string) => {
    if (!editTitleInput.trim()) return;
    const now = new Date().toISOString();
    setLongItems((longItems || []).map(item => {
      if (item.id === id) {
        return {
          ...item,
          year: editYearInput,
          title: editTitleInput.trim(),
          description: editDescInput.trim() || undefined,
          memberIds: editMemberIds,
          updatedAt: now,
        };
      }
      return item;
    }));
    setEditingId(null);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
  };

  // ドラッグ＆ドロップのハンドラー
  const handleDragStart = (e: React.DragEvent, item: LongGoalItem) => {
    setDraggingId(item.id);
    e.dataTransfer.setData('text/plain', item.id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, year: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverYear !== year) {
      setDragOverYear(year);
    }
  };

  const handleDragLeave = (e: React.DragEvent, year: number) => {
    e.preventDefault();
    if (dragOverYear === year) {
      setDragOverYear(null);
    }
  };

  const handleDrop = (e: React.DragEvent, targetYearNum: number) => {
    e.preventDefault();
    setDragOverYear(null);
    const itemId = e.dataTransfer.getData('text/plain') || draggingId;
    if (!itemId) return;

    const now = new Date().toISOString();
    setLongItems((longItems || []).map(item => {
      if (item.id === itemId) {
        return { 
          ...item, 
          year: targetYearNum,
          updatedAt: now,
        };
      }
      return item;
    }));
    setDraggingId(null);
  };

  // メンバー名を取得するヘルパー
  const getMemberNames = (memberIds?: string[]) => {
    if (!memberIds || memberIds.length === 0) return '全体（全員）';
    return memberIds
      .map(id => members.find(m => m.id === id)?.name)
      .filter(Boolean)
      .join(', ');
  };

  return (
    <div className={`flex flex-col h-full p-6 select-none transition-colors overflow-y-auto space-y-6 ${
      isDark ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-800'
    }`}>
      
      {/* ヘッダー ＆ 担当者フィルター・今年へ戻るボタン */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-amber-500/10 text-amber-500 rounded-xl">
            <CalendarIcon className="w-6 h-6" />
          </div>
          <div>
            <h2 className={`font-black text-xl ${isDark ? 'text-white' : 'text-slate-800'}`}>
              中長期目標 (Long Goals)
            </h2>
            <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              年ごとのロードマップやメンバー別マイルストーンを管理します（ドラッグ＆ドロップで年移動可能）
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5">
            <Users className={`w-4 h-4 ${isDark ? 'text-slate-400' : 'text-slate-500'}`} />
            <select
              value={filterMemberId}
              onChange={(e) => setFilterMemberId(e.target.value)}
              className={`px-3 py-1.5 rounded-xl border text-xs font-medium focus:outline-none focus:ring-1 focus:ring-amber-500 ${
                isDark ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-800'
              }`}
            >
              <option value="all">すべての担当者を表示</option>
              <option value="unassigned">全体目標（未割り当て）のみ</option>
              {members.map(m => (
                <option key={m.id} value={m.id}>{m.name} ({m.role || 'メンバー'})</option>
              ))}
            </select>
          </div>

          {targetYear !== currentYear && (
            <button
              type="button"
              onClick={() => setTargetYear(currentYear)}
              className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                isDark 
                  ? 'bg-slate-900 border-slate-800 hover:bg-slate-800 text-amber-400' 
                  : 'bg-white border-slate-200 hover:bg-slate-50 text-amber-600'
              }`}
              title="追加先の対象年を今年に戻す"
            >
              <RotateCcw className="w-3.5 h-3.5" /> 今年 ({currentYear})
            </button>
          )}
        </div>
      </div>

      {/* 【上段】年ごとの横スクロールロードマップカード */}
      <div className="flex gap-4 overflow-x-auto pb-4 shrink-0">
        {allYears.map((year) => {
          const yearGoals = sortedLongItems.filter(item => item.year === year);
          const isThisYear = year === currentYear;
          const isDragOver = dragOverYear === year;

          return (
            <div
              key={year}
              onDragOver={(e) => handleDragOver(e, year)}
              onDragLeave={(e) => handleDragLeave(e, year)}
              onDrop={(e) => handleDrop(e, year)}
              className={`w-80 shrink-0 rounded-2xl border flex flex-col shadow-xs transition-all ${
                isDragOver 
                  ? 'ring-2 ring-amber-500 bg-amber-500/5 border-amber-500' 
                  : (isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200/80')
              }`}
            >
              <div className={`px-4 py-3 border-b flex items-center justify-between ${
                isDark ? 'bg-slate-900 border-slate-800' : 'bg-slate-50/80 border-slate-100'
              }`}>
                <div className="flex items-center gap-2">
                  <span className={`font-black text-base ${isThisYear ? 'text-amber-500' : (isDark ? 'text-slate-200' : 'text-slate-800')}`}>
                    {year}年
                  </span>
                  {isThisYear && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-500">
                      今年
                    </span>
                  )}
                </div>
                <span className={`text-[11px] font-bold ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                  {yearGoals.length}件
                </span>
              </div>

              <div className="p-3 space-y-2.5 min-h-[160px] max-h-72 overflow-y-auto">
                {yearGoals.length === 0 ? (
                  <div className={`text-center py-10 text-xs italic border border-dashed rounded-xl ${
                    isDark ? 'border-slate-800 text-slate-600' : 'border-slate-200 text-slate-400'
                  }`}>
                    ここに目標をドロップするか<br />新規追加してください
                  </div>
                ) : (
                  yearGoals.map((item) => {
                    const isEditing = editingId === item.id;

                    return (
                      <div
                        key={item.id}
                        draggable={!isEditing}
                        onDragStart={(e) => handleDragStart(e, item)}
                        className={`group p-2.5 rounded-xl border text-xs transition-all ${
                          draggingId === item.id ? 'opacity-40' : 'opacity-100'
                        } ${
                          isDark ? 'bg-slate-800/40 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-200/60 text-slate-700'
                        }`}
                      >
                        {isEditing ? (
                          <div className="space-y-2">
                            <input
                              type="text"
                              value={editTitleInput}
                              onChange={(e) => setEditTitleInput(e.target.value)}
                              onCompositionStart={() => setIsComposing(true)}
                              onCompositionEnd={() => setIsComposing(false)}
                              autoFocus
                              className={`w-full px-2 py-1 border rounded-lg text-xs font-medium focus:outline-none focus:ring-1 focus:ring-amber-500 ${
                                isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                              }`}
                              placeholder="タイトル"
                            />
                            <input
                              type="text"
                              value={editDescInput}
                              onChange={(e) => setEditDescInput(e.target.value)}
                              onCompositionStart={() => setIsComposing(true)}
                              onCompositionEnd={() => setIsComposing(false)}
                              className={`w-full px-2 py-1 border rounded-lg text-xs font-medium focus:outline-none focus:ring-1 focus:ring-amber-500 ${
                                isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                              }`}
                              placeholder="詳細（任意）"
                            />
                            <div className="flex justify-end gap-1 pt-1">
                              <button
                                type="button"
                                onClick={() => handleSaveEdit(item.id)}
                                className="px-2 py-0.5 bg-amber-600 text-white rounded text-[10px] font-bold flex items-center gap-0.5 cursor-pointer hover:bg-amber-700"
                              >
                                <Check className="w-3 h-3" /> 保存
                              </button>
                              <button
                                type="button"
                                onClick={handleCancelEdit}
                                className={`px-2 py-0.5 rounded text-[10px] font-bold cursor-pointer ${
                                  isDark ? 'bg-slate-700 text-slate-300' : 'bg-slate-200 text-slate-700'
                                }`}
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-start justify-between gap-1.5 min-w-0">
                            <div className="flex items-start gap-1.5 min-w-0 flex-1 cursor-grab active:cursor-grabbing">
                              <GripVertical className="w-3.5 h-3.5 shrink-0 mt-0.5 text-slate-400 opacity-50 group-hover:opacity-100" />
                              <div className="space-y-1 min-w-0 flex-1">
                                <p className="font-bold break-all leading-snug">{item.title}</p>
                                {item.description && (
                                  <p className={`text-[11px] leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                                    {item.description}
                                  </p>
                                )}
                                <div>
                                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold inline-block ${
                                    (!item.memberIds || item.memberIds.length === 0) 
                                      ? (isDark ? 'bg-slate-700/60 text-slate-400' : 'bg-slate-200 text-slate-600')
                                      : 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                                  }`}>
                                    {getMemberNames(item.memberIds)}
                                  </span>
                                </div>
                              </div>
                            </div>
                            <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5 shrink-0">
                              <button
                                type="button"
                                onClick={() => handleStartEdit(item)}
                                className={`p-1 rounded transition-colors cursor-pointer ${
                                  isDark ? 'hover:bg-slate-700 text-slate-400 hover:text-slate-200' : 'hover:bg-slate-200 text-slate-500 hover:text-slate-800'
                                }`}
                                title="編集"
                              >
                                <Edit2 className="w-3 h-3" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteItem(item.id)}
                                className="p-1 rounded transition-colors cursor-pointer text-slate-400 hover:text-rose-500 hover:bg-rose-500/10"
                                title="削除"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* 【中段】中長期目標の新規追加フォーム */}
      <div className={`p-5 rounded-2xl border shadow-xs shrink-0 ${
        isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
      }`}>
        <div className="flex items-center justify-between mb-4 pb-2 border-b border-dashed">
          <h3 className={`text-xs font-bold flex items-center gap-1.5 ${isDark ? 'text-amber-400' : 'text-amber-600'}`}>
            <Plus className="w-4 h-4" /> 中長期目標の新規追加
          </h3>
          <span className={`text-[10px] font-medium ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
            タイトル入力中にEnterキーで一発追加できます
          </span>
        </div>

        <form onSubmit={handleAddItem} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
            <div className="md:col-span-3">
              <label className={`block text-[10px] font-bold mb-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>対象年</label>
              <select
                value={targetYear}
                onChange={(e) => setTargetYear(Number(e.target.value))}
                className={`w-full px-3 py-2 border rounded-xl text-xs font-medium focus:outline-none focus:ring-1 focus:ring-amber-500 ${
                  isDark ? 'bg-slate-800 border-slate-700 text-slate-100' : 'bg-slate-50 border-slate-300 text-slate-800'
                }`}
              >
                {allYears.map((y) => (
                  <option key={y} value={y}>{y}年</option>
                ))}
                <option value={currentYear + 4}>{currentYear + 4}年</option>
                <option value={currentYear + 5}>{currentYear + 5}年</option>
              </select>
            </div>
            <div className="md:col-span-4">
              <label className={`block text-[10px] font-bold mb-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>目標タイトル</label>
              <input
                ref={titleInputRef}
                type="text"
                placeholder="例: グローバル展開の開始"
                value={titleInput}
                onChange={(e) => setTitleInput(e.target.value)}
                onKeyDown={handleAddKeyDown}
                onCompositionStart={() => setIsComposing(true)}
                onCompositionEnd={() => setIsComposing(false)}
                className={`w-full px-3 py-2 border rounded-xl text-xs font-medium focus:outline-none focus:ring-1 focus:ring-amber-500 ${
                  isDark ? 'bg-slate-800 border-slate-700 text-slate-100 placeholder-slate-500' : 'bg-slate-50 border-slate-300 text-slate-800 placeholder-slate-400'
                }`}
              />
            </div>
            <div className="md:col-span-5">
              <label className={`block text-[10px] font-bold mb-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>詳細・補足説明（任意）</label>
              <input
                type="text"
                placeholder="例: 海外拠点の設立と人材確保"
                value={descInput}
                onChange={(e) => setDescInput(e.target.value)}
                onKeyDown={handleAddKeyDown}
                onCompositionStart={() => setIsComposing(true)}
                onCompositionEnd={() => setIsComposing(false)}
                className={`w-full px-3 py-2 border rounded-xl text-xs font-medium focus:outline-none focus:ring-1 focus:ring-amber-500 ${
                  isDark ? 'bg-slate-800 border-slate-700 text-slate-100 placeholder-slate-500' : 'bg-slate-50 border-slate-300 text-slate-800 placeholder-slate-400'
                }`}
              />
            </div>
          </div>

          <div>
            <label className={`block text-[10px] font-bold mb-1.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              担当メンバー（未選択の場合は「全体」になります）
            </label>
            <div className="flex flex-wrap gap-2">
              {members.map(m => {
                const isSelected = selectedMemberIds.includes(m.id);
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => toggleMemberSelection(m.id)}
                    className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                      isSelected
                        ? 'bg-amber-500/10 border-amber-500 text-amber-500 shadow-xs'
                        : (isDark ? 'bg-slate-800/60 border-slate-700 text-slate-400 hover:border-slate-600' : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-slate-300')
                    }`}
                  >
                    <div className={`w-2 h-2 rounded-full ${isSelected ? 'bg-amber-500' : 'bg-slate-400'}`} />
                    {m.name}
                    <span className="text-[10px] opacity-60">({m.role || 'メンバー'})</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              className="px-6 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl transition-colors cursor-pointer shadow-xs text-xs font-bold flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" /> 目標を追加する
            </button>
          </div>
        </form>
      </div>

      {/* 【下段】全期間の目標一覧リスト */}
      <div className={`p-5 rounded-2xl border shadow-xs shrink-0 ${
        isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
      }`}>
        <div className="flex items-center justify-between mb-4 pb-2 border-b border-dashed">
          <h3 className={`text-xs font-bold flex items-center gap-1.5 ${isDark ? 'text-amber-400' : 'text-amber-600'}`}>
            <ListFilter className="w-4 h-4" /> 登録済み目標一覧 ({sortedLongItems.length}件)
          </h3>
          <span className={`text-[10px] font-medium ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
            全期間の目標を横断して確認・編集できます
          </span>
        </div>

        {sortedLongItems.length === 0 ? (
          <div className={`text-center py-10 text-xs italic ${isDark ? 'text-slate-600' : 'text-slate-400'}`}>
            条件に一致する中長期目標はありません。
          </div>
        ) : (
          <div className="space-y-2">
            {sortedLongItems.map((item) => {
              const isEditing = editingId === item.id;

              return (
                <div
                  key={item.id}
                  className={`group p-3.5 rounded-xl border transition-all text-xs flex flex-col gap-3 ${
                    isDark ? 'bg-slate-800/40 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-200/60 text-slate-700'
                  }`}
                >
                  {isEditing ? (
                    <div className="space-y-3">
                      <div className="grid grid-cols-1 md:grid-cols-12 gap-2">
                        <div className="md:col-span-3">
                          <select
                            value={editYearInput}
                            onChange={(e) => setEditYearInput(Number(e.target.value))}
                            className={`w-full px-2.5 py-1.5 border rounded-lg text-xs font-medium focus:outline-none focus:ring-1 focus:ring-amber-500 ${
                              isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                            }`}
                          >
                            {allYears.map((y) => (
                              <option key={y} value={y}>{y}年</option>
                            ))}
                            <option value={currentYear + 4}>{currentYear + 4}年</option>
                            <option value={currentYear + 5}>{currentYear + 5}年</option>
                          </select>
                        </div>
                        <div className="md:col-span-4">
                          <input
                            type="text"
                            value={editTitleInput}
                            onChange={(e) => setEditTitleInput(e.target.value)}
                            onCompositionStart={() => setIsComposing(true)}
                            onCompositionEnd={() => setIsComposing(false)}
                            autoFocus
                            className={`w-full px-2.5 py-1.5 border rounded-lg text-xs font-medium focus:outline-none focus:ring-1 focus:ring-amber-500 ${
                              isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                            }`}
                            placeholder="タイトル"
                          />
                        </div>
                        <div className="md:col-span-5">
                          <input
                            type="text"
                            value={editDescInput}
                            onChange={(e) => setEditDescInput(e.target.value)}
                            onCompositionStart={() => setIsComposing(true)}
                            onCompositionEnd={() => setIsComposing(false)}
                            className={`w-full px-2.5 py-1.5 border rounded-lg text-xs font-medium focus:outline-none focus:ring-1 focus:ring-amber-500 ${
                              isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                            }`}
                            placeholder="詳細（任意）"
                          />
                        </div>
                      </div>

                      <div>
                        <span className={`block text-[10px] font-bold mb-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>担当メンバー変更</span>
                        <div className="flex flex-wrap gap-1.5">
                          {members.map(m => {
                            const isSelected = editMemberIds.includes(m.id);
                            return (
                              <button
                                key={m.id}
                                type="button"
                                onClick={() => toggleEditMemberSelection(m.id)}
                                className={`px-2.5 py-1 rounded-lg border text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1 ${
                                  isSelected
                                    ? 'bg-amber-500/10 border-amber-500 text-amber-500'
                                    : (isDark ? 'bg-slate-900 border-slate-700 text-slate-400' : 'bg-white border-slate-200 text-slate-600')
                                }`}
                              >
                                {m.name}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <div className="flex justify-end gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => handleSaveEdit(item.id)}
                          className="px-3 py-1 bg-amber-600 text-white rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer hover:bg-amber-700"
                        >
                          <Check className="w-3.5 h-3.5" /> 保存
                        </button>
                        <button
                          type="button"
                          onClick={handleCancelEdit}
                          className={`px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer ${
                            isDark ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                          }`}
                        >
                          <X className="w-3.5 h-3.5" /> キャンセル
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-start gap-3 min-w-0 flex-1">
                        <span className={`px-2.5 py-1 rounded-lg text-[11px] font-black shrink-0 ${
                          item.year === currentYear 
                            ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' 
                            : (isDark ? 'bg-slate-800 text-slate-300' : 'bg-slate-200/70 text-slate-700')
                        }`}>
                          {item.year}年
                        </span>
                        <div className="min-w-0 flex-1 space-y-1">
                          <div className="flex items-center gap-2">
                            <Target className="w-3.5 h-3.5 shrink-0 text-amber-500" />
                            <p className="font-bold truncate">{item.title}</p>
                          </div>
                          {item.description && (
                            <p className={`text-[11px] leading-relaxed pl-5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                              {item.description}
                            </p>
                          )}
                          <div className="pl-5 pt-0.5">
                            <span className={`text-[10px] px-2 py-0.5 rounded font-bold inline-block ${
                              (!item.memberIds || item.memberIds.length === 0) 
                                ? (isDark ? 'bg-slate-800 text-slate-400' : 'bg-slate-200 text-slate-600')
                                : 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                            }`}>
                              担当: {getMemberNames(item.memberIds)}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleStartEdit(item)}
                          className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                            isDark ? 'hover:bg-slate-700 text-slate-400 hover:text-slate-200' : 'hover:bg-slate-200 text-slate-500 hover:text-slate-800'
                          }`}
                          title="編集"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteItem(item.id)}
                          className="p-1.5 rounded-lg transition-colors cursor-pointer text-slate-400 hover:text-rose-500 hover:bg-rose-500/10"
                          title="削除"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
}