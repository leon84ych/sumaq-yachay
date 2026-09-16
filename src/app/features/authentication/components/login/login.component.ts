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
      @if (authService.currentUser(); as user) {
        <div class="user-badge">
          <img [src]="user.picture" [alt]="user.name" class="avatar" />
          <span class="user-name">{{ user.name }}</span>
          <button type="button" (click)="logout()" class="btn-logout">{{'AUTH.SIGN_OUT' | transloco}}</button>
        </div>
      } @else {
        <div class="google-login-wrap" [attr.aria-label]="'AUTH.SIGN_IN' | transloco">
          <div id="google-btn" class="google-btn" aria-label="Google Sign In">{{'AUTH.SIGN_IN' | transloco}}</div>
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
      min-height: 0;
    }

    .google-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-height: 0;
      height: 34px;
      width: 34px;
      max-width: 34px;
      overflow: hidden;
      vertical-align: middle;
    }

    .google-btn ::ng-deep > div,
    .google-btn iframe {
      height: 34px !important;
      min-height: 18px !important;
      max-height: 34px !important;
      width: 34px !important;
      max-width: 34px !important;
      min-width: 18px !important;
    }
  `,
})
export class LoginComponent implements AfterViewInit {
  readonly authService = inject(GoogleAuthService);

  private readonly CLIENT_ID = '893818536709-k4m6pqgihkr146oteca8p3vr7b8auh55.apps.googleusercontent.com';

  ngAfterViewInit(): void {
    this.initGoogleButton();
  }

  private initGoogleButton(): void {
    if (this.authService.idToken()) return;

    if (typeof google !== 'undefined' && google.accounts?.id) {
      this.authService.renderGoogleButton('google-btn', this.CLIENT_ID);
    } else {
      setTimeout(() => this.initGoogleButton(), 100);
    }
  }

  logout(): void {
    this.authService.logout();
    setTimeout(() => this.initGoogleButton(), 0);
  }
}