import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { GEYSER_PHOTOS, matchGeyserPhotoKey } from '../src/data/geyserPhotos';

const FEATURED = [
  'old-faithful',
  'steamboat',
  'daisy',
  'castle',
  'grand',
  'riverside',
  'great-fountain',
  'beehive',
  'lone-star',
  'echinus',
  'plume',
  'grotto',
  'white-dome',
  'jewel',
];

describe('geyser photos', () => {
  it('has Commons files for every featured geyser', () => {
    for (const id of FEATURED) {
      assert.ok(GEYSER_PHOTOS[id], id);
      assert.ok(GEYSER_PHOTOS[id].commonsFiles.length > 0, id);
      assert.doesNotMatch(GEYSER_PHOTOS[id].commonsFiles[0], /Unsplash/i);
    }
  });

  it('matches geyser ids without falling through to Old Faithful', () => {
    assert.equal(matchGeyserPhotoKey('beehive'), 'beehive');
    assert.equal(matchGeyserPhotoKey('Great-Fountain'), 'great-fountain');
    assert.equal(matchGeyserPhotoKey('unknown-vent'), undefined);
    assert.equal(matchGeyserPhotoKey('old-tardy'), undefined);
  });
});
