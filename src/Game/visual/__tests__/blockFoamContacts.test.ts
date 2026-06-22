import {
  collectBlockFoamContacts,
  collectExposedHorizontalEdgeFoamContacts,
  collectGapEdgeFoamContacts,
} from '@/Game/visual/blockFoamContacts';

describe('collectGapEdgeFoamContacts', () => {
  const cols = 8;

  it('returns left and right pillars for a single central gap', () => {
    const contacts = collectGapEdgeFoamContacts([3, 4], cols);
    expect(contacts).toEqual([
      { col: 2, side: 'right' },
      { col: 5, side: 'left' },
    ]);
  });

  it('supports multipath rows with two gap ranges', () => {
    const contacts = collectGapEdgeFoamContacts([1, 2, 5, 6], cols);
    expect(contacts).toEqual([
      { col: 0, side: 'right' },
      { col: 3, side: 'left' },
      { col: 4, side: 'right' },
      { col: 7, side: 'left' },
    ]);
  });

  it('returns empty when the row is fully open', () => {
    expect(collectGapEdgeFoamContacts([0, 1, 2, 3, 4, 5, 6, 7], cols)).toEqual(
      []
    );
  });

  it('returns empty when there are no gaps', () => {
    expect(collectGapEdgeFoamContacts([], cols)).toEqual([]);
  });
});

describe('collectExposedHorizontalEdgeFoamContacts', () => {
  const cols = 8;

  it('marks top and bottom when no adjacent rows exist', () => {
    const contacts = collectExposedHorizontalEdgeFoamContacts([], null, null, cols);
    expect(contacts).toHaveLength(cols * 2);
    expect(contacts).toContainEqual({ col: 0, side: 'top' });
    expect(contacts).toContainEqual({ col: 0, side: 'bottom' });
  });

  it('adds top edge when the column is open in the row above', () => {
    const contacts = collectExposedHorizontalEdgeFoamContacts(
      [],
      [3, 4],
      [],
      cols
    );
    expect(contacts).toContainEqual({ col: 3, side: 'top' });
    expect(contacts).toContainEqual({ col: 4, side: 'top' });
    expect(contacts).not.toContainEqual({ col: 3, side: 'bottom' });
  });

  it('adds bottom edge when the column is open in the row below', () => {
    const contacts = collectExposedHorizontalEdgeFoamContacts(
      [],
      [],
      [1, 2],
      cols
    );
    expect(contacts).toContainEqual({ col: 1, side: 'bottom' });
    expect(contacts).toContainEqual({ col: 2, side: 'bottom' });
    expect(contacts).not.toContainEqual({ col: 1, side: 'top' });
  });

  it('skips horizontal edges when stacked solid columns align', () => {
    const contacts = collectExposedHorizontalEdgeFoamContacts([], [], [], cols);
    expect(contacts).toEqual([]);
  });
});

describe('collectBlockFoamContacts', () => {
  const cols = 8;

  it('combines gap-facing and exposed horizontal edges', () => {
    const contacts = collectBlockFoamContacts([3, 4], null, [1, 2], cols);
    expect(contacts).toEqual(
      expect.arrayContaining([
        { col: 2, side: 'right' },
        { col: 5, side: 'left' },
        { col: 2, side: 'bottom' },
      ])
    );
    expect(contacts).not.toContainEqual({ col: 5, side: 'bottom' });
  });
});
