import { CommonModule } from '@angular/common';
import {
  Component,
  ElementRef,
  HostListener,
  computed,
  forwardRef,
  inject,
  input,
  signal,
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { LocalizedText } from '../../../core/models';

export interface SelectOption {
  value: string;
  label: string | LocalizedText;
}

@Component({
  selector: 'app-select',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './select.component.html',
  styleUrl: './select.component.scss',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => SelectComponent),
      multi: true,
    },
  ],
})
export class SelectComponent implements ControlValueAccessor {
  private el = inject(ElementRef<HTMLElement>);

  readonly label = input<string>('');
  readonly placeholder = input<string>('Select an option');
  readonly hint = input<string>('');
  readonly error = input<string>('');
  readonly options = input<SelectOption[]>([]);
  readonly required = input(false);
  readonly disabled = input(false);
  readonly selectId = input<string>(`app-select-${Math.random().toString(36).slice(2, 8)}`);

  protected readonly value = signal<string>('');
  protected readonly touched = signal(false);
  protected readonly isDisabled = signal(false);
  protected readonly isOpen = signal(false);

  protected readonly showError = computed(() => !!this.error() && this.touched());
  protected readonly describedById = computed(() => `${this.selectId()}-desc`);
  protected readonly selectedOption = computed(() =>
    this.options().find((o) => o.value === this.value()) ?? null
  );

  private onChange: (value: string) => void = () => {};
  private onTouched: () => void = () => {};

  // --- CVA ---
  writeValue(value: string | null): void {
    this.value.set(value ?? '');
  }
  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }
  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }
  setDisabledState(isDisabled: boolean): void {
    this.isDisabled.set(isDisabled);
  }

  // --- UI ---
  protected toggle(): void {
    if (this.disabled() || this.isDisabled()) return;
    this.isOpen.update((v) => !v);
  }

  protected choose(option: SelectOption): void {
    this.value.set(option.value);
    this.onChange(option.value);
    this.isOpen.set(false);
    this.touched.set(true);
    this.onTouched();
  }

  protected getLabel(label: string | LocalizedText): string {
    if (typeof label === 'string') return label;
    return label.en || label.ar || '';
  }

  protected isEffectivelyDisabled(): boolean {
    return this.disabled() || this.isDisabled();
  }

  // Close when clicking outside
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.el.nativeElement.contains(event.target as Node)) {
      this.isOpen.set(false);
    }
  }

  // Keyboard support
  protected onKeydown(event: KeyboardEvent): void {
    if (this.isEffectivelyDisabled()) return;

    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this.toggle();
    } else if (event.key === 'Escape') {
      this.isOpen.set(false);
    }
  }
}