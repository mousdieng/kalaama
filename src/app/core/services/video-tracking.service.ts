import { Injectable, inject } from '@angular/core';
import { SupabaseService } from './supabase.service';

export interface VideoWatch {
  id: string;
  video_id: string;
  video_title: string;
  video_url: string;
  language: string;
  watched_duration: number; // seconds
  total_duration: number; // seconds
  watched_at: string;
  updated_at: string;
}

@Injectable({
  providedIn: 'root',
})
export class VideoTrackingService {
  private supabase = inject(SupabaseService);

  /**
   * Save a video watch record to Supabase
   */
  async recordVideoWatch(video: {
    video_id: string;
    video_title: string;
    video_url: string;
    language: string;
    watched_duration: number;
    total_duration: number;
  }): Promise<VideoWatch | null> {
    try {
      // Check if video already exists
      const { data: existing } = await this.supabase
        .from('video_watches')
        .select('*')
        .eq('video_id', video.video_id)
        .single();

      const videoEntry: VideoWatch = {
        id: existing?.id || `video_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        video_id: video.video_id,
        video_title: video.video_title,
        video_url: video.video_url,
        language: video.language,
        watched_duration: video.watched_duration,
        total_duration: video.total_duration,
        watched_at: existing?.watched_at || new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // Upsert video record
      const { data, error } = await this.supabase
        .from('video_watches')
        .upsert([videoEntry], { onConflict: 'video_id' })
        .select()
        .single();

      if (error) throw error;

      return data as VideoWatch;
    } catch (error) {
      console.error('[Kalaama] Failed to record video watch:', error);
      return null;
    }
  }

  /**
   * Get all watched videos
   */
  async getWatchedVideos(language?: string, limit = 100): Promise<VideoWatch[]> {
    try {
      let query = this.supabase.from('video_watches').select('*');

      if (language) {
        query = query.eq('language', language);
      }

      const { data, error } = await query
        .order('updated_at', { ascending: false })
        .limit(limit);

      if (error) throw error;

      return (data as VideoWatch[]) || [];
    } catch (error) {
      console.error('[Kalaama] Failed to get watched videos:', error);
      return [];
    }
  }

  /**
   * Delete a video watch record
   */
  async deleteVideoWatch(videoId: string): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('video_watches')
        .delete()
        .eq('video_id', videoId);

      if (error) throw error;
    } catch (error) {
      console.error('[Kalaama] Failed to delete video watch:', error);
    }
  }
}
