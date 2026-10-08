import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'app-brand-promise',
  standalone: true,
  imports: [CommonModule, RouterLink, TranslatePipe],
  templateUrl: './brand-promise.component.html',
  styleUrl: './brand-promise.component.scss',
})
export class BrandPromiseComponent {
  protected readonly image = 'assets/images/promise/brand-promise.jpg';
}
