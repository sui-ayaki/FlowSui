// src/types.ts

// ----------------------------------------------------------------------
// 0. 接続プロファイル・GitHub連携関連
// ----------------------------------------------------------------------
export type ConnectionProfile = {
  id: string;          // 一意のID (UUID)
  profileName: string; // 自分が識別するための名前 (例: "A社プロジェクト", "個人用")
  owner: string;       // リポジトリオーナー名
  repo: string;        // リポジトリ名
  branch?: string;     // ブランチ名 (デフォルト: main)
  filePath: string;    // 同期するJSONファイルのパス (例: "flowsui-data.json")
  token: string;       // そのリポジトリ用のGitHub PAT
  currentUser: {       // GET /user から自動取得したユーザー情報
    login: string;
    name?: string;
    avatarUrl: string;
  };
  isOwner?: boolean;
};

// ----------------------------------------------------------------------
// 1. ユーザー・権限関連 (Discord風ロール)
// ----------------------------------------------------------------------
export type UserRole = 'owner' | 'admin' | 'member';

export type UserProfile = {
  id: string;
  name: string;
  role: UserRole;        // 'owner': オーナー, 'admin': 管理者, 'member': 一般
  roleTitle?: string;    // 例: "フロントエンド", "バックエンド" などの肩書
  avatarUrl?: string;    // 個人で変更可能なプロフィール画像
  updatedAt: string;
  isDeleted?: boolean;   // 論理削除フラグ
};

// ----------------------------------------------------------------------
// 2. タグ管理 (カレンダー・タスク共通)
// ----------------------------------------------------------------------
export type TagItem = {
  id: string;
  name: string;          // 例: "開発", "緊急", "レビュー"
  color: string;         // カラーコード (#3b82f6 など)
  updatedAt: string;
  isDeleted?: boolean;   // 論理削除フラグ
};

// ----------------------------------------------------------------------
// 3. カレンダー予定
// ----------------------------------------------------------------------
export type CalendarEvent = {
  id: string;
  title: string;
  date: string;          // 開始日 (YYYY-MM-DD)
  endDate?: string;      // 終了日 (複数日またぎ用)
  startTime?: string;    // 開始時間 (HH:mm)
  endTime?: string;      // 終了時間 (HH:mm)
  description?: string;  // メモ・詳細
  memberIds: string[];   // 担当メンバー（複数選択対応）
  tags: string[];        // 割り当てタグ（複数選択対応・最初が優先カラー）
  color?: string;        // 個別指定カラー（オプション）

  // コラボレーション・監査用
  createdBy: string;
  updatedBy: string;
  updatedAt: string;     // 同期時のタイムスタンプ比較用 (Last-Write-Wins)
  isDeleted?: boolean;   // 論理削除フラグ
};

// ----------------------------------------------------------------------
// 4. タスク（ガントチャート用）
// ----------------------------------------------------------------------
export type TaskItem = {
  id: string;
  title: string;
  startDate: string;     // 開始日 (YYYY-MM-DD)
  endDate: string;       // 終了日 (YYYY-MM-DD)
  progress: number;      // 進捗率 (0 ~ 100)
  assigneeId: string;    // 担当メンバーID（行の担当者）
  color?: string;        // タスク指定カラー
  tag?: string;          // 割り当てタグ
  memo?: string;         // メモ
  dependencies?: string[]; // 矢印で繋がる先行タスクのID配列

  // コラボレーション・監査用
  createdBy: string;
  updatedBy: string;
  updatedAt: string;
  isDeleted?: boolean;   // 論理削除フラグ
};

// ----------------------------------------------------------------------
// 5. 目標 (Month Goals / Long Goals)
// ----------------------------------------------------------------------
export type GoalItem = {
  id: string;
  title: string;
  description?: string;  // 詳細・補足説明
  targetPeriod: string;  // 対象期間（月目標なら "2026-09", 中長期なら "2026" など）
  category: 'month' | 'long'; // 月別目標か中長期目標か
  memberIds?: string[];  // 担当メンバー（未選択なら全体）
  status?: 'not_started' | 'in_progress' | 'completed';

  // コラボレーション・監査用
  createdBy: string;
  updatedBy: string;
  updatedAt: string;
  isDeleted?: boolean;   // 論理削除フラグ
};

// ----------------------------------------------------------------------
// 6. 監査ログ (Audit Log / Discord風)
// ----------------------------------------------------------------------
export type AuditLog = {
  id: string;
  timestamp: string;     // 発生日時
  userId: string;        // 操作したユーザーID
  userName: string;      // 操作時のユーザー名
  action: 
    | 'EVENT_CREATE' | 'EVENT_UPDATE' | 'EVENT_DELETE' 
    | 'TASK_CREATE' | 'TASK_UPDATE' | 'TASK_DELETE' 
    | 'GOAL_CREATE' | 'GOAL_UPDATE' | 'GOAL_DELETE' 
    | 'MEMBER_ADD' | 'MEMBER_REMOVE' | 'ROLE_CHANGE'
    | 'SYNC_GITHUB';
  details: string;       // 操作の具体的内容
};

// ----------------------------------------------------------------------
// 7. GitHub同期用・全体データコンテナ
// ----------------------------------------------------------------------
export type AppSyncData = {
  events: CalendarEvent[];
  tasks: TaskItem[];
  goals: GoalItem[];
  tags: TagItem[];
  members: UserProfile[];
  logs: AuditLog[];
  lastSyncedAt: string;
};