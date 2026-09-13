import React, { useState, useRef, useEffect } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Plus, X, Check, Trash2, Tag as TagIcon } from 'lucide-react';
import WeekView from './WeekView';
import MonthView from './MonthView';
import YearCalendarView from './YearView';

export type TagItem = {
  id: string;
  name: string;
  color: string;
};

export type CalendarEvent = {
  id: string;
  title: string;
  date: string;         // 開始日 YYYY-MM-DD
  endDate?: string;     // 終了日（複数日またぎ用）
  startTime?: string;   // 例: "13:30"
  endTime?: string;     // 例: "18:50"
  description?: string;
  memberIds?: string[];
  tags?: string[];      
  color?: string;
  isDeleted?: boolean;  // ★ 論理削除（墓石フラグ）
  updatedAt?: string;   // ★ LWWマージ用の更新日時
};

type CalendarContainerProps = {
  theme?: 'light' | 'dark';
  events?: CalendarEvent[];
  setEvents?: React.Dispatch<React.SetStateAction<CalendarEvent[]>>;
  members?: { id: string; name: string; role?: string; color?: string }[];
  tags?: TagItem[];
  manualSync?: () => void;
};

export default function CalendarContainer({
  theme = 'light',
  events = [],
  setEvents = () => {},
  members = [],
  tags = [],
  manualSync,
}: CalendarContainerProps) {
  const isDark = theme == 'dark';
  const [currentView, setCurrentView] = useState<'week' | 'month' | 'year'>('month');
  const [currentDate, setCurrentDate] = useState<Date>(new Date());

  const [selectedFilterMember, setSelectedFilterMember] = useState<string>('all');
  const [selectedTagFilter, setSelectedTagFilter] = useState<string>('all');

  const [isPickerOpen, setIsPickerOpen] = useState<boolean>(false);
  const pickerRef = useRef<HTMLDivElement>(null);

  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  
  const [titleInput, setTitleInput] = useState<string>('');
  const [dateInput, setDateInput] = useState<string>(new Date().toISOString().split('T')[0]);
  const [endDateInput, setEndDateInput] = useState<string>('');
  const [startTimeInput, setStartTimeInput] = useState<string>('10:00');
  const [endTimeInput, setEndTimeInput] = useState<string>('11:00');
  const [descInput, setDescInput] = useState<string>('');
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [selectedTagNames, setSelectedTagNames] = useState<string[]>([]);

  // ドラッグ＆ドロップで日付・時間が変更された時の処理（長さ・時間を維持してスライド）
  const handleEventMove = (event: CalendarEvent, newDateStr: string, newStartHour?: number, newStartMinute?: number) => {
    const nowIso = new Date().toISOString();
    const updatedEvents = events.map(ev => {
      if (ev.id === event.id) {
        // 元の開始日時・終了日時のタイムスタンプを計算
        const oldStartStr = ev.startTime || '10:00';
        const oldEndStr = ev.endTime || '11:00';
        
        const [oldSH, oldSM] = oldStartStr.split(':').map(Number);
        const [oldEH, oldEM] = oldEndStr.split(':').map(Number);
        
        const oldDurationMinutes = (oldEH * 60 + oldEM) - (oldSH * 60 + oldSM);

        // 新しい開始時間
        const newSH = newStartHour !== undefined ? newStartHour : oldSH;
        const newSM = newStartMinute !== undefined ? newStartMinute : oldSM;
        const newStartTotalMin = newSH * 60 + newSM;
        const newEndTotalMin = newStartTotalMin + (oldDurationMinutes > 0 ? oldDurationMinutes : 60);

        const formatMinToTime = (totalMin: number = 0) => {
          const clamped = Math.max(0, Math.min(24 * 60 - 1, totalMin));
          const h = Math.floor(clamped / 60);
          const m = clamped % 60;
          return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
        };

        const calculatedStartTime = formatMinToTime(newStartTotalMin);
        const calculatedEndTime = formatMinToTime(newEndTotalMin);

        // 日付差分の計算（複数日またぎ用）
        const startTimestamp = new Date(ev.date).getTime();
        const newStartTimestamp = new Date(newDateStr).getTime();
        const dayDiff = newStartTimestamp - startTimestamp;

        const newEndDate = ev.endDate ? new Date(new Date(ev.endDate).getTime() + dayDiff).toISOString().split('T')[0] : undefined;

        return { 
          ...ev, 
          date: newDateStr, 
          endDate: newEndDate,
          startTime: calculatedStartTime,
          endTime: calculatedEndTime,
          updatedAt: nowIso // ★ 更新日時を付与
        };
      }
      return ev;
    });
    setEvents(updatedEvents);
  };

  const allAvailableTags = Array.from(new Set(events.filter(ev => !ev.isDeleted).flatMap(ev => ev.tags || [])));

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setIsPickerOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (manualSync) {
      manualSync();
    }
  }, [currentView, manualSync]);

  const formatDateString = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const handlePrev = () => {
    const newDate = new Date(currentDate);
    if (currentView === 'week') newDate.setDate(newDate.getDate() - 7);
    else if (currentView === 'month') newDate.setMonth(newDate.getMonth() - 1);
    else if (currentView === 'year') newDate.setFullYear(newDate.getFullYear() - 1);
    setCurrentDate(newDate);
  };

  const handleNext = () => {
    const newDate = new Date(currentDate);
    if (currentView === 'week') newDate.setDate(newDate.getDate() + 7);
    else if (currentView === 'month') newDate.setMonth(newDate.getMonth() + 1);
    else if (currentView === 'year') newDate.setFullYear(newDate.getFullYear() + 1);
    setCurrentDate(newDate);
  };

  const handleToday = () => setCurrentDate(new Date());

  const handleSelectMonthFromYear = (year: number, month: number) => {
    setCurrentDate(new Date(year, month - 1, 1));
    setCurrentView('month');
  };

  const handleSelectWeekFromMonth = (date: Date) => {
    setCurrentDate(date);
    setCurrentView('week');
  };

  const handleOpenAddModal = (defaultDate?: Date, defaultHour?: number) => {
    setEditingEventId(null);
    setTitleInput('');
    const dStr = defaultDate ? formatDateString(defaultDate) : formatDateString(currentDate);
    setDateInput(dStr);
    setEndDateInput(dStr);

    const hour = defaultHour ?? 10;
    const startStr = `${String(hour).padStart(2, '0')}:00`;
    const endStr = `${String(Math.min(23, hour + 1)).padStart(2, '0')}:00`;

    setStartTimeInput(startStr);
    setEndTimeInput(endStr);
    setDescInput('');
    setSelectedMemberIds([]);
    setSelectedTagNames([]);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (event: CalendarEvent) => {
    setEditingEventId(event.id);
    setTitleInput(event.title);
    setDateInput(event.date);
    setEndDateInput(event.endDate || event.date);
    setStartTimeInput(event.startTime || '10:00');
    setEndTimeInput(event.endTime || '11:00');
    setDescInput(event.description || '');
    setSelectedMemberIds(event.memberIds || []);
    setSelectedTagNames(event.tags || []);
    setIsModalOpen(true);
  };

  const handleSaveEvent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!titleInput.trim()) return;

    const nowIso = new Date().toISOString();
    const eventData = {
      title: titleInput.trim(),
      date: dateInput,
      endDate: endDateInput && endDateInput !== dateInput ? endDateInput : undefined,
      startTime: startTimeInput,
      endTime: endTimeInput,
      description: descInput.trim() || undefined,
      memberIds: selectedMemberIds,
      tags: selectedTagNames,
      updatedAt: nowIso, // ★ 保存時の最新タイムスタンプ
    };

    if (editingEventId) {
      setEvents(events.map(ev => ev.id === editingEventId ? { ...ev, ...eventData } : ev));
    } else {
      const newEvent: CalendarEvent = {
        id: `event-${Date.now()}-${Math.random()}`,
        color: '#f59e0b',
        isDeleted: false,
        ...eventData,
      };
      setEvents([...events, newEvent]);
    }
    setIsModalOpen(false);
  };

  // ★ 論理削除（墓石パターン）への変更
  const handleDeleteEvent = (id: string) => {
    const nowIso = new Date().toISOString();
    setEvents(events.map(ev => 
      ev.id === id 
        ? { ...ev, isDeleted: true, updatedAt: nowIso } 
        : ev
    ));
    setIsModalOpen(false);
  };

  // ★ 削除済み（isDeleted）を除外した上でフィルタリング
  const filteredEvents = events.filter(ev => {
    if (ev.isDeleted) return false;

    if (selectedFilterMember !== 'all') {
      if (selectedFilterMember === 'unassigned') {
        if (ev.memberIds && ev.memberIds.length > 0) return false;
      } else {
        if (!ev.memberIds || !ev.memberIds.includes(selectedFilterMember)) return false;
      }
    }
    if (selectedTagFilter !== 'all') {
      if (!ev.tags || !ev.tags.includes(selectedTagFilter)) return false;
    }
    return true;
  });

  const formattedHeaderDate = currentView === 'year' 
    ? `${currentDate.getFullYear()}年` 
    : `${currentDate.getFullYear()}年 ${currentDate.getMonth() + 1}月`;

  return (
    <div className={`flex flex-col h-full select-none ${isDark ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-800'}`}>
      
      <div className={`flex flex-wrap items-center justify-between p-4 border-b shrink-0 gap-4 ${
        isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
      }`}>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="p-2 bg-amber-500/10 text-amber-500 rounded-xl">
            <CalendarIcon className="w-5 h-5" />
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleToday}
              className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-colors cursor-pointer ${
                isDark ? 'bg-slate-800 border-slate-700 hover:bg-slate-700' : 'bg-slate-100 border-slate-200 hover:bg-slate-200'
              }`}
            >
              今日
            </button>
            <div className="flex items-center gap-1">
              <button onClick={handlePrev} className={`p-1.5 rounded-xl cursor-pointer ${isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-100'}`}>
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button onClick={handleNext} className={`p-1.5 rounded-xl cursor-pointer ${isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-100'}`}>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
            
            <div className="relative" ref={pickerRef}>
              <button
                type="button"
                onClick={() => setIsPickerOpen(!isPickerOpen)}
                className={`px-3 py-1.5 rounded-xl border text-xs font-black flex items-center gap-2 transition-colors cursor-pointer ${
                  isDark ? 'bg-slate-800 border-slate-700 text-white hover:bg-slate-700' : 'bg-slate-50 border-slate-300 text-slate-800 hover:bg-slate-100'
                }`}
              >
                <CalendarIcon className="w-3.5 h-3.5 text-amber-500" />
                {formattedHeaderDate}
              </button>

              {isPickerOpen && (
                <div className={`absolute left-0 mt-2 z-50 w-64 p-4 rounded-2xl border shadow-2xl space-y-3 ${
                  isDark ? 'bg-slate-900 border-slate-700 text-slate-100' : 'bg-white border-slate-200 text-slate-800'
                }`}>
                  <div className="flex items-center justify-between border-b pb-2">
                    <span className="text-xs font-black">{currentDate.getFullYear()}年 {currentDate.getMonth() + 1}月</span>
                    <button onClick={() => setIsPickerOpen(false)} className="text-slate-400 hover:text-slate-200">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="grid grid-cols-4 gap-1.5 pt-1">
                    {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => {
                          const newD = new Date(currentDate);
                          newD.setMonth(m - 1);
                          setCurrentDate(newD);
                          setIsPickerOpen(false);
                        }}
                        className={`py-1.5 text-xs font-bold rounded-xl transition-colors cursor-pointer ${
                          currentDate.getMonth() + 1 === m 
                            ? 'bg-amber-500 text-white' 
                            : isDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-300' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                        }`}
                      >
                        {m}月
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <select
            value={selectedFilterMember}
            onChange={(e) => setSelectedFilterMember(e.target.value)}
            className={`px-3 py-2 rounded-xl border text-xs font-bold cursor-pointer ${
              isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-800'
            }`}
          >
            <option value="all">全メンバー対象</option>
            <option value="unassigned">全体対象 (未割り当て)</option>
            {members.map(m => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </select>

          {allAvailableTags.length > 0 && (
            <select
              value={selectedTagFilter}
              onChange={(e) => setSelectedTagFilter(e.target.value)}
              className={`px-3 py-2 rounded-xl border text-xs font-bold cursor-pointer ${
                isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-800'
              }`}
            >
              <option value="all">すべてのタグ</option>
              {allAvailableTags.map(tag => (
                <option key={tag} value={tag}>{tag}</option>
              ))}
            </select>
          )}

          <div className={`flex p-1 rounded-2xl border ${isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-100 border-slate-200'}`}>
            {(['week', 'month', 'year'] as const).map((view) => (
              <button
                key={view}
                type="button"
                onClick={() => setCurrentView(view)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  currentView === view
                    ? 'bg-amber-500 text-white shadow-xs'
                    : isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {view === 'week' ? '週' : view === 'month' ? '月' : '年'}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => handleOpenAddModal()}
            className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-xs flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" /> 予定を追加
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        {currentView === 'week' && (
          <WeekView 
            theme={theme} 
            currentDate={currentDate} 
            events={filteredEvents} 
            members={members} 
            tags={tags}
            onEditEvent={handleOpenEditModal}
            onAddEventForDateTime={(date, hour) => handleOpenAddModal(date, hour)}
            onEventMove={handleEventMove}
          />
        )}
        {currentView === 'month' && (
          <MonthView 
            theme={theme} 
            currentDate={currentDate} 
            events={filteredEvents} 
            members={members} 
            tags={tags}
            onSelectDate={(date) => handleSelectWeekFromMonth(date)}
            onEditEvent={handleOpenEditModal}
            onAddEventForDate={(date) => handleOpenAddModal(date)}
          />
        )}
        {currentView === 'year' && (
          <YearCalendarView 
            theme={theme} 
            currentDate={currentDate} 
            events={filteredEvents} 
            tags={tags}
            onSelectMonth={(year, month) => handleSelectMonthFromYear(year, month)}
          />
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className={`w-full max-w-lg rounded-2xl border shadow-xl p-6 space-y-4 ${
            isDark ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-800'
          }`}>
            <div className="flex items-center justify-between pb-3 border-b">
              <h3 className="text-base font-black flex items-center gap-2">
                <CalendarIcon className="w-5 h-5 text-amber-500" />
                {editingEventId ? '予定の編集' : '新規予定の追加'}
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className={`p-1.5 rounded-xl transition-colors cursor-pointer ${isDark ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-100 text-slate-600'}`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEvent} className="space-y-4">
              <div>
                <label className={`block text-xs font-bold mb-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>予定タイトル</label>
                <input
                  type="text"
                  required
                  value={titleInput}
                  onChange={(e) => setTitleInput(e.target.value)}
                  placeholder="例: プロジェクト定例ミーティング"
                  className={`w-full px-3 py-2 rounded-xl border text-xs font-medium focus:outline-none focus:ring-1 focus:ring-amber-500 ${
                    isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={`block text-xs font-bold mb-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>開始日</label>
                  <input
                    type="date"
                    required
                    value={dateInput}
                    onChange={(e) => setDateInput(e.target.value)}
                    className={`w-full px-3 py-2 rounded-xl border text-xs font-medium focus:outline-none focus:ring-1 focus:ring-amber-500 ${
                      isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  />
                </div>
                <div>
                  <label className={`block text-xs font-bold mb-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>終了日（複数日またぎ用）</label>
                  <input
                    type="date"
                    value={endDateInput}
                    onChange={(e) => setEndDateInput(e.target.value)}
                    className={`w-full px-3 py-2 rounded-xl border text-xs font-medium focus:outline-none focus:ring-1 focus:ring-amber-500 ${
                      isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={`block text-xs font-bold mb-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>開始時間</label>
                  <input
                    type="time"
                    value={startTimeInput}
                    onChange={(e) => setStartTimeInput(e.target.value)}
                    className={`w-full px-3 py-2 rounded-xl border text-xs font-medium focus:outline-none focus:ring-1 focus:ring-amber-500 ${
                      isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  />
                </div>
                <div>
                  <label className={`block text-xs font-bold mb-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>終了時間</label>
                  <input
                    type="time"
                    value={endTimeInput}
                    onChange={(e) => setEndTimeInput(e.target.value)}
                    className={`w-full px-3 py-2 rounded-xl border text-xs font-medium focus:outline-none focus:ring-1 focus:ring-amber-500 ${
                      isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  />
                </div>
              </div>

              {members.length > 0 && (
                <div>
                  <label className={`block text-xs font-bold mb-1.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>担当メンバー</label>
                  <div className="flex flex-wrap gap-1.5">
                    {members.map(m => {
                      const isSelected = selectedMemberIds.includes(m.id);
                      return (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => {
                            if (isSelected) setSelectedMemberIds(selectedMemberIds.filter(id => id !== m.id));
                            else setSelectedMemberIds([...selectedMemberIds, m.id]);
                          }}
                          style={{
                            borderColor: m.color || '#3b82f6',
                            backgroundColor: isSelected ? (m.color || '#3b82f6') : undefined,
                            color: isSelected ? '#ffffff' : (m.color || '#3b82f6')
                          }}
                          className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-all cursor-pointer flex items-center gap-1 shadow-2xs`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-white' : ''}`} style={{ backgroundColor: isSelected ? '#fff' : (m.color || '#3b82f6') }} />
                          {m.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <div>
                <label className={`block text-xs font-bold mb-1.5 flex items-center gap-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  <TagIcon className="w-3.5 h-3.5 text-blue-500" /> タグを選択（複数選択可・最初が優先カラー）
                </label>
                {tags.length === 0 ? (
                  <p className={`text-[10px] italic ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>設定画面でタグが作成されていません</p>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {tags.map(t => {
                      const isSelected = selectedTagNames.includes(t.name);
                      return (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => {
                            if (isSelected) {
                              setSelectedTagNames(selectedTagNames.filter(name => name !== t.name));
                            } else {
                              setSelectedTagNames([...selectedTagNames, t.name]);
                            }
                          }}
                          style={{
                            backgroundColor: isSelected ? t.color : undefined,
                            borderColor: t.color,
                            color: isSelected ? '#ffffff' : t.color
                          }}
                          className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs`}
                        >
                          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: isSelected ? '#fff' : t.color }} />
                          {t.name}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              <div>
                <label className={`block text-xs font-bold mb-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>詳細・メモ（任意）</label>
                <textarea
                  rows={2}
                  value={descInput}
                  onChange={(e) => setDescInput(e.target.value)}
                  placeholder="会議の議題や詳細メモを入力..."
                  className={`w-full px-3 py-2 rounded-xl border text-xs font-medium focus:outline-none focus:ring-1 focus:ring-amber-500 ${
                    isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                {editingEventId ? (
                  <button
                    type="button"
                    onClick={() => handleDeleteEvent(editingEventId)}
                    className="px-4 py-2 bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5"
                  >
                    <Trash2 className="w-4 h-4" /> 削除
                  </button>
                ) : <div />}
                
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                      isDark ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    キャンセル
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-xs flex items-center gap-1.5"
                  >
                    <Check className="w-4 h-4" /> {editingEventId ? '更新する' : '追加する'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}