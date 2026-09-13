// src/components/TimelineView.tsx
import React, { useRef, useEffect, useState, useMemo, useCallback } from 'react';
import { Calendar as CalendarIcon, RotateCcw, Settings, X, Edit3, Tag as TagIcon, Plus, Link as LinkIcon, Trash2, Eye, EyeOff } from 'lucide-react';
import type { TagItem, LineStyle } from './SettingsView';

const getTodayString = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getStrokeDasharray = (style?: LineStyle) => {
  switch (style) {
    case 'dashed':
      return '6 4';
    case 'dotted':
      return '2 3';
    case 'solid':
    default:
      return undefined;
  }
};

const DAY_WIDTH = 80;
const TASK_HEIGHT = 36;
const TASK_GAP = 8;

export type MemberItem = {
  id: string;
  name: string;
  role: string;
  isDeleted?: boolean;
};

export type TaskItem = {
  id: string;
  memberId: string;
  title: string;
  startDate: string;
  endDate: string;
  color?: string;
  tagId?: string;
  memo?: string;
  parentIds?: string[];
  progress?: number; // 0 - 100
  updatedAt?: string;
  isDeleted?: boolean; // 論理削除フラグ
};

type TimelineViewProps = {
  leftOffsetDays: number;
  rangeYears: number;
  onOpenSettings: () => void;
  tags: TagItem[];
  defaultTaskColor: string;
  colorPriority: 'tag' | 'task';
  tasks: TaskItem[];
  setTasks: React.Dispatch<React.SetStateAction<TaskItem[]>>;
  members: MemberItem[]; // ★ 親から渡されるメンバー一覧
  dependencyLineColor?: string;
  dependencyLineStyle?: LineStyle;
  // 個人設定
  showOverlapBorder: boolean;
  setShowOverlapBorder: React.Dispatch<React.SetStateAction<boolean>>;
  theme?: 'light' | 'dark';
  // 管理者設定
  dependencyMarginType: 'strict' | 'same_day' | 'fully_allowed' | 'custom';
  dependencyCustomDays: number;
  overlapCondition: 'all' | 'tag_match';
};

