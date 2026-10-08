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
  selector: 'app-textarea',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './textarea.component.html',
  styleUrl: './textarea.component.scss',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => TextareaComponent),
      multi: true,
    },
  ],
})
export class TextareaComponent implements ControlValueAccessor {
  readonly label = input<string>('');
  readonly placeholder = input<string>('');
  readonly hint = input<string>('');
  readonly error = input<string>('');
  readonly rows = input<number>(4);
  readonly maxLength = input<number | null>(null);
  readonly required = input(false);
  readonly disabled = input(false);
  readonly textareaId = input<string>(
    `app-textarea-${Math.random().toString(36).slice(2, 8)}`
  );

  readonly blurred = output<void>();
  readonly focused = output<void>();

  protected readonly value = signal<string>('');
  protected readonly touched = signal(false);
  protected readonly isDisabled = signal(false);

  protected readonly showError = computed(() => !!this.error() && this.touched());
  protected readonly describedById = computed(() => `${this.textareaId()}-desc`);
  protected readonly charCount = computed(() => this.value().length);
  protected readonly showCounter = computed(() => this.maxLength() !== null);

  private onChange: (value: string) => void = () => {};
  private onTouched: () => void = () => {};

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

  protected onInput(event: Event): void {
    const target = event.target as HTMLTextAreaElement;
    this.value.set(target.value);
    this.onChange(target.value);
  }

  protected onBlur(): void {
    this.touched.set(true);
    this.onTouched();
    this.blurred.emit();
  }

  protected onFocus(): void {
    this.focused.emit();
  }

  protected isEffectivelyDisabled(): boolean {
    return this.disabled() || this.isDisabled();
  }
}