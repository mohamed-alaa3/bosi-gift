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
  selector: 'app-quantity-stepper',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './quantity-stepper.component.html',
  styleUrl: './quantity-stepper.component.scss',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => QuantityStepperComponent),
      multi: true,
    },
  ],
})
export class QuantityStepperComponent implements ControlValueAccessor {
  readonly min = input<number>(1);
  readonly max = input<number | null>(null);
  readonly disabled = input(false);
  readonly size = input<'sm' | 'md'>('md');
  readonly valueInput = input<number | null>(null, { alias: 'value' });

  readonly valueChange = output<number>();

  protected readonly value = signal<number>(1);
  protected readonly isDisabled = signal(false);

  protected readonly canDecrease = computed(
    () => !this.isEffectivelyDisabled() && this.value() > this.min(),
  );
  protected readonly canIncrease = computed(() => {
    if (this.isEffectivelyDisabled()) return false;
    const max = this.max();
    return max === null ? true : this.value() < max;
  });

  private onChange: (value: number) => void = () => {};
  private onTouched: () => void = () => {};

  writeValue(value: number | null): void {
    this.value.set(typeof value === 'number' && value > 0 ? value : this.min());
  }
  registerOnChange(fn: (value: number) => void): void {
    this.onChange = fn;
  }
  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }
  setDisabledState(isDisabled: boolean): void {
    this.isDisabled.set(isDisabled);
  }

  protected increase(): void {
    if (!this.canIncrease()) return;
    this.update(this.value() + 1);
  }

  protected decrease(): void {
    if (!this.canDecrease()) return;
    this.update(this.value() - 1);
  }

  protected onInputChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    const parsed = parseInt(target.value, 10);
    if (isNaN(parsed)) {
      target.value = String(this.value());
      return;
    }
    const clamped = this.clamp(parsed);
    this.update(clamped);
    target.value = String(clamped);
  }

  private update(next: number): void {
    this.value.set(next);
    this.onChange(next);
    this.onTouched();
    this.valueChange.emit(next);
  }

  private clamp(n: number): number {
    const min = this.min();
    const max = this.max();
    let result = Math.max(min, n);
    if (max !== null) result = Math.min(max, result);
    return result;
  }

  protected isEffectivelyDisabled(): boolean {
    return this.disabled() || this.isDisabled();
  }
}