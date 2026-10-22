import { LocalizedText, ProductOption, SelectedOption } from '../../core/models';

/**
 * Option-selection helpers shared by Quick Add. Same matching rule as the
 * product details page and the backend: groups/values are matched by their
 * English name.
 */

export function isOptionSelected(
  selected: SelectedOption[],
  groupName: LocalizedText,
  valueName: LocalizedText,
): boolean {
  return selected.some((o) => o.name.en === groupName.en && o.value.en === valueName.en);
}

/** Replaces the choice for a group (one value per group). */
export function selectOptionValue(
  selected: SelectedOption[],
  groupName: LocalizedText,
  valueName: LocalizedText,
): SelectedOption[] {
  return [...selected.filter((o) => o.name.en !== groupName.en), { name: groupName, value: valueName }];
}

/** Option groups that still have no chosen value. */
export function missingOptionGroups(
  options: ProductOption[] | undefined,
  selected: SelectedOption[],
): ProductOption[] {
  return (options ?? []).filter((g) => !selected.some((o) => o.name.en === g.name.en));
}
