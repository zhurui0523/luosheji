import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { uploadFromBase64, uploadFromUrl, getOSSClient } from './oss.ts';
import { requiresCloudStorage } from './database.ts';

const getFilename = () => {
  try {
    if (typeof __filename !== 'undefined' && __filename) return __filename;
    if (typeof import.meta !== 'undefined' && typeof import.meta.url === 'string') return fileURLToPath(import.meta.url);
  } catch (e) {}
  return path.join(process.cwd(), 'server.ts');
};

const __filename_path = getFilename();
const __dirname = path.dirname(__filename_path);
const __filename = __filename_path;
const UPLOADS_DIR = path.join(process.cwd(), 'uploads');

const allowsLocalMediaFallback = () => {
  const explicit = process.env.ALLOW_LOCAL_MEDIA_FALLBACK || process.env.XIAOLUO_ALLOW_LOCAL_MEDIA_FALLBACK;
  if (['1', 'true', 'yes', 'on'].includes(String(explicit || '').toLowerCase())) return true;
  if (['0', 'false', 'no', 'off'].includes(String(explicit || '').toLowerCase())) return false;
  return !requiresCloudStorage();
};

// Ensure uploads directory exists
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

export const persistFromBase64 = async (base64Data: string, filename: string): Promise<string> => {
  const ossClient = getOSSClient();
  
  if (!ossClient) {
    if (!allowsLocalMediaFallback()) {
      throw new Error('OSS configuration is required for cloud media persistence. Set OSS_REGION, OSS_ACCESS_KEY_ID, OSS_ACCESS_KEY_SECRET and OSS_BUCKET, or explicitly enable ALLOW_LOCAL_MEDIA_FALLBACK for local development.');
    }
    console.warn('>>> [DEBUG] Alibaba Cloud OSS is not configured. Falling back to local storage.');
    let buffer: Buffer;
    let cleanName = filename;
    
    if (base64Data.includes('base64,')) {
      const parts = base64Data.split(',');
      buffer = Buffer.from(parts[1], 'base64');
    } else {
      buffer = Buffer.from(base64Data, 'base64');
    }
    
    if (cleanName.startsWith('luosheji/')) {
      cleanName = cleanName.substring('luosheji/'.length);
    }
    
    const fullPath = path.join(process.cwd(), 'uploads', cleanName);
    const dir = path.dirname(fullPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    fs.writeFileSync(fullPath, buffer);
    return `/uploads/${cleanName}`;
  }

  return await uploadFromBase64(base64Data, filename);
};

export const persistFromUrl = async (url: string, filename: string): Promise<string> => {
  const ossClient = getOSSClient();
  
  if (!ossClient) {
    if (!allowsLocalMediaFallback()) {
      throw new Error('OSS configuration is required for cloud media persistence. Set OSS_REGION, OSS_ACCESS_KEY_ID, OSS_ACCESS_KEY_SECRET and OSS_BUCKET, or explicitly enable ALLOW_LOCAL_MEDIA_FALLBACK for local development.');
    }
    console.warn('>>> [DEBUG] Alibaba Cloud OSS is not configured. Falling back to local storage.');
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch URL ${url}: ${response.statusText}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    let cleanName = filename;
    if (cleanName.startsWith('luosheji/')) {
      cleanName = cleanName.substring('luosheji/'.length);
    }
    
    const fullPath = path.join(process.cwd(), 'uploads', cleanName);
    const dir = path.dirname(fullPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    fs.writeFileSync(fullPath, buffer);
    return `/uploads/${cleanName}`;
  }

  return await uploadFromUrl(url, filename);
};
