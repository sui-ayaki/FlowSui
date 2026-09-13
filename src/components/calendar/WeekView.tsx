import React, { useState } from 'react';
import { type CalendarEvent, type TagItem } from './CalendarContainer';

type WeekViewProps = {
  theme?: 'light' | 'dark';
  currentDate: Date;
  events: CalendarEvent[];
  members?: { id: string; name: string; role?: string; color?: string }[];
  tags?: TagItem[];
  onEditEvent: (event: CalendarEvent) => void;
  onAddEventForDateTime: (date: Date, hour: number) => void;
  onEventMove?: (event: CalendarEvent, newDateStr: string, newStartHour?: number, newStartMinute?: number) => void;
};

export default function WeekView({ 
  theme = 'light', 
  currentDate, 
  events, 
  members = [], 
  tags = [], 
  onEditEvent, 
  onAddEventForDateTime,
  onEventMove 
}: WeekViewProps) {
  const isDark = theme == 'dark';
  const [draggedEventId, setDraggedEventId] = useState<string | null>(null);
  // ★追加: ドラッグし始めた時に、カード内のどこをクリック（掴んだ）か保持するオフセット
  const [dragOffsetY, setDragOffsetY] = useState<number>(0);

  const startOfWeek = new Date(currentDate);
  const day = startOfWeek.getDay();
  startOfWeek.setDate(startOfWeek.getDate() - day);

  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(startOfWeek);
    d.setDate(d.getDate() + i);
    return d;
  });

  const hours = Array.from({ length: 24 }, (_, i) => i);

  const formatDateStr = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const dayNum = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${dayNum}`;
  };

  const timeToMinutes = (timeStr?: string) => {
    if (!timeStr) return 0;
    const [h, m] = timeStr.split(':').map(Number);
    return (h || 0) * 60 + (m || 0);
  };

  const getTagItem = (tagName: string) => {
    return tags.find(t => t.name === tagName);
  };

  const getMemberObj = (memberId: string) => {
    return members.find(m => m.id === memberId);
  };

  return (
    <div className={`flex flex-col h-full overflow-y-auto relative ${isDark ? 'bg-slate-950 text-slate-100' : 'bg-white text-slate-800'}`}>
      
      {/* 曜日・日付ヘッダー */}
      <div className={`grid grid-cols-8 border-b sticky top-0 z-30 shadow-xs ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
        <div className={`p-3 text-center text-xs font-bold border-r flex items-center justify-center ${isDark ? 'border-slate-800 text-slate-500' : 'border-slate-200 text-slate-400'}`}>
          時間
        </div>
        {weekDays.map((date, idx) => {
          const isToday = new Date().toDateString() === date.toDateString();
          return (
            <div key={idx} className={`p-3 text-center border-r last:border-r-0 ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
              <span className={`text-[10px] font-bold block ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                {['日', '月', '火', '水', '木', '金', '土'][date.getDay()]}
              </span>
              <span className={`text-sm font-black inline-block mt-0.5 px-2 py-0.5 rounded-full ${
                isToday ? 'bg-amber-500 text-white' : isDark ? 'text-slate-200' : 'text-slate-700'
              }`}>
                {date.getDate()}
              </span>
            </div>
          );
        })}
      </div>

      {/* タイムグリッド本体 */}
      <div className="grid grid-cols-8 flex-1 relative" style={{ minHeight: `${24 * 64}px` }}>
        {/* 時間軸の列 */}
        <div className="flex flex-col">
          {hours.map((hour) => (
            <div key={hour} className={`p-2 text-right text-[10px] font-bold h-16 border-b shrink-0 ${isDark ? 'text-slate-500 bg-slate-900/40 border-slate-800/40' : 'text-slate-400 bg-slate-50/50 border-slate-100'}`}>
              {hour}:00
            </div>
          ))}
        </div>

        {/* 各曜日の列 */}
        {weekDays.map((date, dayIdx) => {
          const dateStr = formatDateStr(date);

          const dayEvents = events.filter(ev => {
            const startD = ev.date;
            const endD = ev.endDate || ev.date;
            return dateStr >= startD && dateStr <= endD;
          });

          const processedEvents = dayEvents.map(ev => {
            const startD = ev.date;
            const endD = ev.endDate || ev.date;

            const startMin = (dateStr === startD) ? timeToMinutes(ev.startTime || '10:00') : 0;
            const endMin = (dateStr === endD) ? timeToMinutes(ev.endTime || '11:00') : 24 * 60;

            return {
              ev,
              startMin: Math.max(0, startMin),
              endMin: Math.min(24 * 60, Math.max(startMin + 30, endMin)),
            };
          });

          const positionedEvents = processedEvents.map((item, idx, arr) => {
            let colIndex = 0;
            let totalCols = 1;

            const overlaps = arr.filter((other, oIdx) => {
              if (oIdx === idx) return false;
              return item.startMin < other.endMin && item.endMin > other.startMin;
            });

            if (overlaps.length > 0) {
              const group = [item, ...overlaps].sort((a, b) => a.startMin - b.startMin || a.ev.id.localeCompare(b.ev.id));
              colIndex = group.findIndex(g => g.ev.id === item.ev.id);
              totalCols = group.length;
            }

            return {
              ...item,
              colIndex: Math.max(0, colIndex),
              totalCols: Math.max(1, totalCols),
            };
          });

          return (
            <div 
              key={dayIdx} 
              className={`relative border-r last:border-r-0 ${isDark ? 'border-slate-800/40' : 'border-slate-100'}`}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                if (draggedEventId && onEventMove) {
                  const targetEvent = events.find(ev => ev.id === draggedEventId);
                  if (targetEvent) {
                    // ★修正: ドロップ位置のY座標から「つかんでいた分のオフセット（dragOffsetY）」を引くことで、
                    // カードのどこを掴んでいても正しい元の相対位置をキープして移動できるようにする
                    const rect = e.currentTarget.getBoundingClientRect();
                    const offsetY = (e.clientY - rect.top) - dragOffsetY;
                    const totalMinutes = (offsetY / 64) * 60; // 1時間 = 64px
                    const droppedHour = Math.floor(totalMinutes / 60);
                    const droppedMinute = Math.floor((totalMinutes % 60) / 15) * 15; // 15分刻みスナップ

                    onEventMove(targetEvent, dateStr, Math.max(0, Math.min(23, droppedHour)), droppedMinute);
                  }
                }
                setDraggedEventId(null);
                setDragOffsetY(0);
              }}
            >
              {hours.map((hour) => (
                <div 
                  key={hour} 
                  onClick={() => onAddEventForDateTime(date, hour)}
                  className={`h-16 border-b transition-colors hover:bg-amber-500/5 cursor-pointer ${isDark ? 'border-slate-800/40' : 'border-slate-100'}`}
                />
              ))}

              {positionedEvents.map(({ ev, startMin, endMin, colIndex, totalCols }) => {
                const topPx = (startMin / 60) * 64;
                const heightPx = Math.max(36, ((endMin - startMin) / 60) * 64);

                const startD = ev.date;
                const endD = ev.endDate || ev.date;
                const isMultiDay = startD !== endD;

                let displayTimeStr = '';
                if (!isMultiDay) {
                  displayTimeStr = `${ev.startTime || '10:00'} - ${ev.endTime || ''}`;
                } else {
                  if (dateStr === startD) {
                    displayTimeStr = `${ev.startTime || '10:00'} 〜 (継続)`;
                  } else if (dateStr === endD) {
                    displayTimeStr = `(継続) 〜 ${ev.endTime || ''}`;
                  } else {
                    displayTimeStr = `(終日継続)`;
                  }
                }

                const firstTagName = ev.tags && ev.tags.length > 0 ? ev.tags[0] : null;
                const firstTagObj = firstTagName ? getTagItem(firstTagName) : null;
                const baseColor = firstTagObj ? firstTagObj.color : '#f59e0b';

                const widthPercent = 100 / totalCols;
                const leftPercent = colIndex * widthPercent;

                return (
                  <div
                    key={`${ev.id}-${dateStr}`}
                    draggable
                    onDragStart={(e) => {
                      setDraggedEventId(ev.id);
                      // ★追加: 要素内でのマウスの相対位置（Y座標）を記録する
                      const rect = e.currentTarget.getBoundingClientRect();
                      setDragOffsetY(e.clientY - rect.top);
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      onEditEvent(ev);
                    }}
                    style={{ 
                      top: `${topPx}px`,
                      height: `${heightPx}px`,
                      left: `${leftPercent}%`,
                      width: `calc(${widthPercent}% - 4px)`,
                      backgroundColor: `${baseColor}15`, 
                      borderColor: `${baseColor}88`,      
                      color: isDark ? '#f8fafc' : '#0f172a'
                    }}
                    className="absolute z-20 text-[10px] font-bold p-1.5 rounded-lg border shadow-sm overflow-hidden flex flex-col justify-between cursor-grab active:cursor-grabbing ml-0.5"
                  >
                    <div className="truncate">
                      <span className="font-black mr-1" style={{ color: baseColor }}>{displayTimeStr}</span>
                      {ev.title}
                    </div>

                    <div className="flex flex-col gap-1 overflow-hidden">
                      {ev.memberIds && ev.memberIds.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {ev.memberIds.map(mId => {
                            const mObj = getMemberObj(mId);
                            if (!mObj) return null;
                            const memberColor = mObj.color || '#f59e0b';
                            return (
                              <span
                                key={mId}
                                style={{ 
                                  backgroundColor: `${memberColor}33`, 
                                  borderColor: '#ffffff', 
                                  color: '#ffffff' 
                                }}
                                className="text-[8px] px-1.5 py-0.2 rounded border font-bold truncate flex items-center gap-1 shadow-2xs"
                              >
                                <span className="w-1.5 h-1.5 rounded-full bg-white" />
                                {mObj.name}
                              </span>
                            );
                          })}
                        </div>
                      )}

                      {ev.tags && ev.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 overflow-hidden">
                          {ev.tags.map(tagName => {
                            const tagObj = getTagItem(tagName);
                            const tagColor = tagObj ? tagObj.color : baseColor;
                            return (
                              <span 
                                key={tagName}
                                style={{ backgroundColor: `${tagColor}33`, borderColor: tagColor, color: tagColor }}
                                className="text-[8px] px-1 py-0.2 rounded border font-bold truncate"
                              >
                                {tagName}
                              </span>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}