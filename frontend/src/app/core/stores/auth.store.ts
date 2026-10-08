import { Injectable, signal, computed } from '@angular/core';
import { User } from '../models';

const TOKEN_KEY = 'habiba.token';
const USER_KEY = 'habiba.user';

/**
 * Auth state store.
 * Holds the current user + token, exposes signals for reactive UI.
 * Storage is synchronized with localStorage so a page refresh keeps the user logged in.
 */
@Injectable({ providedIn: 'root' })
export class AuthStore {
  private readonly _user = signal<User | null>(null);
  private readonly _token = signal<string | null>(null);
  private readonly _initialized = signal<boolean>(false);

  // Public read-only signals
  readonly user = this._user.asReadonly();
  readonly token = this._token.asReadonly();
  readonly initialized = this._initialized.asReadonly();

  // Derived
  readonly isAuthenticated = computed(() => !!this._token() && !!this._user());
  readonly isAdmin = computed(() => this._user()?.role === 'admin');
  readonly isCustomer = computed(() => this._user()?.role === 'customer');

  /**
   * Initialize from localStorage. Called once at app startup.
   */
  initialize(): void {
    try {
      const token = localStorage.getItem(TOKEN_KEY);
      const userRaw = localStorage.getItem(USER_KEY);
      const user = userRaw ? (JSON.parse(userRaw) as User) : null;

      if (token && user) {
        this._token.set(token);
        this._user.set(user);
      }
    } catch {
      /* ignore corrupted storage */
    } finally {
      this._initialized.set(true);
    }
  }

  /**
   * Save a successful login/registration.
   */
  setSession(user: User, token: string): void {
    this._user.set(user);
    this._token.set(token);

    try {
      localStorage.setItem(TOKEN_KEY, token);
      localStorage.setItem(USER_KEY, JSON.stringify(user));
    } catch {
      /* ignore */
    }
  }

  /**
   * Update the current user (e.g. after profile edit).
   */
  updateUser(user: User): void {
    this._user.set(user);
    try {
      localStorage.setItem(USER_KEY, JSON.stringify(user));
    } catch {
      /* ignore */
    }
  }

  /**
   * Clear the session (logout).
   */
  clear(): void {
    this._user.set(null);
    this._token.set(null);

    try {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
    } catch {
      /* ignore */
    }
  }
}