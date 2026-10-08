import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';

import { RevealOnScrollDirective } from '../../shared/directives/reveal-on-scroll.directive';

interface AboutValue {
  id: string;
  icon: string;
  titleKey: string;
  textKey: string;
}

interface AboutStat {
  id: string;
  value: string;
  labelKey: string;
}

@Component({
  selector: 'app-about-page',
  standalone: true,
  imports: [CommonModule, RouterLink, TranslatePipe, RevealOnScrollDirective],
  templateUrl: './about.page.html',
  styleUrl: './about.page.scss',
})
export class AboutPage {
  protected readonly values: AboutValue[] = [
    {
      id: 'craft',
      icon: 'M12 19l7-7 3 3-7 7-3-3zM18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5zM2 2l7.586 7.586M11 13a2 2 0 1 0 4 0 2 2 0 0 0-4 0z',
      titleKey: 'about.value1Title',
      textKey: 'about.value1Text',
    },
    {
      id: 'quality',
      icon: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10zM9 12l2 2 4-4',
      titleKey: 'about.value2Title',
      textKey: 'about.value2Text',
    },
    {
      id: 'heart',
      icon: 'M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z',
      titleKey: 'about.value3Title',
      textKey: 'about.value3Text',
    },
    {
      id: 'sustainability',
      icon: 'M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
      titleKey: 'about.value4Title',
      textKey: 'about.value4Text',
    },
  ];

  protected readonly stats: AboutStat[] = [
    { id: 'customers', value: '10k+', labelKey: 'about.statCustomers' },
    { id: 'products', value: '200+', labelKey: 'about.statProducts' },
    { id: 'countries', value: '25+', labelKey: 'about.statCountries' },
    { id: 'rating', value: '4.9★', labelKey: 'about.statRating' },
  ];
}
