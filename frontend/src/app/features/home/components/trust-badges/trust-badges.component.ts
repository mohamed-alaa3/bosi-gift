import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';

export interface TrustBadge {
  id: string;
  iconPath: string;
  titleKey: string;
  textKey: string;
}

@Component({
  selector: 'app-trust-badges',
  standalone: true,
  imports: [CommonModule, TranslatePipe],
  templateUrl: './trust-badges.component.html',
  styleUrl: './trust-badges.component.scss',
})
export class TrustBadgesComponent {
  protected readonly badges: TrustBadge[] = [
    {
      id: 'fast-delivery',
      iconPath:
        'M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2M15 18H9M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14v10a1 1 0 0 0 1 1ZM17 18a2 2 0 1 0 4 0 2 2 0 0 0-4 0ZM7 18a2 2 0 1 0-4 0 2 2 0 0 0 4 0Z',
      titleKey: 'home.trust.fastDelivery.title',
      textKey: 'home.trust.fastDelivery.text',
    },
    {
      id: 'secure-checkout',
      iconPath: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10ZM9 12l2 2 4-4',
      titleKey: 'home.trust.secureCheckout.title',
      textKey: 'home.trust.secureCheckout.text',
    },
    {
      id: 'support',
      iconPath:
        'M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10ZM12 6v6l4 2',
      titleKey: 'home.trust.support.title',
      textKey: 'home.trust.support.text',
    },
  ];
}
