'use client';

import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';

export class MapCacheService {
  private static instance: MapCacheService;
  private cacheSize = 0;
  private maxCacheSize = 50 * 1024 * 1024; // 50 MB
  private readonly cacheDir = 'map-tiles';

  private constructor() {}

  public static getInstance(): MapCacheService {
    if (!MapCacheService.instance) {
      MapCacheService.instance = new MapCacheService();
    }
    return MapCacheService.instance;
  }

  /**
   * Initialize the map cache directory
   */
  async initialize() {
    if (!Capacitor.isNativePlatform()) return;
    try {
      await Filesystem.mkdir({
        path: this.cacheDir,
        directory: Directory.Cache,
        recursive: true,
      });
      console.log('🗺️ [MapCache] Cache directory initialized');
      
      await this.calculateCacheSize();
    } catch (e) {
      console.warn('[MapCache] Initialization failed', e);
    }
  }

  /**
   * Calculate current cache size
   */
  async calculateCacheSize() {
    if (!Capacitor.isNativePlatform()) return 0;
    try {
      const { files } = await Filesystem.readdir({
        path: this.cacheDir,
        directory: Directory.Cache,
      });
      
      let totalSize = 0;
      for (const file of files || []) {
        if (file.type === 'file') {
          const { size } = await Filesystem.stat({
            path: `${this.cacheDir}/${file.name}`,
            directory: Directory.Cache,
          });
          totalSize += size || 0;
        }
      }
      
      this.cacheSize = totalSize;
      console.log(`🗺️ [MapCache] Cache size: ${(totalSize / 1024 / 1024).toFixed(2)} MB`);
      return totalSize;
    } catch (e) {
      console.warn('[MapCache] Failed to calculate cache size', e);
      return 0;
    }
  }

  /**
   * Generate a cache key from tile coordinates
   */
  getCacheKey(x: number, y: number, z: number): string {
    return `tile_${z}_${x}_${y}.png`;
  }

  /**
   * Save a tile to cache
   */
  async saveTile(x: number, y: number, z: number, data: Blob) {
    if (!Capacitor.isNativePlatform()) return false;
    
    try {
      if (this.cacheSize + data.size > this.maxCacheSize) {
        await this.evictOldestTiles(data.size);
      }

      const cacheKey = this.getCacheKey(x, y, z);
      const reader = new FileReader();
      
      const base64Data = await new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(data);
      });

      const base64 = base64Data.split(',')[1];
      
      await Filesystem.writeFile({
        path: `${this.cacheDir}/${cacheKey}`,
        data: base64,
        directory: Directory.Cache,
      });

      this.cacheSize += data.size;
      console.log(`🗺️ [MapCache] Saved tile: ${cacheKey} (${(data.size / 1024).toFixed(1)} KB)`);
      return true;
    } catch (e) {
      console.warn('[MapCache] Failed to save tile', e);
      return false;
    }
  }

  /**
   * Get a tile from cache
   */
  async getTile(x: number, y: number, z: number): Promise<Blob | null> {
    if (!Capacitor.isNativePlatform()) return null;
    
    try {
      const cacheKey = this.getCacheKey(x, y, z);
      const { data } = await Filesystem.readFile({
        path: `${this.cacheDir}/${cacheKey}`,
        directory: Directory.Cache,
      });

      const byteString = atob(data as string);
      const arrayBuffer = new ArrayBuffer(byteString.length);
      const uint8Array = new Uint8Array(arrayBuffer);
      
      for (let i = 0; i < byteString.length; i++) {
        uint8Array[i] = byteString.charCodeAt(i);
      }

      console.log(`🗺️ [MapCache] Loaded tile from cache: ${cacheKey}`);
      return new Blob([arrayBuffer], { type: 'image/png' });
    } catch (e) {
      return null;
    }
  }

  /**
   * Evict oldest tiles to make space
   */
  private async evictOldestTiles(requiredSpace: number) {
    if (!Capacitor.isNativePlatform()) return;
    try {
      const { files } = await Filesystem.readdir({
        path: this.cacheDir,
        directory: Directory.Cache,
      });

      if (!files || files.length === 0) return;

      const fileStats = [];
      for (const file of files) {
        if (file.type === 'file') {
          const stat = await Filesystem.stat({
            path: `${this.cacheDir}/${file.name}`,
            directory: Directory.Cache,
          });
          fileStats.push({ name: file.name, mtime: stat.mtime, size: stat.size });
        }
      }

      fileStats.sort((a, b) => (a.mtime || 0) - (b.mtime || 0));

      let freedSpace = 0;
      for (const file of fileStats) {
        if (freedSpace >= requiredSpace) break;
        
        await Filesystem.deleteFile({
          path: `${this.cacheDir}/${file.name}`,
          directory: Directory.Cache,
        });
        
        freedSpace += file.size || 0;
        this.cacheSize -= file.size || 0;
        console.log(`🗺️ [MapCache] Evicted tile: ${file.name}`);
      }
    } catch (e) {
      console.warn('[MapCache] Failed to evict tiles', e);
    }
  }

  /**
   * Clear all cached tiles
   */
  async clearCache() {
    if (!Capacitor.isNativePlatform()) return;
    try {
      await Filesystem.rmdir({
        path: this.cacheDir,
        directory: Directory.Cache,
        recursive: true,
      });
      
      await this.initialize();
      console.log('🗺️ [MapCache] Cache cleared');
    } catch (e) {
      console.warn('[MapCache] Failed to clear cache', e);
    }
  }
}

export const mapCache = MapCacheService.getInstance();