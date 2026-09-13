// src/components/YearView.tsx
import React, { useState, useRef } from 'react';
import { Plus, Trash2, Edit2, Check, X, Calendar as CalendarIcon, ChevronLeft, ChevronRight, RotateCcw, GripVertical, User } from 'lucide-react';

export type YearItem = {
  id: string;
  year: number;  // 対象年（例: 2026）
  month: number; // 1〜12月
  title: string;
  description?: string;
  color?: string;
  memberIds?: string[]; // 担当メンバーIDの配列（複数選択対応。未指定/空の場合は全体対象）
  memberId?: string;    // 互換性維持用
  updatedAt?: string;   // 同期用タイムスタンプ
  isDeleted?: boolean;  // 論理削除フラグ
};

type YearViewProps = {
  theme?: 'light' | 'dark';
  tasks: any[];
  eventColor: string;
  goalColor: string;
  memoColor: string;
  yearItems: YearItem[];
  setYearItems: React.Dispatch<React.SetStateAction<YearItem[]>>;
  members?: { id: string; name: string; role?: string; color?: string }[]; // メンバー一覧
};

export default function YearView({
  theme = 'light',
  goalColor = '#f59e0b',
  yearItems = [],
  setYearItems,
  members = [],
}: YearViewProps) {
  const isDark = theme === 'dark';
  const currentDate = new Date();
  const currentYearNum = currentDate.getFullYear();
  const currentMonthNum = currentDate.getMonth() + 1;

  // 表示中のターゲット年（デフォルトは今年）
  const [targetYear, setTargetYear] = useState<number>(currentYearNum);

  // 選択中の表示フィルター（メンバー）
  const [selectedMemberFilter, setSelectedMemberFilter] = useState<string>('all');

  // 新規追加フォームの状態
  const [selectedMonth, setSelectedMonth] = useState<number>(currentMonthNum);
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [titleInput, setTitleInput] = useState<string>('');
  const [descInput, setDescInput] = useState<string>('');

  // 編集中のアイテムIDと一時テキスト
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitleInput, setEditTitleInput] = useState<string>('');
  const [editDescInput, setEditDescInput] = useState<string>('');
  const [editMemberIdsInput, setEditMemberIdsInput] = useState<string[]>([]);
  
  // ドラッグ＆ドロップ中のアイテムID
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverMonth, setDragOverMonth] = useState<number | null>(null);

  // 日本語変換中のEnter誤爆を防ぐフラグ
  const [isComposing, setIsComposing] = useState<boolean>(false);

  // 新規追加フォームのタイトル入力参照（Enter追加後にフォーカスを戻すため）
  const titleInputRef = useRef<HTMLInputElement>(null);

  // 月リスト (1〜12月)
  const months = Array.from({ length: 12 }, (_, i) => i + 1);

  // 新規追加時のメンバーチップ選択切り替え
  const toggleSelectMemberForAdd = (memberId: string) => {
    if (selectedMemberIds.includes(memberId)) {
      setSelectedMemberIds(selectedMemberIds.filter(id => id !== memberId));
    } else {
      setSelectedMemberIds([...selectedMemberIds, memberId]);
    }
  };

  // 編集時のメンバーチップ選択切り替え
  const toggleSelectMemberForEdit = (memberId: string) => {
    if (editMemberIdsInput.includes(memberId)) {
      setEditMemberIdsInput(editMemberIdsInput.filter(id => id !== memberId));
    } else {
      setEditMemberIdsInput([...editMemberIdsInput, memberId]);
    }
  };

  // 項目の追加
  const handleAddItem = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!titleInput.trim()) return;

    const now = new Date().toISOString();
    const newItem: YearItem = {
      id: `year-item-${Date.now()}-${Math.random()}`,
      year: targetYear,
      month: selectedMonth,
      title: titleInput.trim(),
      description: descInput.trim() || undefined,
      color: goalColor,
      memberIds: selectedMemberIds.length > 0 ? selectedMemberIds : undefined,
      updatedAt: now,
      isDeleted: false,
    };

    setYearItems([...(yearItems || []), newItem]);
    setTitleInput('');
    setDescInput('');
    setSelectedMemberIds([]); // 選択状態をリセット
    
    if (titleInputRef.current) {
      titleInputRef.current.focus();
    }
  };

  // 新規追加フォームでのEnterキーによる一発登録
  const handleAddKeyDown = (e: React.KeyboardEvent) => {
    if (isComposing) return;
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddItem();
    }
  };

  // ★ 項目の削除（論理削除＝墓石化へ変更）
  const handleDeleteItem = (id: string) => {
    const now = new Date().toISOString();
    setYearItems((yearItems || []).map(item => {
      if (item.id === id) {
        return {
          ...item,
          isDeleted: true,
          updatedAt: now,
        };
      }
      return item;
    }));
  };

  // 編集モードの開始
  const handleStartEdit = (item: YearItem) => {
    setEditingId(item.id);
    setEditTitleInput(item.title);
    setEditDescInput(item.description || '');
    const initialIds = item.memberIds || (item.memberId ? [item.memberId] : []);
    setEditMemberIdsInput(initialIds);
  };

  // 編集の保存
  const handleSaveEdit = (id: string) => {
    if (!editTitleInput.trim()) return;
    const now = new Date().toISOString();
    setYearItems((yearItems || []).map(item => {
      if (item.id === id) {
        return {
          ...item,
          title: editTitleInput.trim(),
          description: editDescInput.trim() || undefined,
          memberIds: editMemberIdsInput.length > 0 ? editMemberIdsInput : undefined,
          memberId: undefined, // 古いフィールドはクリア
          updatedAt: now,
        };
      }
      return item;
    }));
    setEditingId(null);
  };

  // 編集のキャンセル
  const handleCancelEdit = () => {
    setEditingId(null);
  };

  // 編集時のキーダウン処理
  const handleEditKeyDown = (e: React.KeyboardEvent, id: string) => {
    if (isComposing) return;
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSaveEdit(id);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleCancelEdit();
    }
  };

  // ドラッグ＆ドロップ処理
  const handleDragStart = (e: React.DragEvent, item: YearItem) => {
    setDraggingId(item.id);
    e.dataTransfer.setData('text/plain', item.id);
  };

  const handleDragOver = (e: React.DragEvent, month: number) => {
    e.preventDefault();
    setDragOverMonth(month);
  };

  const handleDragLeave = (month: number) => {
    if (dragOverMonth === month) {
      setDragOverMonth(null);
    }
  };

  const handleDrop = (e: React.DragEvent, targetMonth: number) => {
    e.preventDefault();
    setDragOverMonth(null);
    if (!draggingId) return;

    const now = new Date().toISOString();
    setYearItems((yearItems || []).map(item => {
      if (item.id === draggingId) {
        return {
          ...item,
          year: targetYear,
          month: targetMonth,
          updatedAt: now,
        };
      }
      return item;
    }));
    setDraggingId(null);
  };

  // アイテムが持つメンバーIDのリストを取得するヘルパー
  const getItemMemberIds = (item: YearItem): string[] => {
    if (item.memberIds && item.memberIds.length > 0) return item.memberIds;
    if (item.memberId) return [item.memberId];
    return [];
  };

  // ★ フィルター適用済みのアイテム（!item.isDeleted を必ず除外対象に含める）
  const filteredItems = (yearItems || []).filter(item => {
    if (item.isDeleted) return false; // 削除済みは除外
    if (item.year !== targetYear) return false;
    const itemIds = getItemMemberIds(item);

    if (selectedMemberFilter === 'all') return true;
    if (selectedMemberFilter === 'unassigned') return itemIds.length === 0;
    
    return itemIds.includes(selectedMemberFilter);
  });

  return (
    <div className={`flex flex-col h-full p-6 select-none transition-colors overflow-y-auto space-y-6 ${
      isDark ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-800'
    }`}>
      
      {/* ヘッダー ＆ 年の切り替え ＆ メンバーフィルター */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-amber-500/10 text-amber-500 rounded-xl">
            <CalendarIcon className="w-6 h-6" />
          </div>
          <div>
            <h2 className={`font-black text-xl ${isDark ? 'text-white' : 'text-slate-800'}`}>
              年間・月別目標 (Month Goals)
            </h2>
            <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              {targetYear}年の12ヶ月のグリッドで月ごとの目標を管理します
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {members.length > 0 && (
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-2xl border shadow-xs ${
              isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
            }`}>
              <User className={`w-3.5 h-3.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`} />
              <select
                value={selectedMemberFilter}
                onChange={(e) => setSelectedMemberFilter(e.target.value)}
                className={`text-xs font-bold bg-transparent focus:outline-none cursor-pointer ${
                  isDark ? 'text-slate-200' : 'text-slate-700'
                }`}
              >
                <option value="all" className={isDark ? 'bg-slate-900' : 'bg-white'}>全メンバー対象</option>
                <option value="unassigned" className={isDark ? 'bg-slate-900' : 'bg-white'}>全体対象 (未割り当て)</option>
                {members.map(m => (
                  <option key={m.id} value={m.id} className={isDark ? 'bg-slate-900' : 'bg-white'}>{m.name}</option>
                ))}
              </select>
            </div>
          )}

          {targetYear !== currentYearNum && (
            <button
              type="button"
              onClick={() => setTargetYear(currentYearNum)}
              className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                isDark 
                  ? 'bg-slate-900 border-slate-800 hover:bg-slate-800 text-amber-400' 
                  : 'bg-white border-slate-200 hover:bg-slate-50 text-amber-600'
              }`}
              title="今年の表示に戻す"
            >
              <RotateCcw className="w-3.5 h-3.5" /> 今年 ({currentYearNum})
            </button>
          )}

          <div className={`flex items-center gap-1 px-3 py-1.5 rounded-2xl border shadow-xs ${
            isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
          }`}>
            <button
              type="button"
              onClick={() => setTargetYear(targetYear - 1)}
              className={`p-1.5 rounded-xl transition-colors cursor-pointer ${
                isDark ? 'hover:bg-slate-800 text-slate-300' : 'hover:bg-slate-100 text-slate-600'
              }`}
              title="前年へ"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className={`font-black text-base px-2 ${targetYear === currentYearNum ? 'text-amber-500' : (isDark ? 'text-white' : 'text-slate-800')}`}>
              {targetYear}年
            </span>
            <button
              type="button"
              onClick={() => setTargetYear(targetYear + 1)}
              className={`p-1.5 rounded-xl transition-colors cursor-pointer ${
                isDark ? 'hover:bg-slate-800 text-slate-300' : 'hover:bg-slate-100 text-slate-600'
              }`}
              title="翌年へ"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* 12ヶ月グリッドビュー */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 shrink-0">
        {months.map((month) => {
          const monthGoals = filteredItems.filter(item => item.month === month);
          const isCurrentMonthCard = targetYear === currentYearNum && month === currentMonthNum;
          const isDragOver = dragOverMonth === month;

          return (
            <div
              key={month}
              onDragOver={(e) => handleDragOver(e, month)}
              onDragLeave={() => handleDragLeave(month)}
              onDrop={(e) => handleDrop(e, month)}
              className={`rounded-2xl border flex flex-col shadow-xs transition-all ${
                isDragOver 
                  ? 'ring-2 ring-amber-500 bg-amber-500/5 border-amber-500' 
                  : isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200/80'
              }`}
            >
              <div className={`px-4 py-3 border-b flex items-center justify-between ${
                isDark ? 'bg-slate-900 border-slate-800' : 'bg-slate-50/80 border-slate-100'
              }`}>
                <div className="flex items-center gap-2">
                  <span className={`font-black text-base ${isCurrentMonthCard ? 'text-amber-500' : (isDark ? 'text-slate-200' : 'text-slate-800')}`}>
                    {month}月
                  </span>
                  {isCurrentMonthCard && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-500">
                      今月
                    </span>
                  )}
                </div>
                <span className={`text-[11px] font-bold ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                  {monthGoals.length}件
                </span>
              </div>

              <div className="p-3 space-y-2.5 min-h-[120px] max-h-48 overflow-y-auto">
                {monthGoals.length === 0 ? (
                  <div className={`text-center py-6 text-xs italic ${isDark ? 'text-slate-600' : 'text-slate-400'}`}>
                    {isDragOver ? 'ここにドロップして移動' : '目標なし'}
                  </div>
                ) : (
                  monthGoals.map((item) => {
                    const isEditing = editingId === item.id;
                    const itemMemberIds = getItemMemberIds(item);

                    return (
                      <div
                        key={item.id}
                        draggable={!isEditing}
                        onDragStart={(e) => handleDragStart(e, item)}
                        className={`group p-2.5 rounded-xl border transition-all text-xs cursor-grab active:cursor-grabbing ${
                          isDark ? 'bg-slate-800/40 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-200/60 text-slate-700'
                        }`}
                      >
                        {isEditing ? (
                          <div 
                            className="space-y-2.5 cursor-default"
                            onKeyDown={(e) => handleEditKeyDown(e, item.id)}
                          >
                            {members.length > 0 && (
                              <div className="space-y-1">
                                <span className={`block text-[10px] font-bold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>担当メンバー (複数選択可)</span>
                                <div className="flex flex-wrap gap-1">
                                  {members.map(m => {
                                    const isSelected = editMemberIdsInput.includes(m.id);
                                    return (
                                      <button
                                        key={m.id}
                                        type="button"
                                        onClick={() => toggleSelectMemberForEdit(m.id)}
                                        className={`px-2 py-1 rounded-lg text-[10px] font-bold border transition-colors cursor-pointer flex items-center gap-1 ${
                                          isSelected
                                            ? 'bg-amber-500 text-white border-amber-600 shadow-xs'
                                            : isDark ? 'bg-slate-900 border-slate-700 text-slate-300 hover:bg-slate-800' : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-100'
                                        }`}
                                      >
                                        <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-white' : 'bg-amber-500'}`} />
                                        {m.name} {m.role && `(${m.role})`}
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            )}

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
                              placeholder="目標タイトル（Enterで保存）"
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
                              placeholder="詳細（任意・Enterで保存）"
                            />
                            <div className="flex justify-end gap-1 pt-1">
                              <button
                                type="button"
                                onClick={() => handleSaveEdit(item.id)}
                                className="px-2 py-0.5 bg-amber-600 text-white rounded-md text-[10px] font-bold flex items-center gap-1 cursor-pointer hover:bg-amber-700"
                              >
                                <Check className="w-3 h-3" /> 保存
                              </button>
                              <button
                                type="button"
                                onClick={handleCancelEdit}
                                className={`px-2 py-0.5 rounded-md text-[10px] font-bold flex items-center gap-1 cursor-pointer ${
                                  isDark ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                                }`}
                              >
                                <X className="w-3 h-3" /> 取消
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-start gap-1.5 min-w-0">
                              <GripVertical className="w-3.5 h-3.5 shrink-0 mt-0.5 text-slate-400 opacity-50 group-hover:opacity-100 transition-opacity" />
                              <div className="space-y-1 min-w-0">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <p className="font-bold break-all leading-snug">{item.title}</p>
                                  {itemMemberIds.map(mId => {
                                    const mObj = members.find(m => m.id === mId);
                                    if (!mObj) return null;
                                    return (
                                      <span key={mId} className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-500 shrink-0">
                                        {mObj.name}
                                      </span>
                                    );
                                  })}
                                </div>
                                {item.description && (
                                  <p className={`text-[11px] leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                                    {item.description}
                                  </p>
                                )}
                              </div>
                            </div>
                            <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 shrink-0">
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

      {/* 新規追加フォーム */}
      <div className={`p-5 rounded-2xl border shadow-xs shrink-0 ${
        isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
      }`}>
        <div className="flex items-center justify-between mb-4 pb-2 border-b border-dashed">
          <h3 className={`text-xs font-bold flex items-center gap-1.5 ${isDark ? 'text-amber-400' : 'text-amber-600'}`}>
            <Plus className="w-4 h-4" /> {targetYear}年 月別目標の新規追加
          </h3>
          <span className={`text-[10px] font-medium ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
            タイトル入力中にEnterキーで一発追加できます
          </span>
        </div>

        <form onSubmit={handleAddItem} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-start">
            <div className="md:col-span-3">
              <label className={`block text-[10px] font-bold mb-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>対象月</label>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(Number(e.target.value))}
                className={`w-full px-3 py-2 border rounded-xl text-xs font-medium focus:outline-none focus:ring-1 focus:ring-amber-500 ${
                  isDark ? 'bg-slate-800 border-slate-700 text-slate-100' : 'bg-slate-50 border-slate-300 text-slate-800'
                }`}
              >
                {months.map((m) => (
                  <option key={m} value={m}>{targetYear}年 {m}月</option>
                ))}
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

          {members.length > 0 && (
            <div className="space-y-1.5 pt-1">
              <div className="flex items-center justify-between">
                <span className={`text-[10px] font-bold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  担当メンバー（未選択の場合は「全体」になります）
                </span>
                {selectedMemberIds.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setSelectedMemberIds([])}
                    className="text-[10px] font-bold text-amber-500 hover:underline cursor-pointer"
                  >
                    選択をクリア
                  </button>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {members.map(m => {
                  const isSelected = selectedMemberIds.includes(m.id);
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => toggleSelectMemberForAdd(m.id)}
                      className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-all cursor-pointer flex items-center gap-1.5 shadow-xs ${
                        isSelected
                          ? 'bg-amber-500 text-white border-amber-600 ring-2 ring-amber-500/20'
                          : isDark ? 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <span className={`w-2 h-2 rounded-full ${isSelected ? 'bg-white' : 'bg-amber-500'}`} />
                      <span>{m.name}</span>
                      {m.role && <span className={`text-[10px] ${isSelected ? 'text-amber-100' : 'text-slate-400'}`}>({m.role})</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              className="px-6 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl transition-colors cursor-pointer shadow-xs text-xs font-bold flex items-center justify-center gap-1.5"
            >
              <Plus className="w-4 h-4" /> 目標を追加する
            </button>
          </div>
        </form>
      </div>

    </div>
  );
}