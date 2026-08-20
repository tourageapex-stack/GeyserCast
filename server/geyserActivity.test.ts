import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { isInVisitorWindow, isPredictableUpcoming } from '../src/utils/geyserActivity';
import { UpcomingGeyserItem } from '../src/types';

function item(over: Partial<UpcomingGeyserItem> & { minutesUntilEruption: number; modelName?: string; confidence?: number }): UpcomingGeyserItem {
  return {
    geyser: {
      id: 'lion',
      geysertimesId: 14,
      name: 'Lion',
      normalizedName: 'lion',
      alternateNames: [],
      basin: 'Upper Geyser Basin',
      area: 'Geyser Hill',
      latitude: 44.46,
      longitude: -110.83,
      lastUpdated: '2026-08-20T00:00:00.000Z',
    },
    prediction: {
      id: 'p',
      geyserId: 'lion',
      createdAt: '2026-08-20T00:00:00.000Z',
      predictedTime: '2026-08-20T01:00:00.000Z',
      windowStart: '2026-08-20T00:50:00.000Z',
      windowEnd: '2026-08-20T01:10:00.000Z',
      confidence: over.confidence ?? 80,
      modelName: over.modelName ?? 'GeyserTimes.org',
      modelVersion: 'GeyserTimes Official',
      features: {
        currentIntervalMinutes: 40,
        historicalMedianMinutes: 90,
        historicalMeanMinutes: 90,
        recentIntervalTrend: 'Stable',
        usableObservationsCount: 12,
        modelUncertaintyMinutes: 10,
        observationQualityScore: 1,
      },
    },
    minutesUntilEruption: over.minutesUntilEruption,
    walkRoute: {
      originLatitude: 44.46,
      originLongitude: -110.83,
      destinationLatitude: 44.46,
      destinationLongitude: -110.83,
      mode: 'walking',
      distanceMiles: 0.2,
      durationMinutes: 4,
      provider: 'test',
      calculatedAt: '2026-08-20T00:00:00.000Z',
    },
    driveRoute: {
      originLatitude: 44.46,
      originLongitude: -110.83,
      destinationLatitude: 44.46,
      destinationLongitude: -110.83,
      mode: 'driving',
      distanceMiles: 0.3,
      durationMinutes: 2,
      provider: 'test',
      calculatedAt: '2026-08-20T00:00:00.000Z',
    },
    canMakeIt: {
      status: 'probably',
      label: 'Yes',
      minutesUntilEruption: over.minutesUntilEruption,
      travelTimeMinutes: 4,
      safetyBufferMinutes: 10,
      marginMinutes: 20,
      estimatedArrivalIso: '2026-08-20T00:04:00.000Z',
    },
  };
}

describe('geyser activity split', () => {
  it('keeps visitor-window official forecasts as predictable', () => {
    assert.equal(isInVisitorWindow(90), true);
    assert.equal(isInVisitorWindow(4000), false);
    assert.equal(isPredictableUpcoming(item({ minutesUntilEruption: 45 })), true);
  });

  it('sends stale catalog features to the quiet list', () => {
    const quiet = item({ minutesUntilEruption: 60 * 24 * 40, confidence: 30, modelName: 'Interval Estimate' });
    quiet.prediction.modelVersion = 'No recent GeyserTimes eruption';
    assert.equal(isPredictableUpcoming(quiet), false);
  });
});
