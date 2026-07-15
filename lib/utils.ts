
/**
 * Converts a string to base64, supporting UTF-8 characters (like Chinese).
 * This replaces window.btoa which only supports Latin1 characters.
 */
export function toBase64(str: string): string {
  try {
    if (typeof Buffer !== 'undefined') {
      return Buffer.from(str).toString('base64');
    }
    const encoder = new TextEncoder();
    const data = encoder.encode(str);
    let binary = '';
    const chunk_size = 0x8000; // 32KB chunks to avoid stack overflow with apply
    for (let i = 0; i < data.length; i += chunk_size) {
      binary += String.fromCharCode.apply(null, data.subarray(i, i + chunk_size) as any);
    }
    return btoa(binary);
  } catch (e) {
    console.error('toBase64 failed:', e);
    try {
      if (typeof btoa !== 'undefined') {
        return btoa(unescape(encodeURIComponent(str)));
      }
    } catch {}
    return str; // Fallback to raw string if everything fails
  }
}

export function fromBase64(b64: string): string {
  try {
    if (typeof Buffer !== 'undefined') {
      return Buffer.from(b64, 'base64').toString('utf-8');
    }
    const binary = atob(b64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    const decoder = new TextDecoder();
    return decoder.decode(bytes);
  } catch (e) {
    console.error('fromBase64 failed:', e);
    try {
      if (typeof atob !== 'undefined') {
        // @ts-ignore
        return decodeURIComponent(escape(atob(b64)));
      }
    } catch {}
    return b64; // Fallback
  }
}

export function logUsage(action: string, data: any, metadata?: any) {
  console.log(`[Usage Log] ${action}:`, { data, ...metadata });
}

import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

