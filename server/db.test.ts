import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  upsertGeyser,
  getGeyserById,
  upsertEruption,
  getLastEruptionForGeyser,
  getTotalEruptionCount,
} from './db';

describe('in-memory db', () => {
  it('stores geysers and eruptions without sqlite', () => {
    upsertGeyser({
      id: 'test-vent',
      geysertimesId: 999001,
      name: 'Test Vent',
      normalizedName: 'test vent',
      alternateNames: [],
      basin: 'Test',
      area: 'Test',
      latitude: 44.4,
      longitude: -110.8,
      lastUpdated: new Date().toISOString(),
    });
    assert.equal(getGeyserById('test-vent')?.name, 'Test Vent');
    assert.equal(getGeyserById('999001')?.id, 'test-vent');

    const before = getTotalEruptionCount();
    upsertEruption({
      id: 'test-vent-er-1',
      geyserId: 'test-vent',
      eruptionTime: '2026-08-19T12:00:00.000Z',
      exact: true,
      approximate: false,
      electronic: false,
      webcam: false,
      questionable: false,
      importedAt: new Date().toISOString(),
    });
    assert.equal(getTotalEruptionCount(), before + 1);
    assert.equal(getLastEruptionForGeyser('test-vent')?.id, 'test-vent-er-1');
  });
});
