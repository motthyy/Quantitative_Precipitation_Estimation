import { format } from 'date-fns';

export function formatDateTime(timestamp: string): string {
  return format(new Date(timestamp), 'yyyy/MM/dd HH:mm');
}

export function formatDate(timestamp: string): string {
  return format(new Date(timestamp), 'yyyy/MM/dd');
}

export function formatTime(timestamp: string): string {
  return format(new Date(timestamp), 'HH:mm');
}

export function toDateTimeLocal(timestamp: string): string {
  return format(new Date(timestamp), "yyyy-MM-dd'T'HH:mm");
}

