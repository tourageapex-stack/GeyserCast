export interface GeyserPhotoSpec {
  /** Real Wikimedia Commons file titles (without the File: prefix). */
  commonsFiles: string[];
  caption: string;
  credit: string;
}

export const GEYSER_PHOTOS: Record<string, GeyserPhotoSpec> = {
  'old-faithful': {
    commonsFiles: [
      'Yellowstone National Park (WY, USA), Old Faithful Geyser -- 2022 -- 2599.jpg',
    ],
    caption: 'Old Faithful erupting in Upper Geyser Basin',
    credit: 'Dietmar Rabich / Wikimedia Commons (CC BY-SA 4.0)',
  },
  steamboat: {
    commonsFiles: ['Steamboatgeyser1.jpg', 'Steamboat Geyser Major Eruption in 2005.jpg'],
    caption: 'Steamboat Geyser in Norris Geyser Basin',
    credit: 'NPS / EE Mackin (public domain)',
  },
  daisy: {
    commonsFiles: ['Daisy Geyser erupting in Yellowstone National Park edit.jpg'],
    caption: 'Daisy Geyser erupting at a sharp angle',
    credit: 'Brocken Inaglory / Wikimedia Commons (CC BY-SA 3.0)',
  },
  castle: {
    commonsFiles: [
      'Steam Phase eruption of Castle geyser with double rainbow.jpg',
      'Yellowstone Castle Geysir Edit.jpg',
    ],
    caption: 'Castle Geyser steam phase with a double rainbow',
    credit: 'Brocken Inaglory / Wikimedia Commons (CC BY-SA 3.0)',
  },
  grand: {
    commonsFiles: ['Yellowstone Grand Geysir 02.jpg', 'Grand Geyser 2017 14.jpg'],
    caption: 'Grand Geyser erupting in Upper Geyser Basin',
    credit: 'Stefan Pauli / Wikimedia Commons (CC BY-SA 3.0)',
  },
  riverside: {
    commonsFiles: ['Rivererside Geyser Erupting.jpg', 'Riverside geyser in Yellowstone NP.jpg'],
    caption: 'Riverside Geyser arching over the Firehole River',
    credit: 'Eeekster / Wikimedia Commons (CC BY 4.0)',
  },
  'great-fountain': {
    commonsFiles: ['Great Fountain Geyser Sunset.jpg'],
    caption: 'Great Fountain Geyser erupting at sunset',
    credit: 'Flicka / Wikimedia Commons (CC BY-SA 3.0)',
  },
  beehive: {
    commonsFiles: ['Beehive geyser 2.jpg'],
    caption: 'Beehive Geyser’s narrow high-pressure column',
    credit: 'National Park Service (public domain)',
  },
  'lone-star': {
    commonsFiles: [
      'Lone Star Geyser 2016.jpg',
      'Lone Star Geyser in Yellowstone National Park, Wyoming, US.jpg',
    ],
    caption: 'Lone Star Geyser’s cone in a backcountry clearing',
    credit: 'Refmarino / Wikimedia Commons (CC BY-SA 4.0)',
  },
  echinus: {
    commonsFiles: ['Echinus geyser.jpg'],
    caption: 'Echinus Geyser in Norris Geyser Basin',
    credit: 'Bryan Harry / NPS (public domain)',
  },
  plume: {
    commonsFiles: ['Plume Geyser (2 June 2016).jpg'],
    caption: 'Plume Geyser on Geyser Hill',
    credit: 'James St. John / Wikimedia Commons (CC BY 2.0)',
  },
  grotto: {
    commonsFiles: [
      'Grotto Geyser erupting (mid-afternoon, 8 July 2014) (15106150617).jpg',
      'Grotto Geyser 2017 10.jpg',
    ],
    caption: 'Grotto Geyser erupting from its sinter arches',
    credit: 'James St. John / Wikimedia Commons (CC BY 2.0)',
  },
  'white-dome': {
    commonsFiles: [
      'White Dome Geyser (Lower Geyser Basin, Yellowstone National Park) 2021-08-10, 02.jpg',
    ],
    caption: 'White Dome Geyser along Firehole Lake Drive',
    credit: 'Steven Pavlov / Wikimedia Commons (CC BY-SA 4.0)',
  },
  jewel: {
    commonsFiles: ['Jewel Geyser Eruption (33821531885).jpg', 'Jewel Geyser Upper Basin.jpg'],
    caption: 'Jewel Geyser erupting in Biscuit Basin',
    credit: 'Jacob W. Frank / NPS (public domain)',
  },
  lion: {
    commonsFiles: [
      'Lion Geyser eruption (12 24-12 27 PM, 3 June 2014) 2 (15078016326).jpg',
      'Heart Spring and Lion Geyser in Yellowstone NP.jpg',
    ],
    caption: 'Lion Geyser on Geyser Hill',
    credit: 'James St. John / Wikimedia Commons (CC BY 2.0)',
  },
  'little-cub': {
    commonsFiles: [
      'Little Cub Geyser (center) & Big Cub Geyser (center right) (10 August 2013) 2.jpg',
    ],
    caption: 'Little Cub Geyser in the Lion Group',
    credit: 'James St. John / Wikimedia Commons (CC BY 2.0)',
  },
  lioness: {
    commonsFiles: ['Lioness Geyser.jpg'],
    caption: 'Lioness Geyser in the Lion Group',
    credit: 'Wikimedia Commons',
  },
  aurum: {
    commonsFiles: ['Aurum geyser.jpg', 'Aurum Geyser (10 August 2015) 1.jpg'],
    caption: 'Aurum Geyser on Geyser Hill',
    credit: 'Wikimedia Commons',
  },
  sawmill: {
    commonsFiles: ['Sawmill Geyser cone UGB YNP1.jpg'],
    caption: 'Sawmill Geyser cone in Upper Geyser Basin',
    credit: 'Wikimedia Commons',
  },
  fountain: {
    commonsFiles: [
      'Yellowstone National Park (WY, USA), Fountain Geyser -- 2022 -- 2443.jpg',
      'Fountain geyser.jpg',
    ],
    caption: 'Fountain Geyser in Lower Geyser Basin',
    credit: 'Dietmar Rabich / Wikimedia Commons (CC BY-SA 4.0)',
  },
  clepsydra: {
    commonsFiles: [
      'Yellowstone National Park (WY, USA), Clepsydra Geyser -- 2022 -- 2421.jpg',
    ],
    caption: 'Clepsydra Geyser in the Fountain Group',
    credit: 'Dietmar Rabich / Wikimedia Commons (CC BY-SA 4.0)',
  },
  artemisia: {
    commonsFiles: ['Artemisia Geyser YNP.JPG', 'Artemisia Geyser (33172012964).jpg'],
    caption: 'Artemisia Geyser in Upper Geyser Basin',
    credit: 'Wikimedia Commons',
  },
  'fan-and-mortar': {
    commonsFiles: [
      'Yellowstone Fan and Mortar Geysers.jpg',
      'Fan Geyser & Mortar Geyser (evening, 8 August 2017).jpg',
    ],
    caption: 'Fan and Mortar Geysers',
    credit: 'Wikimedia Commons',
  },
  oblong: {
    commonsFiles: [
      'Yellowstone oblong geyser erupting 20100825 170005 1 crop.jpg',
      'Oblong Geyser (13227452164).jpg',
    ],
    caption: 'Oblong Geyser erupting',
    credit: 'Wikimedia Commons',
  },
  depression: {
    commonsFiles: ['Yellowstone depression geyser 20100825 154824 2.jpg'],
    caption: 'Depression Geyser in Upper Geyser Basin',
    credit: 'Wikimedia Commons',
  },
  giant: {
    commonsFiles: ['Giant Geyser, Yellowstone National Park.jpg', 'GiantGeyserMarler1952.jpg'],
    caption: 'Giant Geyser in Upper Geyser Basin',
    credit: 'Wikimedia Commons',
  },
  giantess: {
    commonsFiles: ['GiantessGeyser-Douglass1969.jpg'],
    caption: 'Giantess Geyser in Upper Geyser Basin',
    credit: 'NPS / public domain',
  },
  atomizer: {
    commonsFiles: ['Atomizer Geyser (Yellowstone NP).jpg'],
    caption: 'Atomizer Geyser in Upper Geyser Basin',
    credit: 'Wikimedia Commons',
  },
  turban: {
    commonsFiles: ['Turban Geyser steam phase (33007722733).jpg', 'Turban Geyser 1.jpg'],
    caption: 'Turban Geyser steam phase',
    credit: 'James St. John / Wikimedia Commons (CC BY 2.0)',
  },
  anemone: {
    commonsFiles: ['Anemone Geyser.jpg'],
    caption: 'Anemone Geyser on Geyser Hill',
    credit: 'Wikimedia Commons',
  },
  rocket: {
    commonsFiles: ['Rocket Geyser 2.jpg', 'Grotto Geyser & Rocket Geyser.jpg'],
    caption: 'Rocket Geyser near Grotto',
    credit: 'Wikimedia Commons',
  },
  'grotto-fountain': {
    commonsFiles: ['Grotto fountain geyser 20100825 173237 1.jpg'],
    caption: 'Grotto Fountain Geyser',
    credit: 'Wikimedia Commons',
  },
  penta: {
    commonsFiles: ['Penta Geyser UGB YNP1.jpg'],
    caption: 'Penta Geyser in Upper Geyser Basin',
    credit: 'Wikimedia Commons',
  },
  spasmodic: {
    commonsFiles: ['Spasmodic geyser 20190713 155017 1.jpg', 'Spasmodic Geyser UGB YNP1.jpg'],
    caption: 'Spasmodic Geyser',
    credit: 'Wikimedia Commons',
  },
  'beehives-indicator': {
    commonsFiles: ["Beehive Geyser & Beehive's Indicator- James St. John 2015.jpg"],
    caption: "Beehive's Indicator erupting in front of Beehive",
    credit: 'James St. John / Wikimedia Commons (CC BY 2.0)',
  },
  'pink-cone': {
    commonsFiles: ['Pink cone geyser.jpg', 'Pink Cone Geyser (15459071001).jpg'],
    caption: 'Pink Cone Geyser in Lower Geyser Basin',
    credit: 'Wikimedia Commons',
  },
  imperial: {
    commonsFiles: ['Imperial Geyser looking south, Yellowstone.jpg'],
    caption: 'Imperial Geyser',
    credit: 'Wikimedia Commons',
  },
  whirligig: {
    commonsFiles: ['Whirligig Geyser - panoramio.jpg', 'Whirligig Geyser (13 May 2015) 2.jpg'],
    caption: 'Whirligig Geyser in Norris Geyser Basin',
    credit: 'Wikimedia Commons',
  },
  constant: {
    commonsFiles: ['Constant Geyser-20190614.jpg'],
    caption: 'Constant Geyser in Norris Geyser Basin',
    credit: 'Wikimedia Commons',
  },
  comet: {
    commonsFiles: ['Comet geyser.jpg', 'Comet Geyser preplay.jpg'],
    caption: 'Comet Geyser in Upper Geyser Basin',
    credit: 'Wikimedia Commons',
  },
  solitary: {
    commonsFiles: ['Solitary Geyser, Yellowstone National Park.jpg', 'Yellowstone Solitary geyser 02.jpg'],
    caption: 'Solitary Geyser',
    credit: 'Wikimedia Commons',
  },
  bijou: {
    commonsFiles: ['Bijou-geyser.jpg'],
    caption: 'Bijou Geyser in the Giant Group',
    credit: 'Wikimedia Commons',
  },
  cliff: {
    commonsFiles: ['Cliff Geyser (Upper Geyser Basin, Yellowstone National Park).jpg', 'Cliff geyser 20190714 131755 1.jpg'],
    caption: 'Cliff Geyser on the Firehole River',
    credit: 'Wikimedia Commons',
  },
  jet: {
    commonsFiles: ['Jet Geyser.JPG', 'Jet Geyser (19910596589).jpg'],
    caption: 'Jet Geyser in the Fountain Paint Pots',
    credit: 'Wikimedia Commons',
  },
  spouter: {
    commonsFiles: ['Spouter Geyser (33413671260).jpg', 'Spouter Geyser eruption (early afternoon, 19 June 2023) 2.jpg'],
    caption: 'Spouter Geyser',
    credit: 'James St. John / Wikimedia Commons (CC BY 2.0)',
  },
  flood: {
    commonsFiles: ['Flood Geyser post-eruption (19 June 2023).jpg'],
    caption: 'Flood Geyser along the Firehole River',
    credit: 'Wikimedia Commons',
  },
  percolator: {
    commonsFiles: ['West Triplet Geyser (right)-Percolator Geyser (left) dual eruption (1.37 PM on, 4 June 2013).jpg'],
    caption: 'Percolator Geyser with West Triplet',
    credit: 'James St. John / Wikimedia Commons (CC BY 2.0)',
  },
  porkchop: {
    commonsFiles: ['Porkchop Geyser 2.jpg'],
    caption: 'Porkchop Geyser in Norris Geyser Basin',
    credit: 'Wikimedia Commons',
  },
  vixen: {
    commonsFiles: ['Vixen Geyser 2017 03.jpg'],
    caption: 'Vixen Geyser in Norris Geyser Basin',
    credit: 'Wikimedia Commons',
  },
  monarch: {
    commonsFiles: ['Monarch Geyser (9 August 2011) 1.jpg'],
    caption: 'Monarch Geyser crater in Norris Geyser Basin',
    credit: 'James St. John / Wikimedia Commons (CC BY 2.0)',
  },
  veteran: {
    commonsFiles: ['Veteran Geyser (10 August 2011) 02.jpg'],
    caption: 'Veteran Geyser in Norris Geyser Basin',
    credit: 'James St. John / Wikimedia Commons (CC BY 2.0)',
  },
  'black-warrior': {
    commonsFiles: ['Black Warrior Lake & Steady Geyser (Black Warrior Geyser) 10.jpg'],
    caption: 'Black Warrior / Steady Geyser',
    credit: 'James St. John / Wikimedia Commons (CC BY 2.0)',
  },
  twig: {
    commonsFiles: ['Twig Geyser (12 July 2014).jpg'],
    caption: 'Twig Geyser',
    credit: 'James St. John / Wikimedia Commons (CC BY 2.0)',
  },
  tardy: {
    commonsFiles: ['Tardy Geyser (Sawmill Group).jpg', 'Tardy Geyser (late afternoon, 31 July 2017) 3.jpg'],
    caption: 'Tardy Geyser in the Sawmill Group',
    credit: 'Wikimedia Commons',
  },
  'old-tardy': {
    commonsFiles: ['Old Tardy C Geyser (14 August 2015) 2.jpg'],
    caption: 'Old Tardy Geyser',
    credit: 'James St. John / Wikimedia Commons (CC BY 2.0)',
  },
  bulger: {
    commonsFiles: ['Bulger Geyser cone UGB YNP1.jpg'],
    caption: 'Bulger Geyser cone',
    credit: 'Wikimedia Commons',
  },
  churn: {
    commonsFiles: ['Churn Geyser (8 June 2016).jpg'],
    caption: 'Churn Geyser',
    credit: 'James St. John / Wikimedia Commons (CC BY 2.0)',
  },
  rusty: {
    commonsFiles: ['Rusty Geyser 1.jpg'],
    caption: 'Rusty Geyser',
    credit: 'Wikimedia Commons',
  },
  rift: {
    commonsFiles: ['Rift Geyser (mid-afternoon, 4 August 2013) 05.jpg'],
    caption: 'Rift Geyser',
    credit: 'James St. John / Wikimedia Commons (CC BY 2.0)',
  },
  pump: {
    commonsFiles: ['Pump geyser.jpg', 'Pump geyser 20190715 085726 1.jpg'],
    caption: 'Pump Geyser',
    credit: 'Wikimedia Commons',
  },
  'little-squirt': {
    commonsFiles: ['Little Squirt Geyser eruption (42943802861).jpg'],
    caption: 'Little Squirt Geyser erupting',
    credit: 'Wikimedia Commons',
  },
  'little-brother': {
    commonsFiles: ['Little Brother Geyser eruption (evening, 13 June 2023).jpg'],
    caption: 'Little Brother Geyser erupting',
    credit: 'Wikimedia Commons',
  },
  'west-triplet': {
    commonsFiles: ['West Triplet Geyser UGB YNP1.jpg'],
    caption: 'West Triplet Geyser',
    credit: 'Wikimedia Commons',
  },
  spa: {
    commonsFiles: ['Spa Geyser (4 August 2013) 2.jpg'],
    caption: 'Spa Geyser',
    credit: 'James St. John / Wikimedia Commons (CC BY 2.0)',
  },
  morning: {
    commonsFiles: ['Morning Geyser-George Marler 1959.jpg'],
    caption: 'Morning Geyser',
    credit: 'NPS / George Marler (public domain)',
  },
  kaleidoscope: {
    commonsFiles: ['KaleidoscopeGeyser-Marler1965.jpg'],
    caption: 'Kaleidoscope Geyser',
    credit: 'NPS / George Marler (public domain)',
  },
};

