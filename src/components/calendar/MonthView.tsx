import { type CalendarEvent, type TagItem } from './CalendarContainer';

type MonthViewProps = {
  theme?: 'light' | 'dark';
  currentDate: Date;
  events: CalendarEvent[];
  members?: { id: string; name: string; role?: string; color?: string }[];
  tags?: TagItem[];
  onSelectDate: (date: Date) => void;
  onEditEvent: (event: CalendarEvent) => void;
  onAddEventForDate: (date: Date) => void;
};

export default function MonthView({
  theme = 'light',
  currentDate,
  events,
  tags = [],
  onSelectDate,
  onEditEvent,
  onAddEventForDate,
}: MonthViewProps) {
  const isDark = theme === 'dark';

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // 月の最初の日と最後の日を取得
  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);

  const startDayOfWeek = firstDayOfMonth.getDay(); // 0 (日) 〜 6 (土)
  const totalDays = lastDayOfMonth.getDate();

  // カレンダーグリッド用の配列を作成（前月の空白 ＋ 当月の日付 ＋ 翌月の空白）
  const days: { date: Date; isCurrentMonth: boolean }[] = [];

  // 前月分のパディング
  const prevMonthLastDay = new Date(year, month, 0).getDate();
  for (let i = startDayOfWeek - 1; i >= 0; i--) {
    const d = new Date(year, month - 1, prevMonthLastDay - i);
    days.push({ date: d, isCurrentMonth: false });
  }

  // 当月分
  for (let i = 1; i <= totalDays; i++) {
    const d = new Date(year, month, i);
    days.push({ date: d, isCurrentMonth: true });
  }

  // 6週分（42セル）になるように翌月分で埋める
  const remainingCells = 42 - days.length;
  for (let i = 1; i <= remainingCells; i++) {
    const d = new Date(year, month + 1, i);
    days.push({ date: d, isCurrentMonth: false });
  }

  const formatDateStr = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const dayNum = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${dayNum}`;
  };

  const getTagItem = (tagName: string) => {
    return tags.find(t => t.name === tagName);
  };

  const weekDays = ['日', '月', '火', '水', '木', '金', '土'];

  return (
    <div className={`flex flex-col h-full select-none ${isDark ? 'bg-slate-950 text-slate-100' : 'bg-white text-slate-800'}`}>
      
      {/* 曜日ヘッダー */}
      <div className={`grid grid-cols-7 border-b shrink-0 ${isDark ? 'bg-slate-900 border-slate-800 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-500'}`}>
        {weekDays.map((w, i) => (
          <div key={i} className={`py-2 text-center text-xs font-bold border-r last:border-r-0 ${isDark ? 'border-slate-800' : 'border-slate-200'} ${i === 0 ? 'text-rose-500' : i === 6 ? 'text-blue-500' : ''}`}>
            {w}
          </div>
        ))}
      </div>

      {/* 日付グリッド (6週固定) */}
      <div className="grid grid-cols-7 grid-rows-6 flex-1 h-full">
        {days.map(({ date, isCurrentMonth }, idx) => {
          const dateStr = formatDateStr(date);
          const isToday = new Date().toDateString() === date.toDateString();

          // この日のイベントを抽出
          const dayEvents = events.filter(ev => {
            const startD = ev.date;
            const endD = ev.endDate || ev.date;
            return dateStr >= startD && dateStr <= endD;
          });

          return (
            <div
              key={idx}
              onClick={() => onAddEventForDate(date)}
              className={`border-b border-r last:border-r-0 p-1.5 flex flex-col transition-colors cursor-pointer overflow-hidden ${
                isDark 
                  ? `${isCurrentMonth ? 'bg-slate-950 hover:bg-slate-900/50' : 'bg-slate-900/20 text-slate-600 hover:bg-slate-900/40'} border-slate-800/60` 
                  : `${isCurrentMonth ? 'bg-white hover:bg-amber-500/5' : 'bg-slate-50/60 text-slate-400 hover:bg-slate-100'} border-slate-200`
              }`}
            >
              <div className="flex items-center justify-between mb-1 shrink-0">
                <span
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectDate(date);
                  }}
                  className={`text-xs font-black inline-flex items-center justify-center w-6 h-6 rounded-full transition-colors hover:bg-amber-500 hover:text-white ${
                    isToday 
                      ? 'bg-amber-500 text-white' 
                      : isCurrentMonth 
                        ? isDark ? 'text-slate-200' : 'text-slate-700' 
                        : isDark ? 'text-slate-600' : 'text-slate-400'
                  }`}
                >
                  {date.getDate()}
                </span>
                
                {dayEvents.length > 3 && (
                  <span className="text-[9px] font-bold px-1 rounded bg-slate-500/20 text-slate-400">
                    +{dayEvents.length - 3}
                  </span>
                )}
              </div>

              {/* イベント一覧（タグの色を反映） */}
              <div className="flex-1 overflow-y-auto space-y-1 pr-0.5">
                {dayEvents.slice(0, 3).map(ev => {
                  const firstTagName = ev.tags && ev.tags.length > 0 ? ev.tags[0] : null;
                  const firstTagObj = firstTagName ? getTagItem(firstTagName) : null;
                  const baseColor = firstTagObj ? firstTagObj.color : (ev.color || '#f59e0b');

                  return (
                    <div
                      key={ev.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        onEditEvent(ev);
                      }}
                      style={{
                        backgroundColor: `${baseColor}22`,
                        borderColor: `${baseColor}88`,
                        color: isDark ? '#f8fafc' : '#0f172a'
                      }}
                      className="text-[10px] font-bold px-1.5 py-0.5 rounded border truncate shadow-2xs transition-transform hover:scale-[1.01]"
                    >
                      <span className="mr-1" style={{ color: baseColor }}>■</span>
                      {ev.title}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}