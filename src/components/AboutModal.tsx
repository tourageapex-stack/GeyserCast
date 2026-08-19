import React from 'react';
import { ShieldAlert, Database, Flame } from 'lucide-react';
import { GeyserCastLogo } from './GeyserCastLogo';

export const AboutModal: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto space-y-6 text-stone-100">
      <div className="bg-stone-900 border border-stone-800 rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex items-center space-x-3 border-b border-stone-800 pb-4">
          <GeyserCastLogo className="w-11 h-11" size={44} alt="GeyserCast" />
          <div>
            <h2 className="text-2xl font-bold text-amber-300">About GeyserCast</h2>
            <p className="text-xs text-stone-400">
              Data Sources, Mathematical Prediction Methods, and Safety Guidelines
            </p>
          </div>
        </div>

        {/* Primary Attribution */}
        <div className="bg-stone-950 p-4 rounded-xl border border-stone-800 space-y-2 text-xs leading-relaxed">
          <div className="flex items-center space-x-2 text-amber-400 font-bold text-sm">
            <Database className="w-4 h-4" />
            <span>Primary Data Source & Attribution</span>
          </div>
          <p className="text-stone-300">
            This application contains information from{' '}
            <a
              href="https://geysertimes.org/"
              target="_blank"
              rel="noreferrer"
              className="text-amber-400 hover:underline font-bold"
            >
              GeyserTimes
            </a>
            , which is made available here under the{' '}
            <a
              href="https://opendatacommons.org/licenses/odbl/"
              target="_blank"
              rel="noreferrer"
              className="text-amber-400 hover:underline font-bold"
            >
              Open Database License (ODbL)
            </a>
            . We credit GeyserTimes.org and its community of observers, webcams, and electronic monitors.
          </p>
          <div className="pt-2 flex flex-wrap gap-3">
            <a
              href="https://geysertimes.org/"
              target="_blank"
              rel="noreferrer"
              className="bg-stone-900 hover:bg-stone-800 text-amber-400 px-3 py-1.5 rounded-lg border border-stone-700 font-semibold transition"
            >
              Visit GeyserTimes.org ↗
            </a>
            <a
              href="https://docs.geysertimes.org/devs/intro"
              target="_blank"
              rel="noreferrer"
              className="bg-stone-900 hover:bg-stone-800 text-stone-300 px-3 py-1.5 rounded-lg border border-stone-700 font-semibold transition"
            >
              Developer API Documentation ↗
            </a>
          </div>
        </div>

        {/* Prediction Methodology */}
        <div className="bg-stone-950 p-4 rounded-xl border border-stone-800 space-y-2 text-xs leading-relaxed">
          <div className="flex items-center space-x-2 text-amber-400 font-bold text-sm">
            <Flame className="w-4 h-4" />
            <span>Statistical & ML Prediction Engine</span>
          </div>
          <p className="text-stone-300">
            GeyserCast uses official GeyserTimes.org / NPS prediction windows when they exist. If a geyser has no live forecast, it falls back to an interval estimate from recent GeyserTimes eruption records (and, in Statistical mode, EWMA / Old Faithful duration rules). These are estimates, not guarantees.
          </p>
          <p className="text-stone-400">
            Gemini AI is used exclusively for natural-language filter translation and answering visitor questions using structured database records. Gemini never invents or guesses numerical eruption times.
          </p>
          <p className="text-stone-400">
            Geyser photographs are the real Wikimedia Commons / Wikipedia article images for each feature, proxied by this app. Credits appear on the detail view.
          </p>
        </div>

        {/* Safety Disclaimer */}
        <div className="bg-amber-950/60 border border-amber-500/60 p-4 rounded-xl text-amber-200 text-xs space-y-2">
          <div className="flex items-center space-x-2 font-bold text-amber-300 text-sm">
            <ShieldAlert className="w-4 h-4" />
            <span>Park Visitor Safety Disclaimer</span>
          </div>
          <p>
            Geyser eruption predictions are statistical estimates and are not guaranteed. Geysers are natural thermal features and can erupt earlier or later than predicted, or enter dormant periods without notice.
          </p>
          <p className="font-bold">
            Never run, hurry unsafely, leave designated boardwalks/trails, or violate Yellowstone National Park regulations to reach a geyser. Always follow National Park Service signs and thermal safety rules.
          </p>
        </div>
      </div>
    </div>
  );
};
