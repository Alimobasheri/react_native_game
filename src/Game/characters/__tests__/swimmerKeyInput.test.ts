import { keyToTapDirection, SWIMMER_KEYBOARD_KEYS } from '../swimmerKeyInput';

describe('keyToTapDirection', () => {
  it('maps left keys to -1', () => {
    expect(keyToTapDirection('ArrowLeft')).toBe(-1);
    expect(keyToTapDirection('a')).toBe(-1);
    expect(keyToTapDirection('A')).toBe(-1);
  });

  it('maps right keys to 1', () => {
    expect(keyToTapDirection('ArrowRight')).toBe(1);
    expect(keyToTapDirection('d')).toBe(1);
    expect(keyToTapDirection('D')).toBe(1);
  });

  it('returns null for unrelated keys', () => {
    expect(keyToTapDirection('ArrowUp')).toBeNull();
    expect(keyToTapDirection('w')).toBeNull();
    expect(keyToTapDirection(' ')).toBeNull();
  });

  it('SWIMMER_KEYBOARD_KEYS covers left and right mappings', () => {
    for (const key of SWIMMER_KEYBOARD_KEYS) {
      expect(keyToTapDirection(key)).not.toBeNull();
    }
  });
});
