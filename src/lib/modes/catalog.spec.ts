import { describe, expect, it } from 'vitest';
import { simulate } from '../core';
import {
  INSTALLED_MODES,
  resolveRoute,
  sortModesByRecent,
  validateModeCatalogue,
  type InstalledMode
} from './catalog';

describe('installed mode catalogue', () => {
  it('has unique, valid, honest release metadata', () => {
    expect(validateModeCatalogue(INSTALLED_MODES)).toEqual([]);
    expect(INSTALLED_MODES.map((mode) => mode.release.lifecycle)).toEqual([
      'live',
      'scaffold',
      'scaffold'
    ]);
  });

  it('rejects duplicate identities and malformed release metadata', () => {
    const invalid = [
      INSTALLED_MODES[0],
      {
        ...INSTALLED_MODES[0],
        release: {
          ...INSTALLED_MODES[0].release,
          version: 'latest',
          lastUpdated: '2026-02-31'
        }
      }
    ] as InstalledMode[];
    expect(validateModeCatalogue(invalid)).toEqual(expect.arrayContaining([
      'Duplicate mode id: biology',
      'Duplicate mode route: /biology',
      'Invalid semantic version for biology: latest',
      'Invalid ISO lastUpdated date for biology: 2026-02-31'
    ]));
  });

  it('orders recent edits first with a stable id tie-break', () => {
    const fixture = [
      { ...INSTALLED_MODES[2], id: 'galaxy', release: { ...INSTALLED_MODES[2].release, lastUpdated: '2026-08-20' } },
      { ...INSTALLED_MODES[1], id: 'firstlife', release: { ...INSTALLED_MODES[1].release, lastUpdated: '2026-08-24' } },
      { ...INSTALLED_MODES[0], id: 'biology', release: { ...INSTALLED_MODES[0].release, lastUpdated: '2026-08-24' } }
    ] as InstalledMode[];

    expect(sortModesByRecent(fixture).map((mode) => mode.id)).toEqual([
      'biology',
      'firstlife',
      'galaxy'
    ]);
  });

  it('resolves catalogue links and direct routes to the same descriptor', () => {
    for (const catalogueMode of INSTALLED_MODES) {
      const direct = resolveRoute(`${catalogueMode.route}/`);
      expect(direct.kind).toBe('mode');
      if (direct.kind === 'mode') expect(direct.mode).toBe(catalogueMode);
    }
    expect(resolveRoute('/')).toEqual({ kind: 'catalogue' });
    expect(resolveRoute('/social')).toEqual({ kind: 'not-found', pathname: '/social' });
  });

  it('pins the live biology route to the run manifest scenario identity', () => {
    const biology = resolveRoute('/biology');
    expect(biology.kind).toBe('mode');
    if (biology.kind === 'mode') {
      expect(biology.mode.composition.scenarioIdentity).toBe(simulate('route-manifest').manifest.scenarioId);
    }
  });
});
