import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { GEYSER_PHOTOS, matchGeyserPhotoKey, isUsableCommonsFile, geyserPhotoUrl } from '../src/data/geyserPhotos';

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
    assert.equal(matchGeyserPhotoKey('unng-ghg-18'), undefined);
  });

  it('has Commons files for newly catalogued geysers', () => {
    for (const id of ['lion', 'aurum', 'sawmill', 'fountain', 'clepsydra', 'giant', 'turban']) {
      assert.ok(GEYSER_PHOTOS[id], id);
      assert.ok(GEYSER_PHOTOS[id].commonsFiles.length > 0, id);
    }
    assert.equal(matchGeyserPhotoKey('anemone-big'), 'anemone');
    assert.equal(matchGeyserPhotoKey('beehives-indicator'), 'beehives-indicator');
    assert.equal(matchGeyserPhotoKey('old-tardy'), 'old-tardy');
  });

  it('rejects unusable Commons search hits', () => {
    assert.equal(isUsableCommonsFile('Lion Geyser eruption.jpg', 'Lion'), true);
    assert.equal(isUsableCommonsFile('Yellowstone Caldera map2.JPG', 'Lion'), false);
    assert.equal(isUsableCommonsFile('the land of geysers.pdf', 'Pyramid'), false);
    assert.equal(geyserPhotoUrl({ id: 'lion', name: 'Lion' }), '/api/geyser-photo/lion?name=Lion');
  });
});
