import { CommonModule } from '@angular/common';
import {
  Component,
  ElementRef,
  HostListener,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { debounceTime, distinctUntilChanged, Subject } from 'rxjs';

@Component({
  selector: 'app-search-bar',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './search-bar.component.html',
  styleUrl: './search-bar.component.scss',
})
export class SearchBarComponent {
  readonly placeholder = input<string>('Search...');
  readonly debounce = input<number>(300);
  readonly expanded = input<boolean>(false);
  readonly showShortcut = input<boolean>(true);

  readonly valueChange = output<string>();
  readonly submitted = output<string>();
  readonly opened = output<void>();
  readonly closed = output<void>();

  protected readonly value = signal<string>('');
  protected readonly isFocused = signal<boolean>(false);
  protected readonly isExpanded = signal<boolean>(false);

  protected readonly inputRef = viewChild<ElementRef<HTMLInputElement>>('inputEl');

  private search$ = new Subject<string>();

  constructor() {
    this.search$
      .pipe(debounceTime(this.debounce()), distinctUntilChanged())
      .subscribe((value) => this.valueChange.emit(value));
  }

  protected onInput(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.value.set(target.value);
    this.search$.next(target.value);
  }

  protected onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      this.submitted.emit(this.value());
    } else if (event.key === 'Escape') {
      this.clear();
      this.inputRef()?.nativeElement.blur();
    }
  }

  protected onFocus(): void {
    this.isFocused.set(true);
  }

  protected onBlur(): void {
    this.isFocused.set(false);
  }

  protected clear(): void {
    this.value.set('');
    this.search$.next('');
  }

  protected openExpanded(): void {
    this.isExpanded.set(true);
    this.opened.emit();
    // Focus the input after the DOM updates
    setTimeout(() => this.inputRef()?.nativeElement.focus());
  }

  protected closeExpanded(): void {
    this.isExpanded.set(false);
    this.closed.emit();
  }

  // Keyboard shortcut: Ctrl/Cmd + K
  @HostListener('document:keydown', ['$event'])
  protected onGlobalKeydown(event: KeyboardEvent): void {
    const isMac = navigator.platform.toUpperCase().includes('MAC');
    const modifier = isMac ? event.metaKey : event.ctrlKey;

    if (modifier && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      this.openExpanded();
    }
  }
}