export default function TimelineView({
  leftOffsetDays,
  rangeYears,
  onOpenSettings,
  tags,
  defaultTaskColor,
  colorPriority,
  tasks,
  setTasks,
  members,
  dependencyLineColor = '#94a3b8',
  dependencyLineStyle = 'solid',
  showOverlapBorder,
  setShowOverlapBorder,
  theme = 'light',
  dependencyMarginType,
  dependencyCustomDays,
  overlapCondition,
}: TimelineViewProps) {
  const isDark = theme === 'dark';

  const scrollRef = useRef<HTMLDivElement>(null);
  const timelineBodyRef = useRef<HTMLDivElement>(null);

  const [selectedDate, setSelectedDate] = useState(getTodayString());
  const [visibleYear, setVisibleYear] = useState(new Date().getFullYear());
  const [scrollLeftPos, setScrollLeftPos] = useState(0);

  const [editingTask, setEditingTask] = useState<TaskItem | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  // 矢印作成（接続）用の状態
  const [connectingFromId, setConnectingFromId] = useState<string | null>(null);
  const [dragMousePos, setDragMousePos] = useState<{ x: number; y: number } | null>(null);

  // タスク移動・リサイズ用の状態
  const [draggingTask, setDraggingTask] = useState<{
    taskId: string;
    type: 'move' | 'resize-left' | 'resize-right';
    startX: number;
    initialStartCol: number;
    initialSpan: number;
    hasMoved: boolean;
  } | null>(null);

  // ★ 削除されていないアクティブなメンバーのみを抽出
  const activeMembers = useMemo(() => {
    return members.filter((m) => !m.isDeleted);
  }, [members]);

  // 有効な（削除されていない）タスクのみをフィルタリング
  const activeTasks = useMemo(() => {
    return tasks.filter((t) => !t.isDeleted);
  }, [tasks]);

  const { dates, todayIndex, dateMap } = useMemo(() => {
    const generatedDates: Array<{
      dateStr: string;
      year: number;
      month: number;
      day: number;
      label: string;
      isToday: boolean;
      index: number;
    }> = [];
    const map = new Map<string, number>();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const totalDays = rangeYears * 365;
    let tIndex = totalDays;

    for (let i = -totalDays; i <= totalDays; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      
      const year = d.getFullYear();
      const month = d.getMonth() + 1;
      const day = d.getDate();
      const monthStr = String(month).padStart(2, '0');
      const dayStr = String(day).padStart(2, '0');
      const dateStr = `${year}-${monthStr}-${dayStr}`;
      
      const currIdx = generatedDates.length;
      if (i === 0) tIndex = currIdx;

      map.set(dateStr, currIdx);

      generatedDates.push({
        dateStr,
        year,
        month,
        day,
        label: `${month}/${day}`,
        isToday: i === 0,
        index: currIdx,
      });
    }

    return { dates: generatedDates, todayIndex: tIndex, dateMap: map };
  }, [rangeYears]);

  const handleScroll = useCallback(() => {
    if (!scrollRef.current) return;
    const scrollLeft = scrollRef.current.scrollLeft;
    setScrollLeftPos(scrollLeft);
    const visibleIndex = Math.floor((scrollLeft + DAY_WIDTH) / DAY_WIDTH);
    if (dates[visibleIndex]) {
      setVisibleYear(dates[visibleIndex].year);
    }
  }, [dates]);

  const scrollToDayIndex = (index: number, behavior: ScrollBehavior = 'smooth') => {
    if (scrollRef.current) {
      const targetIndex = Math.max(0, index - leftOffsetDays);
      scrollRef.current.scrollTo({
        left: targetIndex * DAY_WIDTH,
        behavior: behavior,
      });
    }
  };

  useEffect(() => {
    scrollToDayIndex(todayIndex, 'instant');
  }, [todayIndex, leftOffsetDays]);

  const handleDatePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = e.target.value;
    setSelectedDate(picked);
    const targetIndex = dates.findIndex((d) => d.dateStr === picked);
    if (targetIndex !== -1) scrollToDayIndex(targetIndex, 'smooth');
  };

  const handleTodayClick = () => {
    const todayStr = getTodayString();
    setSelectedDate(todayStr);
    scrollToDayIndex(todayIndex, 'smooth');
  };

  const handleWheel = (e: React.WheelEvent) => {
    if (scrollRef.current) {
      scrollRef.current.scrollLeft += e.deltaY;
    }
  };

  const getTaskColor = (task: TaskItem): string => {
    const tag = tags.find((t) => t.id === task.tagId);
    const tagColor = tag?.color;
    const taskColor = task.color;

    if (colorPriority === 'tag') {
      return tagColor || taskColor || defaultTaskColor;
    } else {
      return taskColor || tagColor || defaultTaskColor;
    }
  };

  const handleCellDoubleClick = (memberId: string, dateStr: string) => {
    setEditingTask({
      id: `task-${Date.now()}`,
      memberId: memberId,
      title: '',
      startDate: dateStr,
      endDate: dateStr,
      color: defaultTaskColor,
      memo: '',
      parentIds: [],
      progress: 0,
      updatedAt: new Date().toISOString(),
    });
    setIsCreating(true);
  };

  const handleOpenNewTaskModal = () => {
    const todayStr = getTodayString();
    const defaultMemberId = activeMembers[0]?.id || '';
    setEditingTask({
      id: `task-${Date.now()}`,
      memberId: defaultMemberId,
      title: '',
      startDate: todayStr,
      endDate: todayStr,
      color: defaultTaskColor,
      memo: '',
      parentIds: [],
      progress: 0,
      updatedAt: new Date().toISOString(),
    });
    setIsCreating(true);
  };

  // レーン計算 ＆ 重複チェック ＆ 依存関係矛盾チェック（activeMembersとactiveTasksを使用）
  const { processedMemberTasks, totalContainerHeight } = useMemo(() => {
    const memberTasksResult: Record<string, Array<TaskItem & { startCol: number; span: number; lane: number; isOverlapped: boolean; hasDependencyError: boolean; yPos: number; xStart: number; xEnd: number }>> = {};
    let currentY = 0;

    activeMembers.forEach((member) => {
      const mTasks = activeTasks
        .filter((t) => t.memberId === member.id)
        .map((t) => {
          const sIdx = dateMap.get(t.startDate) ?? -1;
          const eIdx = dateMap.get(t.endDate) ?? -1;
          const startCol = sIdx !== -1 ? sIdx : 0;
          const span = (eIdx !== -1 && sIdx !== -1) ? Math.max(1, eIdx - sIdx + 1) : 1;
          const xStart = startCol * DAY_WIDTH + 4;
          const xEnd = (startCol + span) * DAY_WIDTH - 4;
          return { ...t, startCol, span, lane: 0, isOverlapped: false, hasDependencyError: false, yPos: 0, xStart, xEnd };
        })
        .sort((a, b) => a.startCol - b.startCol);

      const lanes: number[] = [];

      mTasks.forEach((task, i) => {
        let assignedLane = -1;
        let isOverlapped = false;

        // ① タスク重複判定
        mTasks.forEach((other, j) => {
          if (i !== j) {
            const overlap = !(task.startCol + task.span <= other.startCol || task.startCol >= other.startCol + other.span);
            if (overlap) {
              if (overlapCondition === 'all') {
                isOverlapped = true;
              } else if (overlapCondition === 'tag_match') {
                if (task.tagId && task.tagId === other.tagId) {
                  isOverlapped = true;
                }
              }
            }
          }
        });
        task.isOverlapped = isOverlapped;

        // ② 依存関係の矛盾判定
        if (task.parentIds && task.parentIds.length > 0) {
          const taskStartIdx = dateMap.get(task.startDate) ?? 0;
          for (const parentId of task.parentIds) {
            const parentTask = activeTasks.find((p) => p.id === parentId);
            if (parentTask) {
              const parentEndIdx = dateMap.get(parentTask.endDate) ?? 0;

              if (dependencyMarginType === 'strict') {
                if (taskStartIdx <= parentEndIdx) {
                  task.hasDependencyError = true;
                  break;
                }
              } else if (dependencyMarginType === 'same_day') {
                if (taskStartIdx < parentEndIdx) {
                  task.hasDependencyError = true;
                  break;
                }
              } else if (dependencyMarginType === 'fully_allowed') {
                task.hasDependencyError = false;
              } else if (dependencyMarginType === 'custom') {
                if (taskStartIdx < parentEndIdx - (dependencyCustomDays - 1)) {
                  task.hasDependencyError = true;
                  break;
                }
              }
            }
          }
        }

        for (let l = 0; l < lanes.length; l++) {
          if (lanes[l] <= task.startCol) {
            assignedLane = l;
            lanes[l] = task.startCol + task.span;
            break;
          }
        }

        if (assignedLane === -1) {
          assignedLane = lanes.length;
          lanes.push(task.startCol + task.span);
        }

        task.lane = assignedLane;
        task.yPos = currentY + 12 + task.lane * (TASK_HEIGHT + TASK_GAP);
      });

      const maxLane = mTasks.reduce((max, t) => Math.max(max, t.lane), 0);
      const rowHeight = Math.max(80, 24 + (maxLane + 1) * (TASK_HEIGHT + TASK_GAP));
      currentY += rowHeight;

      memberTasksResult[member.id] = mTasks;
    });

    return { processedMemberTasks: memberTasksResult, totalContainerHeight: currentY };
  }, [activeMembers, activeTasks, dateMap, overlapCondition, dependencyMarginType, dependencyCustomDays]);

  // タスク座標マップ
  const allProcessedTasksMap = useMemo(() => {
    const map = new Map<string, { xStart: number; xEnd: number; yPos: number; startCol: number; span: number; hasDependencyError: boolean }>();
    Object.values(processedMemberTasks).flat().forEach((t) => {
      map.set(t.id, { xStart: t.xStart, xEnd: t.xEnd, yPos: t.yPos, startCol: t.startCol, span: t.span, hasDependencyError: t.hasDependencyError });
    });
    return map;
  }, [processedMemberTasks]);

  // 矢印パス計算
  const arrows = useMemo(() => {
    const list: Array<{ id: string; parentId: string; targetTaskId: string; path: string; hasError: boolean }> = [];

    activeTasks.forEach((task) => {
      if (!task.parentIds || task.parentIds.length === 0) return;

      task.parentIds.forEach((parentId) => {
        const parent = allProcessedTasksMap.get(parentId);
        const current = allProcessedTasksMap.get(task.id);

        if (parent && current) {
          const x1 = parent.xEnd;
          const y1 = parent.yPos + TASK_HEIGHT / 2;
          const x2 = current.xStart;
          const y2 = current.yPos + TASK_HEIGHT / 2;

          const dx = Math.max(20, Math.abs(x2 - x1) / 2);
          const path = `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`;

          const parentTask = activeTasks.find(t => t.id === parentId);
          let hasError = false;

          if (parentTask) {
            const parentEndIdx = dateMap.get(parentTask.endDate) ?? 0;
            const taskStartIdx = dateMap.get(task.startDate) ?? 0;

            if (dependencyMarginType === 'strict') {
              if (taskStartIdx <= parentEndIdx) hasError = true;
            } else if (dependencyMarginType === 'same_day') {
              if (taskStartIdx < parentEndIdx) hasError = true;
            } else if (dependencyMarginType === 'fully_allowed') {
              hasError = false;
            } else if (dependencyMarginType === 'custom') {
              if (taskStartIdx < parentEndIdx - (dependencyCustomDays - 1)) hasError = true;
            }
          }

          list.push({ id: `${parentId}-${task.id}`, parentId, targetTaskId: task.id, path, hasError });
        }
      });
    });

    return list;
  }, [activeTasks, allProcessedTasksMap, dateMap, dependencyMarginType, dependencyCustomDays]);

  const handleStartConnect = (e: React.MouseEvent, taskId: string) => {
    e.stopPropagation();
    e.preventDefault();
    setConnectingFromId(taskId);
  };

  const handleTaskMouseDown = (e: React.MouseEvent, task: TaskItem, type: 'move' | 'resize-left' | 'resize-right') => {
    if (connectingFromId) return;
    e.stopPropagation();
    const taskInfo = allProcessedTasksMap.get(task.id);
    if (!taskInfo) return;

    setDraggingTask({
      taskId: task.id,
      type,
      startX: e.clientX,
      initialStartCol: taskInfo.startCol,
      initialSpan: taskInfo.span,
      hasMoved: false,
    });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (connectingFromId && timelineBodyRef.current) {
      const rect = timelineBodyRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left + (scrollRef.current?.scrollLeft || 0) - 160;
      const y = e.clientY - rect.top;
      setDragMousePos({ x, y });
      return;
    }

    if (draggingTask) {
      const deltaX = e.clientX - draggingTask.startX;
      if (Math.abs(deltaX) > 4) {
        setDraggingTask((prev) => (prev ? { ...prev, hasMoved: true } : null));
      }

      const deltaCols = Math.round(deltaX / DAY_WIDTH);
      const now = new Date().toISOString();

      setTasks((prev) =>
        prev.map((t) => {
          if (t.id !== draggingTask.taskId) return t;

          let newStartCol = draggingTask.initialStartCol;
          let newSpan = draggingTask.initialSpan;

          if (draggingTask.type === 'move') {
            newStartCol = Math.max(0, draggingTask.initialStartCol + deltaCols);
          } else if (draggingTask.type === 'resize-left') {
            const maxDelta = draggingTask.initialSpan - 1;
            const appliedDelta = Math.min(deltaCols, maxDelta);
            newStartCol = Math.max(0, draggingTask.initialStartCol + appliedDelta);
            newSpan = draggingTask.initialSpan - (newStartCol - draggingTask.initialStartCol);
          } else if (draggingTask.type === 'resize-right') {
            newSpan = Math.max(1, draggingTask.initialSpan + deltaCols);
          }

          const newStartObj = dates[newStartCol];
          const newEndObj = dates[newStartCol + newSpan - 1];

          if (newStartObj && newEndObj) {
            return {
              ...t,
              startDate: newStartObj.dateStr,
              endDate: newEndObj.dateStr,
              updatedAt: now,
            };
          }

          return t;
        })
      );
    }
  };

  const resetConnectingState = () => {
    setDragMousePos(null);
    setTimeout(() => {
      setConnectingFromId(null);
    }, 100);
  };

  const handleMouseUp = () => {
    if (connectingFromId) {
      resetConnectingState();
    }
    setTimeout(() => {
      setDraggingTask(null);
    }, 50);
  };

  const handleDropConnect = (e: React.MouseEvent, targetTaskId: string) => {
    e.stopPropagation();
    if (connectingFromId && connectingFromId !== targetTaskId) {
      const now = new Date().toISOString();
      setTasks((prev) =>
        prev.map((t) => {
          if (t.id === targetTaskId) {
            const currentParents = t.parentIds || [];
            if (!currentParents.includes(connectingFromId)) {
              return { ...t, parentIds: [...currentParents, connectingFromId], updatedAt: now };
            }
          }
          return t;
        })
      );
    }
    resetConnectingState();
  };

  const handleRemoveSingleConnection = (parentId: string, targetTaskId: string) => {
    if (window.confirm('この矢印の接続を解除しますか？')) {
      const now = new Date().toISOString();
      setTasks((prev) =>
        prev.map((t) => {
          if (t.id === targetTaskId) {
            return {
              ...t,
              parentIds: (t.parentIds || []).filter((id) => id !== parentId),
              updatedAt: now,
            };
          }
          return t;
        })
      );
    }
  };

  const handleSaveTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTask) return;

    const now = new Date().toISOString();
    const taskToSave = { ...editingTask, updatedAt: now };

    if (isCreating) {
      setTasks((prev) => [...prev, taskToSave]);
    } else {
      setTasks((prev) => prev.map((t) => (t.id === taskToSave.id ? taskToSave : t)));
    }

    setEditingTask(null);
    setIsCreating(false);
  };

  const handleDeleteTask = () => {
    if (!editingTask) return;
    const now = new Date().toISOString();
    setTasks((prev) =>
      prev.map((t) =>
        t.id === editingTask.id
          ? { ...t, isDeleted: true, updatedAt: now }
          : t
      )
    );
    setEditingTask(null);
    setIsCreating(false);
  };

  const previewPath = useMemo(() => {
    if (!connectingFromId || !dragMousePos) return null;
    const source = allProcessedTasksMap.get(connectingFromId);
    if (!source) return null;

    const x1 = source.xEnd;
    const y1 = source.yPos + TASK_HEIGHT / 2;
    const x2 = dragMousePos.x;
    const y2 = dragMousePos.y;

    const dx = Math.max(20, Math.abs(x2 - x1) / 2);
    return `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`;
  }, [connectingFromId, dragMousePos, allProcessedTasksMap]);

  return (
    <div 
      className={`h-full rounded-2xl shadow-xs border flex flex-col overflow-hidden relative select-none transition-colors ${
        isDark ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-800'
      }`}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
    >
      {/* ツールバー */}
      <div className={`p-4 border-b flex items-center justify-between transition-colors ${
        isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-slate-50/50 border-slate-200'
      }`}>
        <div className="flex items-center gap-3">
          <button
            onClick={handleTodayClick}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition-colors shadow-xs cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Today
          </button>

          <div className={`relative flex items-center border rounded-lg px-2 py-1 text-xs font-medium ${
            isDark ? 'bg-slate-800 border-slate-700 text-slate-300' : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
          }`}>
            <CalendarIcon className="w-3.5 h-3.5 text-slate-400 mr-2 pointer-events-none" />
            <input
              type="date"
              value={selectedDate}
              onChange={handleDatePick}
              className="bg-transparent outline-none cursor-pointer text-xs font-bold text-inherit"
            />
          </div>

          <button
            onClick={handleOpenNewTaskModal}
            className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition-colors shadow-xs cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            タスク追加
          </button>

          <button
            onClick={() => setShowOverlapBorder(!showOverlapBorder)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-colors border cursor-pointer ${
              showOverlapBorder 
                ? isDark 
                  ? 'bg-amber-950/50 border-amber-800 text-amber-300 hover:bg-amber-900/50' 
                  : 'bg-amber-50 border-amber-300 text-amber-700 hover:bg-amber-100'
                : isDark 
                  ? 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700' 
                  : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-100'
            }`}
            title="重複タスクの枠線強調表示の切り替え"
          >
            {showOverlapBorder ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
            重複枠線: {showOverlapBorder ? 'ON' : 'OFF'}
          </button>
        </div>

        <div className={`text-lg font-black tracking-wider ${isDark ? 'text-white' : 'text-slate-800'}`}>
          {visibleYear}年
        </div>

        <button
          onClick={onOpenSettings}
          className={`p-2 rounded-lg transition-colors cursor-pointer ${
            isDark ? 'text-slate-400 hover:bg-slate-800 hover:text-slate-200' : 'text-slate-500 hover:bg-slate-200'
          }`}
          title="Setting画面へ"
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>

      {/* スクロールエリア */}
      <div 
        ref={scrollRef}
        onWheel={handleWheel}
        onScroll={handleScroll}
        className="overflow-x-auto flex-1 snap-x snap-mandatory scrollbar-thin"
      >
        <div 
          style={{ width: `${160 + dates.length * DAY_WIDTH}px` }} 
          className="h-full flex flex-col"
        >
          {/* ヘッダー */}
          <div className={`sticky top-0 z-20 border-b ${
            isDark ? 'bg-slate-900 border-slate-800' : 'bg-slate-50 border-slate-200'
          }`}>
            <div className="flex">
              <div className={`w-40 p-3 font-bold text-xs border-r flex-shrink-0 uppercase tracking-wider sticky left-0 z-20 ${
                isDark ? 'bg-slate-900 border-slate-800 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-400'
              }`}>
                Date
              </div>
              <div className="flex-1 flex">
                {dates.map((item) => (
                  <div 
                    key={item.dateStr} 
                    className={`w-20 p-2.5 text-center text-xs font-bold border-r flex-shrink-0 snap-start transition-colors ${
                      isDark ? 'border-slate-800' : 'border-slate-200'
                    } ${
                      item.isToday 
                        ? isDark 
                          ? 'bg-blue-950/60 text-blue-400 border-b-2 border-b-blue-500' 
                          : 'bg-blue-50 text-blue-600 border-b-2 border-b-blue-600' 
                        : isDark ? 'text-slate-300' : 'text-slate-600'
                    }`}
                  >
                    {item.label}
                    {item.isToday && <span className="block text-[9px] font-normal text-blue-400">今日</span>}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* グリッド本体 */}
          <div ref={timelineBodyRef} className={`divide-y flex-1 relative ${
            isDark ? 'divide-slate-800' : 'divide-slate-200'
          }`}>
            
            {/* SVG 矢印描画レイヤー */}
            <svg 
              className="absolute top-0 left-40 pointer-events-none z-10"
              style={{ width: `${dates.length * DAY_WIDTH}px`, height: `${totalContainerHeight}px` }}
            >
              <defs>
                <marker id="arrowhead" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
                  <polygon points="0 0, 6 3, 0 6" fill={isDark ? '#64748b' : dependencyLineColor} />
                </marker>
                <marker id="arrowhead-error" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
                  <polygon points="0 0, 6 3, 0 6" fill="#ef4444" />
                </marker>
                <marker id="arrowhead-drag" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
                  <polygon points="0 0, 8 3, 0 6" fill="#ef4444" />
                </marker>
              </defs>

              {arrows.map((arrow) => (
                <path
                  key={arrow.id}
                  d={arrow.path}
                  fill="none"
                  stroke={arrow.hasError ? '#ef4444' : (isDark ? '#64748b' : dependencyLineColor)}
                  strokeWidth="2.5"
                  strokeDasharray={getStrokeDasharray(dependencyLineStyle)}
                  markerEnd={arrow.hasError ? 'url(#arrowhead-error)' : 'url(#arrowhead)'}
                  className="pointer-events-auto cursor-pointer hover:stroke-rose-600 transition-colors"
                  onClick={() => handleRemoveSingleConnection(arrow.parentId, arrow.targetTaskId)}
                />
              ))}

              {previewPath && (
                <path
                  d={previewPath}
                  fill="none"
                  stroke="#ef4444"
                  strokeWidth="2"
                  strokeDasharray="3 3"
                  markerEnd="url(#arrowhead-drag)"
                />
              )}
            </svg>

            {activeMembers.map((member) => {
              const mTasks = processedMemberTasks[member.id] || [];
              const maxLane = mTasks.reduce((max, t) => Math.max(max, t.lane), 0);
              const rowHeight = Math.max(80, 24 + (maxLane + 1) * (TASK_HEIGHT + TASK_GAP));

              return (
                <div 
                  key={member.id} 
                  style={{ height: `${rowHeight}px` }}
                  className={`flex items-start transition-colors relative ${
                    isDark ? 'hover:bg-slate-800/30' : 'hover:bg-slate-50/50'
                  }`}
                >
                  <div className={`w-40 p-4 font-semibold text-sm border-r flex-shrink-0 h-full flex flex-col justify-center sticky left-0 z-20 ${
                    isDark ? 'bg-slate-900 border-slate-800 text-slate-200' : 'bg-white border-slate-200 text-slate-700 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]'
                  }`}>
                    <span>{member.name}</span>
                    <span className={`text-[10px] font-normal ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{member.role}</span>
                  </div>

                  <div className="flex-1 flex h-full relative">
                    {dates.map((item) => (
                      <div 
                        key={item.dateStr} 
                        onDoubleClick={() => handleCellDoubleClick(member.id, item.dateStr)}
                        className={`w-20 h-full border-r flex-shrink-0 snap-start cursor-pointer transition-colors ${
                          isDark 
                            ? 'border-slate-800/60 hover:bg-slate-800/60' 
                            : 'border-slate-100 hover:bg-slate-100/50'
                        } ${
                          item.isToday 
                            ? isDark ? 'bg-blue-950/30' : 'bg-blue-50/20' 
                            : ''
                        }`} 
                        title="ダブルクリックでタスク追加"
                      />
                    ))}

                    {mTasks.map((task) => {
                      const bgStyleColor = getTaskColor(task);
                      const hasParents = task.parentIds && task.parentIds.length > 0;
                      const progress = task.progress || 0;

                      const taskWidth = task.xEnd - task.xStart;
                      const textPaddingLeft = Math.max(
                        0,
                        Math.min(scrollLeftPos - task.xStart + 16, taskWidth - 60)
                      );

                      const isConnecting = connectingFromId !== null;
                      const isConnectingSelf = connectingFromId === task.id;
                      const isOverriddenBorder = showOverlapBorder && task.isOverlapped;

                      return (
                        <div
                          key={task.id}
                          className="absolute group cursor-pointer select-none"
                          style={{
                            left: `${task.xStart}px`,
                            width: `${taskWidth}px`,
                            height: `${TASK_HEIGHT}px`,
                            top: `${12 + task.lane * (TASK_HEIGHT + TASK_GAP)}px`,
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (draggingTask?.hasMoved || isConnecting) return;
                            setEditingTask(task);
                            setIsCreating(false);
                          }}
                          onMouseUp={(e) => {
                            if (isConnecting && !isConnectingSelf) {
                              handleDropConnect(e, task.id);
                            }
                          }}
                        >
                          <div
                            onMouseDown={(e) => handleTaskMouseDown(e, task, 'move')}
                            className={`w-full h-full rounded-xl text-white text-xs font-bold flex items-center justify-between shadow-md transition-all overflow-hidden ${
                              isConnecting
                                ? isConnectingSelf
                                  ? 'opacity-70 cursor-grabbing'
                                  : 'hover:ring-2 hover:ring-blue-500 hover:ring-offset-1 cursor-crosshair'
                                : 'cursor-grab active:cursor-grabbing hover:brightness-105 z-10'
                            } ${isOverriddenBorder ? 'border-2 border-amber-400 ring-2 ring-amber-300' : 'border border-white/20'}`}
                            style={{
                              backgroundColor: bgStyleColor,
                            }}
                          >
                            {progress > 0 && (
                              <div 
                                className="absolute inset-y-0 left-0 bg-black/20 pointer-events-none transition-all"
                                style={{ width: `${progress}%` }}
                              />
                            )}

                            {!isConnecting && (
                              <div
                                onMouseDown={(e) => handleTaskMouseDown(e, task, 'resize-left')}
                                className="absolute left-0 top-0 bottom-0 w-4 cursor-ew-resize hover:bg-white/30 z-30 flex items-center justify-center rounded-l-xl group/handle"
                                title="ドラッグで開始日を調整"
                              >
                                <div className="w-1 h-3.5 bg-white/60 rounded-full group-hover/handle:bg-white transition-colors" />
                              </div>
                            )}

                            <div 
                              className="flex items-center gap-1.5 min-w-0 px-4 pointer-events-none transition-transform relative z-10"
                              style={{ transform: `translateX(${textPaddingLeft}px)` }}
                            >
                              {showOverlapBorder && task.isOverlapped && (
                                <span title="他タスクと期間が重複しています">⚠️</span>
                              )}
                              {task.hasDependencyError && (
                                <span title="前工程タスクの終了日と矛盾しています">⛔</span>
                              )}
                              {hasParents && <LinkIcon className="w-3 h-3 text-white/80 shrink-0" />}
                              
                              <span className="truncate whitespace-nowrap font-bold">{task.title}</span>

                              <span className="text-[10px] bg-black/30 px-1.5 py-0.5 rounded text-white/90 font-mono shrink-0">
                                {progress}%
                              </span>

                              {task.memo && (
                                <span className="truncate whitespace-nowrap text-[11px] text-white/75 font-normal pl-1.5 border-l border-white/30">
                                  {task.memo}
                                </span>
                              )}
                            </div>

                            {!isConnecting && (
                              <div
                                onMouseDown={(e) => handleTaskMouseDown(e, task, 'resize-right')}
                                className="absolute right-0 top-0 bottom-0 w-4 cursor-ew-resize hover:bg-white/30 z-30 flex items-center justify-center rounded-r-xl group/handle"
                                title="ドラッグで終了日を調整"
                              >
                                <div className="w-1 h-3.5 bg-white/60 rounded-full group-hover/handle:bg-white transition-colors" />
                              </div>
                            )}
                          </div>

                          <div
                            onMouseDown={(e) => handleStartConnect(e, task.id)}
                            className="absolute -right-4 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-white border-2 border-blue-600 shadow-md hover:scale-125 transition-all opacity-0 group-hover:opacity-100 flex items-center justify-center cursor-crosshair z-30"
                            title="ドラッグして他のタスクへ接続"
                          >
                            <div className="w-1.5 h-1.5 rounded-full bg-blue-600 pointer-events-none" />
                          </div>
                        </div>
                      );
                    })}
                  </div>

                </div>
              );
            })}
          </div>

        </div>
      </div>

      {/* 編集モーダル */}
      {editingTask && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <form 
            onSubmit={handleSaveTask}
            className={`w-full max-w-md p-6 rounded-2xl shadow-2xl flex flex-col gap-4 border transition-colors ${
              isDark ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-800'
            }`}
          >
            <div className={`flex items-center justify-between border-b pb-3 ${
              isDark ? 'border-slate-800' : 'border-slate-100'
            }`}>
              <div className="flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-blue-500" />
                <h3 className="font-bold text-base">
                  {isCreating ? '新規タスク追加' : 'タスク詳細・編集'}
                </h3>
              </div>
              <button 
                type="button"
                onClick={() => setEditingTask(null)}
                className={`p-1 rounded-lg transition-colors cursor-pointer ${
                  isDark ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'
                }`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <label className={`block text-xs font-bold mb-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>担当メンバー</label>
              <select
                value={editingTask.memberId}
                onChange={(e) => setEditingTask({ ...editingTask, memberId: e.target.value })}
                className={`w-full px-3 py-2 border rounded-xl font-bold text-xs cursor-pointer ${
                  isDark ? 'bg-slate-800 border-slate-700 text-slate-100' : 'bg-white border-slate-300 text-slate-800'
                }`}
              >
                {activeMembers.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} ({m.role})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className={`block text-xs font-bold mb-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>タスク名</label>
              <input
                type="text"
                required
                placeholder="タスク名を入力..."
                value={editingTask.title}
                onChange={(e) => setEditingTask({ ...editingTask, title: e.target.value })}
                className={`w-full px-3 py-2 border rounded-xl font-bold text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  isDark ? 'bg-slate-800 border-slate-700 text-slate-100' : 'bg-white border-slate-300 text-slate-800'
                }`}
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className={`text-xs font-bold ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>進捗率</label>
                <span className="text-xs font-mono font-bold text-blue-500">{editingTask.progress ?? 0}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                step="5"
                value={editingTask.progress ?? 0}
                onChange={(e) => setEditingTask({ ...editingTask, progress: Number(e.target.value) })}
                className="w-full accent-blue-600 cursor-pointer"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={`block text-xs font-bold mb-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>タスク指定カラー</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={editingTask.color || defaultTaskColor}
                    onChange={(e) => setEditingTask({ ...editingTask, color: e.target.value })}
                    className={`w-8 h-8 rounded-lg border cursor-pointer p-0.5 ${
                      isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-300'
                    }`}
                  />
                  <span className={`text-xs font-mono ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    {editingTask.color || defaultTaskColor}
                  </span>
                </div>
              </div>

              <div>
                <label className={`block text-xs font-bold mb-1 flex items-center gap-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                  <TagIcon className="w-3 h-3" />
                  割り当てタグ
                </label>
                <select
                  value={editingTask.tagId || ''}
                  onChange={(e) => setEditingTask({ ...editingTask, tagId: e.target.value || undefined })}
                  className={`w-full px-2.5 py-1.5 border rounded-xl text-xs font-semibold cursor-pointer ${
                    isDark ? 'bg-slate-800 border-slate-700 text-slate-100' : 'bg-white border-slate-300 text-slate-700'
                  }`}
                >
                  <option value="">なし（指定なし）</option>
                  {tags.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={`block text-xs font-bold mb-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>開始日</label>
                <input
                  type="date"
                  required
                  value={editingTask.startDate}
                  onChange={(e) => setEditingTask({ ...editingTask, startDate: e.target.value })}
                  className={`w-full px-2.5 py-1.5 border rounded-xl text-xs font-semibold ${
                    isDark ? 'bg-slate-800 border-slate-700 text-slate-100' : 'bg-white border-slate-300 text-slate-700'
                  }`}
                />
              </div>
              <div>
                <label className={`block text-xs font-bold mb-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>終了日</label>
                <input
                  type="date"
                  required
                  value={editingTask.endDate}
                  onChange={(e) => setEditingTask({ ...editingTask, endDate: e.target.value })}
                  className={`w-full px-2.5 py-1.5 border rounded-xl text-xs font-semibold ${
                    isDark ? 'bg-slate-800 border-slate-700 text-slate-100' : 'bg-white border-slate-300 text-slate-700'
                  }`}
                />
              </div>
            </div>

            <div>
              <label className={`block text-xs font-bold mb-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>メモ</label>
              <textarea
                rows={3}
                placeholder="タスクのメモ"
                value={editingTask.memo || ''}
                onChange={(e) => setEditingTask({ ...editingTask, memo: e.target.value })}
                className={`w-full p-3 border rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  isDark ? 'bg-slate-800 border-slate-700 text-slate-100' : 'bg-white border-slate-300 text-slate-700'
                }`}
              />
            </div>

            {editingTask.parentIds && editingTask.parentIds.length > 0 && (
              <div className={`flex flex-col gap-2 p-3 border rounded-xl text-xs ${
                isDark ? 'bg-slate-800/60 border-slate-700' : 'bg-slate-50 border-slate-200'
              }`}>
                <div className="flex items-center justify-between">
                  <span className={`font-bold ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>前工程タスク（インプット: {editingTask.parentIds.length}件）</span>
                  <button
                    type="button"
                    onClick={() => setEditingTask({ ...editingTask, parentIds: [] })}
                    className="flex items-center gap-1 text-rose-500 hover:text-rose-400 font-bold cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    すべての接続を解除
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {editingTask.parentIds.map((pId) => {
                    const pTask = activeTasks.find((t) => t.id === pId);
                    return (
                      <span key={pId} className={`inline-flex items-center gap-1 px-2 py-1 border rounded-lg font-medium ${
                        isDark ? 'bg-slate-900 border-slate-700 text-slate-200' : 'bg-white border-slate-200 text-slate-700'
                      }`}>
                        {pTask?.title || pId}
                        <X
                          className="w-3 h-3 text-slate-400 hover:text-rose-500 cursor-pointer ml-1"
                          onClick={() =>
                            setEditingTask({
                              ...editingTask,
                              parentIds: editingTask.parentIds?.filter((id) => id !== pId),
                            })
                          }
                        />
                      </span>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="flex gap-2 pt-2">
              {!isCreating && (
                <button
                  type="button"
                  onClick={handleDeleteTask}
                  className="px-3 py-2.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 font-bold text-xs rounded-xl transition-colors cursor-pointer border border-rose-500/20"
                >
                  削除
                </button>
              )}
              <button
                type="button"
                onClick={() => setEditingTask(null)}
                className={`flex-1 py-2.5 border font-bold text-xs rounded-xl transition-colors cursor-pointer ${
                  isDark ? 'border-slate-700 hover:bg-slate-800 text-slate-300' : 'border-slate-300 hover:bg-slate-50 text-slate-600'
                }`}
              >
                キャンセル
              </button>
              <button
                type="submit"
                className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl transition-colors cursor-pointer shadow-xs"
              >
                {isCreating ? '作成する' : '保存する'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}