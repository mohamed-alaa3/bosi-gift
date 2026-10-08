import { Injectable, signal } from '@angular/core';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface Toast {
  id: string;
  type: ToastType;
  message: string;
  duration: number;
  createdAt: number;
}

const DEFAULT_DURATION = 3500;

@Injectable({ providedIn: 'root' })
export class ToastService {
  private readonly _toasts = signal<Toast[]>([]);
  readonly toasts = this._toasts.asReadonly();

  /**
   * Show a toast. Returns the toast id.
   */
  show(message: string, type: ToastType = 'info', duration: number = DEFAULT_DURATION): string {
    const id = this.generateId();
    const toast: Toast = {
      id,
      type,
      message,
      duration,
      createdAt: Date.now(),
    };

    this._toasts.update((list) => [...list, toast]);

    if (duration > 0) {
      window.setTimeout(() => this.dismiss(id), duration);
    }

    return id;
  }

  success(message: string, duration?: number): string {
    return this.show(message, 'success', duration);
  }

  error(message: string, duration?: number): string {
    // Errors stay a bit longer
    return this.show(message, 'error', duration ?? 5000);
  }

  info(message: string, duration?: number): string {
    return this.show(message, 'info', duration);
  }

  warning(message: string, duration?: number): string {
    return this.show(message, 'warning', duration);
  }

  /**
   * Remove a specific toast by id.
   */
  dismiss(id: string): void {
    this._toasts.update((list) => list.filter((t) => t.id !== id));
  }

  /**
   * Remove all toasts.
   */
  clear(): void {
    this._toasts.set([]);
  }

  private generateId(): string {
    // Short unique id — good enough for toasts.
    return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
  }
}