import { describe, expect, it } from 'vitest';

import { isOptionSelected, missingOptionGroups, selectOptionValue } from './product-options';
import { normalizeEgyptMobile } from './egypt-payment';

const color = { en: 'Color', ar: 'اللون' };
const size = { en: 'Size', ar: 'المقاس' };
const red = { en: 'Red', ar: 'أحمر' };
const blue = { en: 'Blue', ar: 'أزرق' };
const large = { en: 'L', ar: 'كبير' };

describe('product option helpers', () => {
  it('replaces the value of a group instead of adding a second one', () => {
    let sel = selectOptionValue([], color, red);
    sel = selectOptionValue(sel, color, blue);
    expect(sel).toHaveLength(1);
    expect(isOptionSelected(sel, color, blue)).toBe(true);
    expect(isOptionSelected(sel, color, red)).toBe(false);
  });

  it('reports groups that still need a choice', () => {
    const options = [
      { name: color, values: [{ name: red }, { name: blue }] },
      { name: size, values: [{ name: large }] },
    ];
    const sel = selectOptionValue([], color, red);
    expect(missingOptionGroups(options, sel).map((g) => g.name.en)).toEqual(['Size']);
    expect(missingOptionGroups(options, selectOptionValue(sel, size, large))).toEqual([]);
  });
});

describe('normalizeEgyptMobile (frontend mirror)', () => {
  it('accepts 010/011/012/015 and +20/0020 forms', () => {
    expect(normalizeEgyptMobile('01012345678')).toBe('01012345678');
    expect(normalizeEgyptMobile('+201112345678')).toBe('01112345678');
    expect(normalizeEgyptMobile('00201212345678')).toBe('01212345678');
    expect(normalizeEgyptMobile('0151 234 5678')).toBe('01512345678');
  });

  it('rejects other prefixes and wrong lengths', () => {
    expect(normalizeEgyptMobile('01312345678')).toBeNull();
    expect(normalizeEgyptMobile('0101234567')).toBeNull();
    expect(normalizeEgyptMobile('abc')).toBeNull();
  });
});