export function geyserPhotoUrl(geyser: { id: string; name?: string }): string {
  const params = geyser.name ? `?name=${encodeURIComponent(geyser.name)}` : '';
  return `/api/geyser-photo/${encodeURIComponent(geyser.id)}${params}`;
}

/** Drop maps, audio, video, and documents from Commons search hits. */
export function isUsableCommonsFile(fileName: string, geyserName: string): boolean {
  const title = fileName.toLowerCase();
  if (/\.(pdf|webm|ogv|ogm|mp3|wav|svg|tiff?)$/i.test(fileName)) return false;
  if (/\b(map|caldera|logo|diagram|chart|sound library)\b/.test(title)) return false;
  const token = geyserName.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().split(/\s+/)[0];
  if (token && token.length >= 4 && !title.includes(token)) return false;
  return true;
}

export function matchGeyserPhotoKey(geyserId: string): string | undefined {
  const normId = geyserId.toLowerCase().trim();
  if (GEYSER_PHOTOS[normId]) return normId;
  return Object.keys(GEYSER_PHOTOS).find((key) => normId === key || normId.startsWith(`${key}-`));
}

export function geyserPhotoPlaceholderSvg(label: string): string {
  const safe = label.replace(/[<>&]/g, '');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="640">
    <rect width="100%" height="100%" fill="#1c1917"/>
    <text x="50%" y="50%" fill="#fbbf24" font-size="36" text-anchor="middle" dominant-baseline="middle" font-family="sans-serif">${safe}</text>
  </svg>`;
}

export function geyserPhotoPlaceholderDataUri(label: string): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(geyserPhotoPlaceholderSvg(label))}`;
}
