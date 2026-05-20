import {
  HttpClient,
  HttpEventType,
  HttpHeaders,
  HttpRequest,
} from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { filter, map, catchError } from 'rxjs/operators';
import { throwError } from 'rxjs';
import type {
  PhotoDto,
  PhotoPresignRequest,
  PhotoPresignResponse,
  PhotoConfirmRequest,
  PhotoUpdateRequest,
  Media360Dto,
  Media360PresignRequest,
  Media360PresignResponse,
  Media360ConfirmRequest,
  VideoDto,
  VideoPresignRequest,
  VideoPresignResponse,
  VideoConfirmRequest,
} from '@behbehani-cpo/shared-types';
import { API_CONFIG } from './api-config';

export interface UploadProgress {
  pct: number;
  status: 'uploading' | 'complete' | 'error';
}

@Injectable({ providedIn: 'root' })
export class AdminMediaService {
  private readonly http = inject(HttpClient);
  private readonly config = inject(API_CONFIG);

  private mediaBase(listingId: string): string {
    return `${this.config.baseUrl}/admin/listings/${listingId}/media`;
  }

  // ── Photos ──────────────────────────────────────────────────────────────────

  listPhotos(listingId: string): Observable<PhotoDto[]> {
    return this.http.get<PhotoDto[]>(`${this.mediaBase(listingId)}/photos`);
  }

  presignPhoto(
    listingId: string,
    req: PhotoPresignRequest,
  ): Observable<PhotoPresignResponse> {
    return this.http.post<PhotoPresignResponse>(
      `${this.mediaBase(listingId)}/photos/presign`,
      req,
    );
  }

  confirmPhoto(
    listingId: string,
    photoId: string,
    req: PhotoConfirmRequest,
  ): Observable<PhotoDto> {
    return this.http.post<PhotoDto>(
      `${this.mediaBase(listingId)}/photos/${photoId}/confirm`,
      req,
    );
  }

  updatePhoto(
    listingId: string,
    photoId: string,
    req: PhotoUpdateRequest,
  ): Observable<PhotoDto> {
    return this.http.patch<PhotoDto>(
      `${this.mediaBase(listingId)}/photos/${photoId}`,
      req,
    );
  }

  deletePhoto(listingId: string, photoId: string): Observable<void> {
    return this.http.delete<void>(
      `${this.mediaBase(listingId)}/photos/${photoId}`,
    );
  }

  reorderPhotos(listingId: string, ids: string[]): Observable<void> {
    return this.http.post<void>(
      `${this.mediaBase(listingId)}/photos/reorder`,
      { ids },
    );
  }

  setPrimary(listingId: string, photoId: string): Observable<PhotoDto> {
    return this.http.post<PhotoDto>(
      `${this.mediaBase(listingId)}/photos/${photoId}/primary`,
      {},
    );
  }

  // ── 360° ────────────────────────────────────────────────────────────────────

  get360(listingId: string): Observable<Media360Dto | null> {
    return this.http.get<Media360Dto | null>(
      `${this.mediaBase(listingId)}/media-360`,
    );
  }

  presign360(
    listingId: string,
    req: Media360PresignRequest,
  ): Observable<Media360PresignResponse> {
    return this.http.post<Media360PresignResponse>(
      `${this.mediaBase(listingId)}/media-360/presign`,
      req,
    );
  }

  confirm360(
    listingId: string,
    media360Id: string,
    req: Media360ConfirmRequest,
  ): Observable<Media360Dto> {
    return this.http.post<Media360Dto>(
      `${this.mediaBase(listingId)}/media-360/${media360Id}/confirm`,
      req,
    );
  }

  delete360(listingId: string, media360Id: string): Observable<void> {
    return this.http.delete<void>(
      `${this.mediaBase(listingId)}/media-360/${media360Id}`,
    );
  }

  // ── Video ────────────────────────────────────────────────────────────────────

  getVideo(listingId: string): Observable<VideoDto | null> {
    return this.http.get<VideoDto | null>(
      `${this.mediaBase(listingId)}/video`,
    );
  }

  presignVideo(
    listingId: string,
    req: VideoPresignRequest,
  ): Observable<VideoPresignResponse> {
    return this.http.post<VideoPresignResponse>(
      `${this.mediaBase(listingId)}/video/presign`,
      req,
    );
  }

  confirmVideo(
    listingId: string,
    videoId: string,
    req: VideoConfirmRequest,
  ): Observable<VideoDto> {
    return this.http.post<VideoDto>(
      `${this.mediaBase(listingId)}/video/${videoId}/confirm`,
      req,
    );
  }

  deleteVideo(listingId: string, videoId: string): Observable<void> {
    return this.http.delete<void>(
      `${this.mediaBase(listingId)}/video/${videoId}`,
    );
  }

  // ── Direct-to-S3 upload ──────────────────────────────────────────────────────
  /**
   * PUT the file directly to the presigned S3/MinIO URL.
   * The auth interceptor will NOT attach a Bearer token because the URL
   * does not start with config.baseUrl (external host).
   * Emits progress events mapped to { pct, status }.
   */
  uploadToS3(
    presigned: { uploadUrl: string },
    file: File,
  ): Observable<UploadProgress> {
    const req = new HttpRequest('PUT', presigned.uploadUrl, file, {
      headers: new HttpHeaders({ 'Content-Type': file.type }),
      reportProgress: true,
    });

    return this.http.request(req).pipe(
      filter(
        (event) =>
          event.type === HttpEventType.UploadProgress ||
          event.type === HttpEventType.Response,
      ),
      map((event): UploadProgress => {
        if (event.type === HttpEventType.UploadProgress) {
          const total = event.total ?? file.size;
          const pct = total > 0 ? Math.round((event.loaded / total) * 100) : 0;
          return { pct, status: 'uploading' };
        }
        // HttpEventType.Response — upload complete
        return { pct: 100, status: 'complete' };
      }),
      catchError(() => throwError(() => ({ pct: 0, status: 'error' } as UploadProgress))),
    );
  }
}
