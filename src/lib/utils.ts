import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Tarihleri formatla (Türkçe format)
export function formatDate(dateString: string): string {
  if (!dateString) return "";
  
  const date = new Date(dateString);
  
  // Bugünün tarihini al
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  
  // Bugün veya dün için özel format
  if (date.toDateString() === today.toDateString()) {
    return `Bugün ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
  } else if (date.toDateString() === yesterday.toDateString()) {
    return `Dün ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
  }
  
  // Diğer tarihler için standart format
  return `${date.getDate().toString().padStart(2, '0')}.${(date.getMonth() + 1).toString().padStart(2, '0')}.${date.getFullYear()}`;
}
