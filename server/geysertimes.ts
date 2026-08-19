import { Geyser, SyncStatus } from './types';
import {
  upsertGeyser,
  upsertEruption,
  getAllGeysers,
  getGeyserById,
  setSyncMeta,
  getSyncMeta,
  getTotalEruptionCount,
  remapGeysertimesIds,
  deleteSyntheticEruptions,
  upsertOfficialPrediction,
} from './db';
import {
  GeyserTimesEntry,
  GeyserTimesPrediction,
  parseGtDate,
  parseDurationMinutes,
  isGtFlagOn,
  pickOfficialPrediction,
  officialConfidence,
} from './geysertimesParse';

const GEYSERTIMES_API_BASE = 'https://www.geysertimes.org/api/v5';
const GT_USER_AGENT = 'GeyserCast/1.0 (https://github.com/tourageapex-stack/GeyserCast; geyser data viewer)';
const HISTORY_WINDOW_DAYS = 10;
const HISTORY_RESYNC_MS = 6 * 60 * 60 * 1000;

// Standard Geysers Dataset with accurate Yellowstone locations, rich details & photos
const SEED_GEYSERS: Omit<Geyser, 'lastUpdated'>[] = [
  {
    id: 'old-faithful',
    geysertimesId: 2,
    name: 'Old Faithful',
    normalizedName: 'old faithful',
    alternateNames: ['Old Faithful Geyser'],
    basin: 'Upper Geyser Basin',
    area: 'Old Faithful Area',
    latitude: 44.460464,
    longitude: -110.828155,
    metadata: {
      typicalIntervalMinutes: 94,
      durationMinutes: 4.5,
      predictability: 'High',
      heightFt: '106 – 185 ft (32 – 56 m)',
      tempFahrenheit: '204°F (95.5°C) at vent',
      waterVolume: '3,700 – 8,400 gallons',
      thermalType: 'Cone Geyser',
      imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1b/Old_Faithful_Geyser_Eruption%2C_Yellowstone_NP_-_2021.jpg/1200px-Old_Faithful_Geyser_Eruption%2C_Yellowstone_NP_-_2021.jpg',
      imageCaption: 'Old Faithful erupting into a crisp blue sky at Upper Geyser Basin',
      photographerCredit: 'National Park Service / Wikimedia Commons',
      description: 'Yellowstone’s world-renowned cone geyser, named in 1870 for its clockwork-like eruption intervals.',
      overview: 'Old Faithful is Yellowstone’s most iconic thermal feature, discovered during the 1870 Washburn-Langford-Doane Expedition. It erupts roughly 20 times a day with superheated water plumes reaching up to 185 feet. The park service accurately predicts its next eruption based on the exact duration of the preceding eruption.',
      funFacts: [
        'Old Faithful was the first geyser in Yellowstone National Park to be given an official name.',
        'Short eruptions (<2.5 min) result in shorter intervals (~65 min), while long eruptions (>3.5 min) lead to ~90-95 min intervals.',
        'Temperatures inside the plumbing vent have been measured at 244°F (118°C) at a depth of 72 feet.',
        'Over 137,000 recorded eruptions have been documented by National Park Service rangers and GeyserTimes logs.'
      ]
    },
  },
  {
    id: 'steamboat',
    geysertimesId: 163,
    name: 'Steamboat Geyser',
    normalizedName: 'steamboat geyser',
    alternateNames: ['Steamboat'],
    basin: 'Norris Geyser Basin',
    area: 'Back Basin',
    latitude: 44.7234895,
    longitude: -110.7030023,
    metadata: {
      typicalIntervalMinutes: 10080,
      durationMinutes: 20,
      predictability: 'Irregular',
      heightFt: '300 – 400 ft (90 – 120 m)',
      tempFahrenheit: '198°F (92°C)',
      waterVolume: 'Tens of thousands of gallons',
      thermalType: 'Major Cone / Fountain Geyser',
      imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a2/Steamboat_Geyser_eruption%2C_Yellowstone_National_Park%2C_2018.jpg/1200px-Steamboat_Geyser_eruption%2C_Yellowstone_National_Park%2C_2018.jpg',
      imageCaption: 'Steamboat Geyser major eruption in Norris Geyser Basin',
      photographerCredit: 'USGS / Yellowstone Volcano Observatory',
      description: 'The tallest active geyser in the world, capable of shooting water higher than the Statue of Liberty.',
      overview: 'Located in the hyper-active Norris Geyser Basin, Steamboat Geyser holds the title of the world’s tallest active geyser. Major eruptions blast boiling water over 300 to 400 feet into the atmosphere for up to 40 minutes, followed by a roaring steam phase lasting up to 24 hours.',
      funFacts: [
        'Steamboat can throw mud, rocks, and silica sinter hundreds of feet into the forest canopy during major bursts.',
        'It lay mostly dormant for 50 years between 1911 and 1961 before embarking on a historic active streak in 2018.',
        'Slightly acidic thermal water at Norris allows colorful red-orange algae mats to grow around its discharge channel.',
        'Minor eruptions shooting 10–15 feet happen constantly every few minutes between major events.'
      ]
    },
  },
  {
    id: 'daisy',
    geysertimesId: 4,
    name: 'Daisy Geyser',
    normalizedName: 'daisy geyser',
    alternateNames: ['Daisy'],
    basin: 'Upper Geyser Basin',
    area: 'Daisy Group',
    latitude: 44.4701878,
    longitude: -110.8441868,
    metadata: {
      typicalIntervalMinutes: 140,
      durationMinutes: 3.5,
      predictability: 'Medium-High',
      heightFt: '75 – 110 ft (23 – 34 m)',
      tempFahrenheit: '201°F (94°C)',
      waterVolume: '~2,500 gallons',
      thermalType: 'Angle Cone Geyser',
      imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/87/Daisy_Geyser%2C_Yellowstone_National_Park%2C_2013-08-07.jpg/1200px-Daisy_Geyser%2C_Yellowstone_National_Park%2C_2013-08-07.jpg',
      imageCaption: 'Daisy Geyser blasting an angled jet of thermal water',
      photographerCredit: 'NPS / Wikimedia Commons',
      description: 'A highly reliable geyser that erupts at a dramatic 75-degree angle pointing northwest.',
      overview: 'Daisy Geyser is situated in the Daisy Group of the Upper Geyser Basin. Unlike most geysers that erupt straight upward, Daisy shoots a thick blue-white column of boiling water at a distinct 75-degree incline across its basin every 2 to 3 hours.',
      funFacts: [
        'Daisy shoots its jet sideways toward the boardwalk, giving visitors an up-close angled perspective.',
        'Nearby Splendor Geyser sometimes erupts in tandem with Daisy in a rare dual synchronized display.',
        'The 1959 Hebgen Lake earthquake altered Daisy’s subterranean plumbing, temporarily shifting its interval.'
      ]
    },
  },
  {
    id: 'castle',
    geysertimesId: 5,
    name: 'Castle Geyser',
    normalizedName: 'castle geyser',
    alternateNames: ['Castle'],
    basin: 'Upper Geyser Basin',
    area: 'Castle Group',
    latitude: 44.463668,
    longitude: -110.836486,
    metadata: {
      typicalIntervalMinutes: 840,
      durationMinutes: 20.0,
      predictability: 'Medium',
      heightFt: '75 – 90 ft (23 – 27 m)',
      tempFahrenheit: '201°F (94°C)',
      waterVolume: '~4,000 gallons',
      thermalType: 'Massive Sinter Cone Geyser',
      imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c2/Castle_Geyser_Eruption_Yellowstone_1998-08.jpg/1200px-Castle_Geyser_Eruption_Yellowstone_1998-08.jpg',
      imageCaption: 'Castle Geyser’s ancient white sinter fortress mound',
      photographerCredit: 'National Park Service',
      description: 'Boasts the largest and oldest sinter cone structure in the entire Upper Geyser Basin.',
      overview: 'Named for its resemblance to a ruined medieval castle, Castle Geyser erupts approximately every 12 to 14 hours. The eruption features a 20-minute water phase reaching 90 feet, followed by a deafening 1-hour steam engine phase.',
      funFacts: [
        'Castle’s massive white cone is estimated to be over 1,000 years old based on slow silica sinter accretion rates.',
        'The steam phase produces a jet-engine roar audible across the Firehole River valley.',
        'Petrified pine tree stumps embedded in silica sinter are visible near the outer perimeter of its mound.'
      ]
    },
  },
  {
    id: 'grand',
    geysertimesId: 13,
    name: 'Grand Geyser',
    normalizedName: 'grand geyser',
    alternateNames: ['Grand'],
    basin: 'Upper Geyser Basin',
    area: 'Geyser Hill',
    latitude: 44.4666627,
    longitude: -110.8370021,
    metadata: {
      typicalIntervalMinutes: 390,
      durationMinutes: 12.0,
      predictability: 'Medium',
      heightFt: '180 – 200 ft (55 – 60 m)',
      tempFahrenheit: '200°F (93°C)',
      waterVolume: 'Up to 10,000 gallons per burst cycle',
      thermalType: 'Fountain Geyser',
      imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0d/Grand_Geyser_Yellowstone.jpg/1200px-Grand_Geyser_Yellowstone.jpg',
      imageCaption: 'Grand Geyser’s immense fan-shaped fountain eruption',
      photographerCredit: 'Wikimedia Commons / Fechicco',
      description: 'The tallest predictable fountain geyser in the world, erupting in fan-shaped bursts.',
      overview: 'Grand Geyser erupts in a dramatic series of 1 to 4 powerful bursts over 10 minutes. Water explodes out of a large pool in wide fan shapes reaching 200 feet into the air, accompanied by nearby Turban and Vent Geysers.',
      funFacts: [
        'Grand, Turban, and Vent Geysers erupt simultaneously during Grand’s display for a 3-geyser spectacle!',
        'Ground vibrations from Grand Geyser can be felt through wooden boardwalk benches 200 feet away.',
        'Before erupting, Grand’s pool fills to overflowing and begins churning with large gas bubbles.'
      ]
    },
  },
  {
    id: 'riverside',
    geysertimesId: 7,
    name: 'Riverside Geyser',
    normalizedName: 'riverside geyser',
    alternateNames: ['Riverside'],
    basin: 'Upper Geyser Basin',
    area: 'Firehole River Area',
    latitude: 44.47347,
    longitude: -110.8409146,
    metadata: {
      typicalIntervalMinutes: 375,
      durationMinutes: 20.0,
      predictability: 'High',
      heightFt: '75 – 80 ft (23 – 24 m)',
      tempFahrenheit: '199°F (93°C)',
      waterVolume: '~5,500 gallons',
      thermalType: 'Riverbank Cone Geyser',
      imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/67/Riverside_Geyser_Yellowstone_NP.jpg/1200px-Riverside_Geyser_Yellowstone_NP.jpg',
      imageCaption: 'Riverside Geyser arching boiling water across the Firehole River',
      photographerCredit: 'Yellowstone National Park Service',
      description: 'Arches a picturesque rainbow-draped column of water across the Firehole River.',
      overview: 'Perched on the eastern bank of the Firehole River, Riverside Geyser shoots an angled 80-foot jet of water over the river. Afternoon eruptions frequently generate brilliant double rainbows in the spray.',
      funFacts: [
        'Riverside signals an upcoming eruption when water overflows its horn vent onto algae rocks 90 minutes in advance.',
        'Its arching spray reaches halfway across the 50-foot wide Firehole River.',
        'It is one of the most consistent major geysers in Yellowstone, with intervals holding steady near 6 hours.'
      ]
    },
  },
  {
    id: 'great-fountain',
    geysertimesId: 16,
    name: 'Great Fountain Geyser',
    normalizedName: 'great fountain geyser',
    alternateNames: ['Great Fountain'],
    basin: 'Lower Geyser Basin',
    area: 'Firehole Lake Drive',
    latitude: 44.536574,
    longitude: -110.8000526,
    metadata: {
      typicalIntervalMinutes: 660,
      durationMinutes: 45.0,
      predictability: 'Medium',
      heightFt: '75 – 220 ft (23 – 67 m)',
      tempFahrenheit: '198°F (92°C)',
      waterVolume: 'Over 20,000 gallons',
      thermalType: 'Terraced Pool Fountain Geyser',
      imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b3/Great_Fountain_Geyser_Yellowstone.jpg/1200px-Great_Fountain_Geyser_Yellowstone.jpg',
      imageCaption: 'Great Fountain Geyser erupting from layered silica rimstone terraces',
      photographerCredit: 'USGS / National Park Service',
      description: 'Erupts in majestic bursts from a series of stepped rimstone terraces in Lower Geyser Basin.',
      overview: 'Located on Firehole Lake Drive, Great Fountain Geyser erupts from the center of a wide pool rimmed by delicate mineral terraces. Eruptions occur in rhythmic super-bursts over 45 to 60 minutes, with the first burst soaring up to 220 feet.',
      funFacts: [
        'Great Fountain’s terraced pools fill with crystal-clear thermal water hours before the eruption begins.',
        'The first burst is usually the highest, shooting water over 200 feet high into the sky.',
        'Watching a sunset eruption at Great Fountain is widely rated among the top photography experiences in Yellowstone.'
      ]
    },
  },
  {
    id: 'beehive',
    geysertimesId: 1,
    name: 'Beehive Geyser',
    normalizedName: 'beehive geyser',
    alternateNames: ['Beehive'],
    basin: 'Upper Geyser Basin',
    area: 'Geyser Hill',
    latitude: 44.4626134,
    longitude: -110.8299965,
    metadata: {
      typicalIntervalMinutes: 960,
      durationMinutes: 5.0,
      predictability: 'Irregular',
      heightFt: '130 – 200 ft (40 – 60 m)',
      tempFahrenheit: '203°F (95°C)',
      waterVolume: '~4,000 gallons',
      thermalType: 'Narrow Cone Geyser',
      imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e0/Beehive_Geyser_1.jpg/1200px-Beehive_Geyser_1.jpg',
      imageCaption: 'Beehive Geyser’s high-pressure nozzle column soaring 200 feet high',
      photographerCredit: 'National Park Service',
      description: 'A high-pressure nozzle geyser that shoots a soaring 200-foot narrow jet of steam and boiling water.',
      overview: 'Beehive Geyser features a distinct 4-foot tall cone resembling an old-fashioned straw beehive. High underground steam pressures force a roaring 200-foot vertical column of water into the air during its 5-minute performance.',
      funFacts: [
        'Beehive has a small indicator vent called "Beehive’s Indicator". When the Indicator shoots a 5–15ft fountain, Beehive will almost always erupt within 5–20 minutes!',
        'Water escapes Beehive’s constricted 18-inch nozzle cone at speeds exceeding 50 mph.',
        'The silica sinter cone was formed from centuries of mineral precipitation.'
      ]
    },
  },
  {
    id: 'lone-star',
    geysertimesId: 75,
    name: 'Lone Star Geyser',
    normalizedName: 'lone star geyser',
    alternateNames: ['Lone Star'],
    basin: 'Lone Star Basin',
    area: 'Firehole River South',
    latitude: 44.4183661,
    longitude: -110.8067246,
    metadata: {
      typicalIntervalMinutes: 180,
      durationMinutes: 30.0,
      predictability: 'High',
      heightFt: '35 – 45 ft (11 – 14 m)',
      tempFahrenheit: '199°F (93°C)',
      waterVolume: '~2,000 gallons',
      thermalType: 'Solitary Cone Geyser',
      imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4b/Lone_Star_Geyser_Yellowstone.jpg/1200px-Lone_Star_Geyser_Yellowstone.jpg',
      imageCaption: 'Lone Star Geyser’s 12-foot cone in a quiet backcountry pine clearing',
      photographerCredit: 'NPS Backcountry Trails',
      description: 'A serene backcountry geyser reached by a 2.5-mile forest trail along the Firehole River.',
      overview: 'Lone Star Geyser stands alone in a quiet pine clearing south of Old Faithful. Eruptions occur every 3 hours like clockwork, featuring a 30-minute display culminating in a loud steam finale.',
      funFacts: [
        'Lone Star is accessible only by walking or biking a 2.5-mile paved trail along the Firehole River.',
        'Its 12-foot tall white cone is decorated with intricate scalloped silica sinter bands.',
        'A physical visitor logbook is kept in a weatherproof box near the bridge for hikers to record observations.'
      ]
    },
  },
  {
    id: 'echinus',
    geysertimesId: 81,
    name: 'Echinus Geyser',
    normalizedName: 'echinus geyser',
    alternateNames: ['Echinus'],
    basin: 'Norris Geyser Basin',
    area: 'Back Basin',
    latitude: 44.722006,
    longitude: -110.702055,
    metadata: {
      typicalIntervalMinutes: 540,
      durationMinutes: 4.0,
      predictability: 'Variable',
      heightFt: '40 – 60 ft (12 – 18 m)',
      tempFahrenheit: '195°F (90.5°C)',
      waterVolume: 'Variable pool discharge',
      thermalType: 'Acid-Sulfate Pool Geyser',
      imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6f/Echinus_Geyser_Norris_Geyser_Basin.jpg/1200px-Echinus_Geyser_Norris_Geyser_Basin.jpg',
      imageCaption: 'Echinus Geyser’s spiky red-stained acid pool in Norris Basin',
      photographerCredit: 'Norris Geyser Basin Observatory',
      description: 'The largest acid geyser in the world, with acidic water similar in pH to vinegar.',
      overview: 'Situated in the Back Basin of Norris Geyser Basin, Echinus is famous for its acidic water (pH ~3.5). Its crater is lined with spiky reddish silica crystals that resemble spiny sea urchins (Echinoidea).',
      funFacts: [
        'Echinus is as acidic as grapefruit juice or vinegar (pH 3.3 to 3.6)!',
        'Dissolved iron and aluminum oxides turn the mineral deposits around its pool vivid brick red and orange.',
        'In the 1980s it erupted every 35-75 minutes, but has since shifted into a more irregular cycle.'
      ]
    },
  },
  {
    id: 'plume',
    geysertimesId: 3,
    name: 'Plume Geyser',
    normalizedName: 'plume geyser',
    alternateNames: ['Plume'],
    basin: 'Upper Geyser Basin',
    area: 'Geyser Hill',
    latitude: 44.4627299,
    longitude: -110.8293979,
    metadata: {
      typicalIntervalMinutes: 85,
      durationMinutes: 3.0,
      predictability: 'Medium',
      heightFt: '25 – 35 ft (8 – 11 m)',
      tempFahrenheit: '200°F (93°C)',
      waterVolume: '~1,200 gallons',
      thermalType: 'Geyser Hill Vent',
      imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/62/Plume_Geyser_Yellowstone.jpg/1200px-Plume_Geyser_Yellowstone.jpg',
      imageCaption: 'Plume Geyser’s energetic multi-burst eruption on Geyser Hill',
      photographerCredit: 'NPS / Geyser Hill Survey',
      description: 'A frequent Geyser Hill performer shooting energetic 35-foot vertical bursts.',
      overview: 'Plume Geyser is located steps from the boardwalk on Geyser Hill. It erupts every 1 to 2 hours in a quick succession of 3 to 5 loud bursts, sending water 25 to 35 feet high.',
      funFacts: [
        'Plume Geyser was born in 1922 following a series of minor seismic tremors near Geyser Hill.',
        'Eruptions last only 3 to 5 minutes, providing a fast-paced stop for visitors on the main loop.'
      ]
    },
  },
  {
    id: 'grotto',
    geysertimesId: 21,
    name: 'Grotto Geyser',
    normalizedName: 'grotto geyser',
    alternateNames: ['Grotto'],
    basin: 'Upper Geyser Basin',
    area: 'Grotto Group',
    latitude: 44.4718025,
    longitude: -110.8417597,
    metadata: {
      typicalIntervalMinutes: 420,
      durationMinutes: 120.0,
      predictability: 'Complex',
      heightFt: '10 – 15 ft (3 – 5 m)',
      tempFahrenheit: '198°F (92°C)',
      waterVolume: 'Continuous heavy splash',
      thermalType: 'Arch Sinter Cone Geyser',
      imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/08/Grotto_Geyser_Yellowstone_NP.jpg/1200px-Grotto_Geyser_Yellowstone_NP.jpg',
      imageCaption: 'Grotto Geyser’s bizarre twisted silica arch cone structure',
      photographerCredit: 'National Park Service',
      description: 'Features a strange, hollow petrified arch cone that erupts for hours at a time.',
      overview: 'Grotto Geyser is instantly recognized by its bizarre hollow silica arches. Eruptions are unusually long, splashing water continuously for anywhere from 1 hour to over 10 hours.',
      funFacts: [
        'Grotto’s strange shape formed when silica sinter encased standing tree trunks centuries ago.',
        'Long eruptions of Grotto can influence nearby Spa Geyser and Rocket Geyser into activity.'
      ]
    },
  },
  {
    id: 'white-dome',
    geysertimesId: 65,
    name: 'White Dome Geyser',
    normalizedName: 'white dome geyser',
    alternateNames: ['White Dome'],
    basin: 'Lower Geyser Basin',
    area: 'Firehole Lake Drive',
    latitude: 44.539318,
    longitude: -110.8028189,
    metadata: {
      typicalIntervalMinutes: 30,
      durationMinutes: 2.0,
      predictability: 'High',
      heightFt: '30 – 35 ft (9 – 11 m)',
      tempFahrenheit: '201°F (94°C)',
      waterVolume: '~800 gallons',
      thermalType: 'Massive Silica Dome Geyser',
      imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/52/White_Dome_Geyser_Yellowstone.jpg/1200px-White_Dome_Geyser_Yellowstone.jpg',
      imageCaption: 'White Dome Geyser’s towering white cone along Firehole Lake Drive',
      photographerCredit: 'NPS / Firehole Lake Survey',
      description: 'Boasts a 12-foot bright white sinter mound that erupts frequently every 30 minutes.',
      overview: 'White Dome Geyser sits prominently along Firehole Lake Drive. Its massive 12-foot white mound is one of the thickest cones in the park, shooting a 30-foot burst of water every 20 to 30 minutes.',
      funFacts: [
        'White Dome’s cone is so thick that water escapes through a narrow 4-inch fissure at the top.',
        'Eruptions last only 2 minutes before fading into steam over vivid orange microbial mats.'
      ]
    },
  },
  {
    id: 'jewel',
    geysertimesId: 66,
    name: 'Jewel Geyser',
    normalizedName: 'jewel geyser',
    alternateNames: ['Jewel'],
    basin: 'Upper Geyser Basin',
    area: 'Biscuit Basin',
    latitude: 44.4849062,
    longitude: -110.8561833,
    metadata: {
      typicalIntervalMinutes: 8.5,
      durationMinutes: 1.0,
      predictability: 'High',
      heightFt: '15 – 25 ft (5 – 8 m)',
      tempFahrenheit: '199°F (93°C)',
      waterVolume: '~500 gallons',
      thermalType: 'Bead Sinter Pool Geyser',
      imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d7/Jewel_Geyser_Biscuit_Basin_Yellowstone.jpg/1200px-Jewel_Geyser_Biscuit_Basin_Yellowstone.jpg',
      imageCaption: 'Jewel Geyser’s gem-encrusted silica bead basin in Biscuit Basin',
      photographerCredit: 'NPS / Biscuit Basin Observers',
      description: 'Erupts every 7 to 10 minutes surrounded by shiny pearl-like silica sinter beads.',
      overview: 'Jewel Geyser in Biscuit Basin erupts frequently every 7 to 10 minutes. It shoots rapid burst bursts surrounded by shiny black and white cauliflower-like silica pearls.',
      funFacts: [
        'The dark, shiny sinter nodules lining its pool resemble polished black pearls or gems.',
        'It erupts in 3 to 5 explosive bursts spaced a few seconds apart.'
      ]
    },
  },
];
let globalSyncStatus: SyncStatus = {
  lastSyncAt: getSyncMeta('lastSyncAt'),
  status: 'idle',
  geysersCount: 0,
  eruptionsCount: 0,
  recentAddedCount: 0,
  lastErrorMessage: null,
};

