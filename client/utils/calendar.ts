/**
 * 日历工具 - 管理备忘录提醒事件
 */
import { Platform } from 'react-native';
import * as Calendar from 'expo-calendar';

/** 请求日历权限 */
export async function requestCalendarPermission(): Promise<boolean> {
  if (Platform.OS === 'web') {
    // Web 端不支持日历 API
    return false;
  }
  try {
    const { status } = await Calendar.requestCalendarPermissionsAsync();
    return status === 'granted';
  } catch {
    return false;
  }
}

/** 获取默认日历 ID */
async function getDefaultCalendarId(): Promise<string | null> {
  if (Platform.OS === 'web') return null;
  try {
    const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
    // 优先找可修改的日历
    const writable = calendars.find((c) => c.allowsModifications);
    return writable?.id ?? calendars[0]?.id ?? null;
  } catch {
    return null;
  }
}

/** 创建日历提醒事件 */
export async function createCalendarEvent(
  title: string,
  content: string,
  reminderTime: number
): Promise<string | null> {
  if (Platform.OS === 'web') return null;

  const hasPermission = await requestCalendarPermission();
  if (!hasPermission) return null;

  const calendarId = await getDefaultCalendarId();
  if (!calendarId) return null;

  try {
    // 事件开始前15分钟提醒
    const startDate = new Date(reminderTime - 15 * 60 * 1000);
    const endDate = new Date(reminderTime);

    const eventId = await Calendar.createEventAsync(calendarId, {
      title: `[Memo] ${title}`,
      notes: content,
      startDate,
      endDate,
      alarms: [{ relativeOffset: -15 }], // 提前15分钟提醒
    });

    return eventId;
  } catch {
    return null;
  }
}

/** 更新日历提醒事件 */
export async function updateCalendarEvent(
  eventId: string,
  title: string,
  content: string,
  reminderTime: number
): Promise<boolean> {
  if (Platform.OS === 'web') return false;

  try {
    const startDate = new Date(reminderTime - 15 * 60 * 1000);
    const endDate = new Date(reminderTime);

    await Calendar.updateEventAsync(eventId, {
      title: `[Memo] ${title}`,
      notes: content,
      startDate,
      endDate,
      alarms: [{ relativeOffset: -15 }],
    });

    return true;
  } catch {
    return false;
  }
}

/** 删除日历提醒事件 */
export async function deleteCalendarEvent(eventId: string): Promise<boolean> {
  if (Platform.OS === 'web') return false;

  try {
    await Calendar.deleteEventAsync(eventId);
    return true;
  } catch {
    return false;
  }
}
