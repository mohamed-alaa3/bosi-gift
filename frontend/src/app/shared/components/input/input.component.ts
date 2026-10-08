  import { CommonModule } from '@angular/common';
  import { Component, computed, forwardRef, input, output, signal } from '@angular/core';
  import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

  export type InputType = 'text' | 'email' | 'password' | 'tel' | 'number' | 'search' | 'url';

  @Component({
    selector: 'app-input',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './input.component.html',
    styleUrl: './input.component.scss',
    providers: [
      {
        provide: NG_VALUE_ACCESSOR,
        useExisting: forwardRef(() => InputComponent),
        multi: true,
      },
    ],
  })
  export class InputComponent implements ControlValueAccessor {
    readonly label = input<string>('');
    readonly type = input<InputType>('text');
    readonly placeholder = input<string>('');
    readonly hint = input<string>('');
    readonly error = input<string>('');
    readonly required = input(false);
    readonly disabled = input(false);
    readonly autocomplete = input<string>('');
    readonly inputId = input<string>(`app-input-${Math.random().toString(36).slice(2, 8)}`);
    readonly showPasswordToggle = input(false);

    readonly blurred = output<void>();
    readonly focused = output<void>();

    /** Internal value (the actual string) */
    protected readonly value = signal<string>('');
    protected readonly touched = signal(false);
    protected readonly isDisabled = signal(false);

    /** Password visibility toggle */
    protected readonly passwordVisible = signal(false);

    protected readonly effectiveType = computed(() => {
      if (this.type() === 'password' && this.passwordVisible()) return 'text';
      return this.type();
    });

    protected readonly showError = computed(() => !!this.error() && this.touched());
    protected readonly describedById = computed(() => `${this.inputId()}-desc`);
    protected readonly errorId = computed(() => `${this.inputId()}-error`);

    // --- CVA hooks ---
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

    // --- Event handlers ---
    protected onInput(event: Event): void {
      const target = event.target as HTMLInputElement;
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

    protected togglePassword(): void {
      this.passwordVisible.update((v) => !v);
    }

    protected isEffectivelyDisabled(): boolean {
      return this.disabled() || this.isDisabled();
    }
  }