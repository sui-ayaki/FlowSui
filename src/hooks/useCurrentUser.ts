import { useState } from 'react';
import { type UserProfile } from '../types';

export function useCurrentUser() {
  // 初期メンバー一覧
  const [members, setMembers] = useState<UserProfile[]>([
    { id: '1', name: '山田 太郎', role: 'owner', roleTitle: 'フロントエンド', updatedAt: new Date().toISOString() },
    { id: '2', name: '佐藤 花子', role: 'admin', roleTitle: 'バックエンド', updatedAt: new Date().toISOString() },
    { id: '3', name: '鈴木 一郎', role: 'member', roleTitle: 'インフラ・DevOps', updatedAt: new Date().toISOString() },
    { id: '4', name: '田中 美咲', role: 'member', roleTitle: 'UI/UXデザイナー', updatedAt: new Date().toISOString() },
  ]);

  // 現在の操作ユーザー（デフォルトは先頭のメンバー）
  const [currentUser, setCurrentUser] = useState<UserProfile>(members[0]);

  return {
    currentUser,
    setCurrentUser,
    members,
    setMembers,
  };
}