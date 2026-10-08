import { CommonModule } from '@angular/common';
import { Component, input } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'app-auth-panel',
  standalone: true,
  imports: [CommonModule, TranslatePipe],
  templateUrl: './auth-panel.component.html',
  styleUrl: './auth-panel.component.scss',
})
export class AuthPanelComponent {
  readonly image = input<string>('assets/images/auth/auth-hero.jpg');
}