export function getGlobalSyncStatus(): SyncStatus {
  const geysers = getAllGeysers();
  globalSyncStatus.geysersCount = geysers.length;
  globalSyncStatus.eruptionsCount = getTotalEruptionCount();
  return globalSyncStatus;
}

function featuredGeyserTimesIds(): number[] {
  return SEED_GEYSERS.map((g) => g.geysertimesId);
}

async function fetchGtJson<T>(path: string, timeoutMs = 12000): Promise<T> {
  const res = await fetch(`${GEYSERTIMES_API_BASE}${path}`, {
    headers: { 'User-Agent': GT_USER_AGENT, Accept: 'application/json' },
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!res.ok) {
    throw new Error(`GeyserTimes ${path} failed with HTTP ${res.status}`);
  }
  return (await res.json()) as T;
}

function ingestEntry(entry: GeyserTimesEntry): boolean {
  const gtId = Number(entry.geyserID);
  if (!Number.isFinite(gtId)) return false;
  const geyser = getGeyserById(String(gtId));
  if (!geyser) return false;

  const eruptionTime = parseGtDate(entry.time);
  if (!eruptionTime) return false;

  const eruptionId = entry.eruptionID ? `gt-${entry.eruptionID}` : `gt-${geyser.id}-${entry.time}`;
  const flags = entry as unknown as Record<string, unknown>;

  upsertEruption({
    id: eruptionId,
    geysertimesId: entry.eruptionID ? Number(entry.eruptionID) : undefined,
    geyserId: geyser.id,
    eruptionTime,
    duration: parseDurationMinutes(entry),
    exact: isGtFlagOn(flags, 'exact'),
    approximate: isGtFlagOn(flags, 'A', 'a'),
    electronic: isGtFlagOn(flags, 'E', 'e'),
    webcam: isGtFlagOn(flags, 'wc'),
    questionable: isGtFlagOn(flags, 'q'),
    major: isGtFlagOn(flags, 'maj'),
    minor: isGtFlagOn(flags, 'min'),
    initial: isGtFlagOn(flags, 'ini'),
    comment: entry.comment || '',
    sourceUpdatedAt: parseGtDate(entry.timeUpdated) || undefined,
    importedAt: new Date().toISOString(),
  });
  return true;
}

function ingestOfficialPredictions(predictions: GeyserTimesPrediction[]) {
  const fetchedAt = new Date().toISOString();
  for (const seed of SEED_GEYSERS) {
    const picked = pickOfficialPrediction(predictions, seed.geysertimesId);
    if (!picked) continue;
    const predictedTime = parseGtDate(picked.prediction);
    if (!predictedTime) continue;
    const windowStart = parseGtDate(picked.windowOpen) || predictedTime;
    const windowEnd = parseGtDate(picked.windowClose) || predictedTime;
    upsertOfficialPrediction({
      geyserId: seed.id,
      predictedTime,
      windowStart,
      windowEnd,
      confidence: officialConfidence(picked),
      probability: Number(picked.probability) || undefined,
      method: picked.method || 'GeyserTimes.org',
      comment: picked.comment || '',
      sourceUser: picked.userName || 'GeyserTimes',
      lastReportTime: parseGtDate(picked.lastReportTime) || undefined,
      fetchedAt,
    });
  }
}

function shouldRefreshHistory(): boolean {
  if (getTotalEruptionCount() < 20) return true;
  const last = getSyncMeta('lastHistorySyncAt');
  if (!last) return true;
  const elapsed = Date.now() - new Date(last).getTime();
  return Number.isNaN(elapsed) || elapsed > HISTORY_RESYNC_MS;
}

export async function initializeSeedDataIfNeeded() {
  const nowIso = new Date().toISOString();
  console.log('[GeyserTimes] Upserting featured Yellowstone geyser catalog...');
  remapGeysertimesIds(SEED_GEYSERS.map((g) => ({ id: g.id, geysertimesId: g.geysertimesId })));
  for (const sg of SEED_GEYSERS) {
    upsertGeyser({ ...sg, lastUpdated: nowIso });
  }
}

/**
 * Live GeyserTimes.org API v5 sync: latest eruptions, recent history, official predictions.
 */
export async function syncWithGeyserTimes(): Promise<SyncStatus> {
  globalSyncStatus.status = 'syncing';
  let addedCount = 0;

  try {
    const ids = featuredGeyserTimesIds().join(';');

    const predPayload = await fetchGtJson<{ status?: string; predictions?: GeyserTimesPrediction[] }>(
      `/predictions_latest?iso=1`
    );
    if (Array.isArray(predPayload.predictions)) {
      ingestOfficialPredictions(predPayload.predictions);
    }

    const latestPayload = await fetchGtJson<{ status?: string; entries?: GeyserTimesEntry[] }>(
      `/entries_latest/${ids}?iso=1`
    );
    for (const entry of latestPayload.entries || []) {
      if (ingestEntry(entry)) addedCount += 1;
    }

    if (shouldRefreshHistory()) {
      const nowSec = Math.floor(Date.now() / 1000);
      const fromSec = nowSec - HISTORY_WINDOW_DAYS * 24 * 3600;
      const historyPayload = await fetchGtJson<{ status?: string; entries?: GeyserTimesEntry[] }>(
        `/entries/${fromSec}/${nowSec}/${ids}?iso=1&primary=1`,
        20000
      );
      let historyCount = 0;
      for (const entry of historyPayload.entries || []) {
        if (ingestEntry(entry)) historyCount += 1;
      }
      if (historyCount > 0) {
        deleteSyntheticEruptions();
        setSyncMeta('lastHistorySyncAt', new Date().toISOString());
        addedCount += historyCount;
      }
    }

    const nowIso = new Date().toISOString();
    setSyncMeta('lastSyncAt', nowIso);
    globalSyncStatus.lastSyncAt = nowIso;
    globalSyncStatus.status = 'success';
    globalSyncStatus.recentAddedCount = addedCount;
    globalSyncStatus.lastErrorMessage = null;
  } catch (err: any) {
    console.warn('[GeyserTimes Sync Warning]', err?.message || err);
    globalSyncStatus.status = 'error';
    globalSyncStatus.lastErrorMessage =
      err?.message || 'GeyserTimes connection timeout. Using last local cache.';
  }

  return getGlobalSyncStatus();
}
