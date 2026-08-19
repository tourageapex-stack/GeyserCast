import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  parseGtDate,
  parseDurationMinutes,
  isGtFlagOn,
  pickOfficialPrediction,
  officialConfidence,
} from './geysertimesParse';

describe('parseGtDate', () => {
  it('normalizes +0000 offsets', () => {
    const iso = parseGtDate('2026-08-19T17:05:00+0000');
    assert.equal(iso, '2026-08-19T17:05:00.000Z');
  });

  it('normalizes mountain -0600 offsets', () => {
    const iso = parseGtDate('2026-08-17T14:58:00-0600');
    assert.equal(iso, '2026-08-17T20:58:00.000Z');
  });

  it('accepts unix seconds', () => {
    const iso = parseGtDate(1787159379);
    assert.ok(iso?.startsWith('2026-08-19T'));
  });
});

describe('parseDurationMinutes', () => {
  it('prefers durationSec', () => {
    assert.equal(parseDurationMinutes({ durationSec: '255', duration: '4m15s' }), 4.3);
  });

  it('parses free-form duration strings', () => {
    assert.equal(parseDurationMinutes({ duration: '23m 49s' }), 23.8);
    assert.equal(parseDurationMinutes({ duration: '5m35s' }), 5.6);
  });
});

describe('isGtFlagOn', () => {
  it('reads capital and lowercase flags', () => {
    assert.equal(isGtFlagOn({ exact: '1', A: '0' }, 'exact'), true);
    assert.equal(isGtFlagOn({ A: '1' }, 'A', 'a'), true);
    assert.equal(isGtFlagOn({ wc: '0' }, 'wc'), false);
  });
});

describe('pickOfficialPrediction', () => {
  const now = Date.parse('2026-08-19T18:00:00Z');
  const rows = [
    {
      geyser: '2',
      userID: '44',
      userName: 'Geysers.net',
      prediction: '2026-08-19T18:50:00+0000',
      expiration: '2026-08-19T19:16:00+0000',
      futureEruptionNumber: '1',
      probability: '0.9',
    },
    {
      geyser: '2',
      userID: '208',
      userName: 'GeyserTimes',
      prediction: '2026-08-19T18:54:00+0000',
      expiration: '2026-08-19T20:00:00+0000',
      futureEruptionNumber: '1',
      probability: '0.0',
    },
    {
      geyser: '2',
      userID: '208',
      userName: 'GeyserTimes',
      prediction: '2026-08-19T20:30:00+0000',
      expiration: '2026-08-19T22:00:00+0000',
      futureEruptionNumber: '2',
      probability: '0.8',
    },
  ];

  it('prefers GeyserTimes/NPS next-eruption forecasts', () => {
    const picked = pickOfficialPrediction(rows, 2, now);
    assert.equal(picked?.userID, '208');
    assert.equal(picked?.prediction, '2026-08-19T18:54:00+0000');
  });

  it('maps zero probability to a default confidence', () => {
    const picked = pickOfficialPrediction(rows, 2, now);
    assert.equal(officialConfidence(picked!), 80);
  });
});
