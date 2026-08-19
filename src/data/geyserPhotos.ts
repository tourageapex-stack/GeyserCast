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
};

export function matchGeyserPhotoKey(geyserId: string): string {
  const normId = geyserId.toLowerCase().trim();
  if (GEYSER_PHOTOS[normId]) return normId;
  const found = Object.keys(GEYSER_PHOTOS).find(
    (key) => normId.includes(key) || key.includes(normId)
  );
  return found || 'old-faithful';
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
