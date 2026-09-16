import { Injectable, signal } from '@angular/core';

declare const google: any;

@Injectable({
  providedIn: 'root',
})
export class GoogleUnkownService {
  // readonly idToken = signal<string | null>(null);

  // initializeGoogleSignIn(elementId: string, clientId: string): void {
  //   google.accounts.id.initialize({
  //     client_id: clientId,
  //     callback: (response: any) => {
  //       // response.credential contains the Google JWT ID Token
  //       this.idToken.set(response.credential);
  //     },
  //   });

  //   google.accounts.id.renderButton(
  //     document.getElementById(elementId),
  //     { theme: 'outline', size: 'large' }
  //   );
  // }

  // logout(): void {
  //   this.idToken.set(null);
  // }
}