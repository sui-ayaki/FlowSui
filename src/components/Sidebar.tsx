// src/components/Sidebar.tsx
import { Home, Calendar as CalendarIcon, Target, BarChart3, Settings, Users, RefreshCw, History } from 'lucide-react';

type SidebarProps = {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  theme?: 'light' | 'dark';
  manualSync?: () => void;
};

export default function Sidebar({ activeTab, setActiveTab, theme = 'light', manualSync }: SidebarProps) {
  const isDark = theme === 'dark';

  const menuItems = [
    { id: 'HOME', label: 'HOME', icon: Home },
    { id: 'GOAL', label: 'Goals', icon: Target },
    { id: 'CALENDAR', label: 'Calendar', icon: CalendarIcon },
    { id: 'ANALYTICS', label: 'Analytics', icon: BarChart3 },
  ];

  // Settingの直上に配置する管理・同期用メニュー
  const adminMenuItems = [
    { id: 'USERS', label: 'Members', icon: Users },
    { id: 'SYNC', label: 'Sync & Git', icon: RefreshCw },
    { id: 'LOGS', label: 'Audit Logs', icon: History },
  ];

  // タブをクリックした時の共通ハンドラー（状態変更 ＋ 自動同期）
  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
    if (manualSync) {
      manualSync();
    }
  };

  // アクティブ状態の共通スタイル関数
  const getButtonClass = (isActive: boolean) => `
    w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium text-sm transition-all cursor-pointer
    ${isActive
      ? isDark 
        ? 'bg-blue-600/20 text-blue-400 font-bold border border-blue-500/30' 
        : 'bg-blue-50 text-blue-600 font-bold shadow-xs'
      : isDark 
        ? 'text-slate-400 hover:bg-slate-800 hover:text-slate-200' 
        : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'
    }
  `;

  return (
    <aside className={`w-52 border-r flex flex-col justify-between p-4 flex-shrink-0 h-screen select-none transition-colors duration-200 ${
      isDark ? 'bg-slate-900 border-slate-800 text-slate-200' : 'bg-white border-slate-200 text-slate-800'
    }`}>
      <div className="space-y-6">
        {/* ロゴ・アプリ名（クリックでHOMEへ） */}
        <div 
          onClick={() => handleTabChange('HOME')}
          className="px-2 pt-2 cursor-pointer group flex items-center gap-2"
        >
          <h1 className={`text-2xl font-black tracking-wider transition-colors ${
            isDark ? 'text-white group-hover:text-blue-400' : 'text-slate-800 group-hover:text-blue-600'
          }`}>
            FlowSui
          </h1>
        </div>

        {/* メインナビゲーション */}
        <nav className="space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab.toUpperCase() === item.id.toUpperCase();
            return (
              <button
                key={item.id}
                onClick={() => handleTabChange(item.id)}
                className={getButtonClass(isActive)}
              >
                <Icon className="w-4 h-4" />
                {item.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* 左下のエリア（管理・同期タブ ＋ Setting） */}
      <div className={`pt-4 border-t space-y-1 ${isDark ? 'border-slate-800' : 'border-slate-100'}`}>
        {/* 新設する管理・同期・ログタブ */}
        {adminMenuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab.toUpperCase() === item.id.toUpperCase();
          return (
            <button
              key={item.id}
              onClick={() => handleTabChange(item.id)}
              className={getButtonClass(isActive)}
            >
              <Icon className="w-4 h-4" />
              {item.label}
            </button>
          );
        })}

        {/* 従来の Setting ボタン */}
        <div className="pt-2 mt-2 border-t border-dashed border-slate-200 dark:border-slate-800">
          <button 
            onClick={() => handleTabChange('SETTING')}
            className={getButtonClass(activeTab.toUpperCase() === 'SETTING')}
          >
            <Settings className="w-4 h-4" />
            Setting
          </button>
        </div>
      </div>
    </aside>
  );
}