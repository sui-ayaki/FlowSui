import { type CalendarEvent, type TagItem } from './CalendarContainer';

type YearViewProps = {
  theme?: 'light' | 'dark';
  currentDate: Date;
  events: CalendarEvent[];
  tags?: TagItem[];
  onSelectMonth: (year: number, month: number) => void;
};

export default function YearCalendarView({
  theme = 'light',
  currentDate,
  events,
  tags = [],
  onSelectMonth,
}: YearViewProps) {
  const isDark = theme === 'dark';
  const year = currentDate.getFullYear();
  const months = Array.from({ length: 12 }, (_, i) => i + 1);

  const getTagItem = (tagName: string) => {
    return tags.find(t => t.name === tagName);
  };

  return (
    <div className={`h-full overflow-y-auto p-6 select-none ${isDark ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-800'}`}>
      <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {months.map((month) => {
          const firstDayOfMonth = new Date(year, month - 1, 1);
          const lastDayOfMonth = new Date(year, month, 0);
          const startDayOfWeek = firstDayOfMonth.getDay();
          const totalDays = lastDayOfMonth.getDate();

          const monthDays: { dateStr: string; dayNum: number | null }[] = [];
          for (let i = 0; i < startDayOfWeek; i++) {
            monthDays.push({ dateStr: '', dayNum: null });
          }
          for (let i = 1; i <= totalDays; i++) {
            const mStr = String(month).padStart(2, '0');
            const dStr = String(i).padStart(2, '0');
            monthDays.push({ dateStr: `${year}-${mStr}-${dStr}`, dayNum: i });
          }

          return (
            <div
              key={month}
              onClick={() => onSelectMonth(year, month)}
              className={`p-4 rounded-2xl border shadow-sm transition-all cursor-pointer hover:shadow-md ${
                isDark ? 'bg-slate-900 border-slate-800 hover:border-amber-500/50' : 'bg-white border-slate-200 hover:border-amber-500/50'
              }`}
            >
              <div className="flex items-center justify-between mb-3 border-b pb-2">
                <h4 className="text-sm font-black text-amber-500">{month}月</h4>
                <span className={`text-[10px] font-bold ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                  {year}年
                </span>
              </div>

              <div className="grid grid-cols-7 text-center gap-1">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((w, i) => (
                  <span key={i} className={`text-[9px] font-bold ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                    {w}
                  </span>
                ))}

                {monthDays.map((item, idx) => {
                  if (!item.dayNum || !item.dateStr) {
                    return <div key={idx} />;
                  }

                  // この日のイベント
                  const dayEvents = events.filter(ev => {
                    const startD = ev.date;
                    const endD = ev.endDate || ev.date;
                    return item.dateStr >= startD && item.dateStr <= endD;
                  });

                  const isToday = new Date().toDateString() === new Date(item.dateStr).toDateString();

                  return (
                    <div
                      key={idx}
                      className={`flex flex-col items-center justify-center py-1 rounded-lg transition-colors ${
                        isToday ? 'bg-amber-500 text-white font-black' : isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-100'
                      }`}
                    >
                      <span className="text-[10px] font-bold">{item.dayNum}</span>
                      
                      {/* 予定がある場合の「●ポチ」（タグのカラーを反映） */}
                      <div className="flex items-center justify-center gap-0.5 h-1.5 mt-0.5">
                        {dayEvents.slice(0, 2).map((ev, eIdx) => {
                          const firstTagName = ev.tags && ev.tags.length > 0 ? ev.tags[0] : null;
                          const firstTagObj = firstTagName ? getTagItem(firstTagName) : null;
                          const dotColor = firstTagObj ? firstTagObj.color : (ev.color || '#f59e0b');

                          return (
                            <span
                              key={eIdx}
                              style={{ backgroundColor: isToday ? '#ffffff' : dotColor }}
                              className="w-1 h-1 rounded-full shrink-0"
                            />
                          );
                        })}
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
  );
}