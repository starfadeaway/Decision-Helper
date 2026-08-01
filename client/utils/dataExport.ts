/**
 * 数据导出/导入工具
 * 支持将决策、历史记录、备忘录导出为 JSON 文件
 */
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import * as Clipboard from 'expo-clipboard';
import { Platform } from 'react-native';
import {
  getCustomDecisions,
  getHistoryRecords,
  getMemos,
  saveCustomDecision,
  addHistoryRecord,
  saveMemo,
  clearAllData,
} from './storage';
import type { DecisionItem, HistoryRecord, MemoItem } from '@/types';

/** 导出数据类型 */
interface ExportData {
  version: string;
  exportedAt: string;
  decisions: DecisionItem[];
  history: HistoryRecord[];
  memos: MemoItem[];
}

/**
 * 导出所有数据为 JSON 文件
 */
export async function exportAllData(): Promise<{ success: boolean; message: string }> {
  try {
    const [decisions, history, memos] = await Promise.all([
      getCustomDecisions(),
      getHistoryRecords(),
      getMemos(),
    ]);

    const exportData: ExportData = {
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      decisions,
      history,
      memos,
    };

    const jsonString = JSON.stringify(exportData, null, 2);

    // Web 平台：复制到剪贴板
    if (Platform.OS === 'web') {
      await Clipboard.setStringAsync(jsonString);
      return { success: true, message: '数据已复制到剪贴板，请粘贴保存为 .json 文件' };
    }

    // 原生平台：使用文件分享
    const fileName = `decision_backup_${Date.now()}.json`;
    const fileUri = (FileSystem as any).documentDirectory + fileName;

    await (FileSystem as any).writeAsStringAsync(fileUri, jsonString, {
      encoding: (FileSystem as any).EncodingType.UTF8,
    });

    const isAvailable = await Sharing.isAvailableAsync();
    if (!isAvailable) {
      // 退回到剪贴板
      await Clipboard.setStringAsync(jsonString);
      return { success: true, message: '数据已复制到剪贴板' };
    }

    await Sharing.shareAsync(fileUri, {
      mimeType: 'application/json',
      dialogTitle: '导出数据',
    });

    return { success: true, message: '导出成功' };
  } catch (error) {
    return { success: false, message: '导出失败' };
  }
}

/**
 * 导入数据（从 JSON 字符串）
 */
export async function importDataFromJson(jsonString: string): Promise<{ success: boolean; message: string }> {
  try {
    const data: ExportData = JSON.parse(jsonString);

    if (!data.version || !data.decisions || !data.history || !data.memos) {
      return { success: false, message: '数据格式无效' };
    }

    await clearAllData();

    for (const decision of data.decisions) {
      await saveCustomDecision(decision);
    }

    for (const record of data.history) {
      await addHistoryRecord(record);
    }

    for (const memo of data.memos) {
      await saveMemo(memo);
    }

    return { 
      success: true, 
      message: `导入成功！决策 ${data.decisions.length} 条，历史 ${data.history.length} 条，备忘录 ${data.memos.length} 条` 
    };
  } catch (error) {
    return { success: false, message: '导入失败' };
  }
}

/**
 * 获取导出数据（用于分享决策）
 */
export async function getDecisionShareData(decisionId: string): Promise<string | null> {
  const decisions = await getCustomDecisions();
  const decision = decisions.find(d => d.id === decisionId);
  
  if (!decision) return null;

  const shareData = {
    version: '1.0.0',
    type: 'decision',
    decision: decision,
  };

  return JSON.stringify(shareData, null, 2);
}
