import { CommonModule } from '@angular/common';
import {
  Component,
  computed,
  forwardRef,
  input,
  output,
  signal,
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

@Component({
  selector: 'app-checkbox',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './checkbox.component.html',
  styleUrl: './checkbox.component.scss',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => CheckboxComponent),
      multi: true,
    },
  ],
})
export class CheckboxComponent implements ControlValueAccessor {
  readonly label = input<string>('');
  readonly hint = input<string>('');
  readonly error = input<string>('');
  readonly required = input(false);
  readonly disabled = input(false);
  readonly checkboxId = input<string>(
    `app-checkbox-${Math.random().toString(36).slice(2, 8)}`
  );

  readonly changed = output<boolean>();

  protected readonly checked = signal(false);
  protected readonly touched = signal(false);
  protected readonly isDisabled = signal(false);

  protected readonly showError = computed(() => !!this.error() && this.touched());

  private onChange: (value: boolean) => void = () => {};
  private onTouched: () => void = () => {};

  writeValue(value: boolean | null): void {
    this.checked.set(!!value);
  }
  registerOnChange(fn: (value: boolean) => void): void {
    this.onChange = fn;
  }
  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }
  setDisabledState(isDisabled: boolean): void {
    this.isDisabled.set(isDisabled);
  }

  protected onToggle(): void {
    if (this.isEffectivelyDisabled()) return;
    const next = !this.checked();
    this.checked.set(next);
    this.onChange(next);
    this.touched.set(true);
    this.onTouched();
    this.changed.emit(next);
  }

  protected onKeydown(event: KeyboardEvent): void {
    if (event.key === ' ' || event.key === 'Enter') {
      event.preventDefault();
      this.onToggle();
    }
  }

  protected isEffectivelyDisabled(): boolean {
    return this.disabled() || this.isDisabled();
  }
}