import { Component, AfterViewInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslocoPipe } from '@jsverse/transloco';
import { GoogleAuthService } from '../../services/google-auth-service';

declare const google: any;

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, TranslocoPipe],
  template: `
    <div class="auth-container">
      @if (authService.isSignedIn() && authService.currentUser(); as user) {
        <div class="user-badge">
          <img [src]="user.picture" [alt]="user.name" class="avatar" />
          <span class="user-name">{{ user.name }}</span>
          <button type="button" (click)="logout()" class="btn-logout">{{ 'AUTH.SIGN_OUT' | transloco }}</button>
        </div>
      } @else {
        <div class="google-login-wrap" aria-live="polite">
          <span class="not-signed-in-message">{{ 'AUTH.NOT_SIGNED_IN' | transloco }}</span>
          <button type="button" (click)="signIn()" class="btn-sign-in">
            {{ 'AUTH.SIGN_IN' | transloco }}
          </button>
        </div>
      }
    </div>
  `,
  styles: `
    :host {
      display: inline-flex;
      align-items: center;
      min-height: 0;
    }

    .auth-container {
      display: flex;
      align-items: center;
      min-height: 0;
      line-height: 1;
    }

    .user-badge {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      min-height: 0;
      max-height: 32px;
    }

    .avatar {
      width: 24px;
      height: 24px;
      border-radius: 50%;
      object-fit: cover;
      display: block;
    }

    .user-name {
      font-size: 0.8rem;
      color: #e3ebed;
      white-space: nowrap;
    }

    .btn-logout {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      border: 1px solid rgba(255, 255, 255, 0.25);
      background: rgba(255, 255, 255, 0.08);
      color: #fff;
      border-radius: 999px;
      padding: 0.3rem 0.6rem;
      font-size: 0.7rem;
      cursor: pointer;
      line-height: 1;
    }

    .google-login-wrap {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 0.55rem;
      min-height: 0;
    }

    .not-signed-in-message {
      color: #e3ebed;
      font-size: 0.75rem;
      white-space: nowrap;
    }

    .btn-sign-in {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-height: 34px;
      padding: 0.35rem 0.75rem;
      border: 1px solid rgba(255, 255, 255, 0.25);
      border-radius: 999px;
      background: rgba(255, 255, 255, 0.08);
      color: #ffffff;
      font-size: 0.75rem;
      font-weight: 600;
      cursor: pointer;
    }

    .btn-sign-in:hover {
      background: rgba(255, 255, 255, 0.16);
    }

    @media (max-width: 600px) {
      .user-name {
        display: none;
      }
    }
  `,
})
export class LoginComponent implements AfterViewInit {
  readonly authService = inject(GoogleAuthService);

  private readonly CLIENT_ID = '893818536709-k4m6pqgihkr146oteca8p3vr7b8auh55.apps.googleusercontent.com';

  ngAfterViewInit(): void {
    if (!this.authService.isSignedIn()) {
      this.authService.clearSession();
    }

    this.initializeGoogleIdentity();
  }

  private initializeGoogleIdentity(): void {
    if (this.authService.isSignedIn()) return;

    if (typeof google !== 'undefined' && google.accounts?.id) {
      this.authService.initializeGoogleIdentity(this.CLIENT_ID);
    } else {
      setTimeout(() => this.initializeGoogleIdentity(), 100);
    }
  }

  signIn(): void {
    this.authService.signIn();
  }

  logout(): void {
    this.authService.logout();
    setTimeout(() => this.initializeGoogleIdentity(), 0);
  }
}