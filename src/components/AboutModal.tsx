import React from 'react';
import { ExternalLink, Info, ShieldAlert, Database, Flame, Code } from 'lucide-react';

export const AboutModal: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto space-y-6 text-stone-100">
      <div className="bg-stone-900 border border-stone-800 rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex items-center space-x-3 border-b border-stone-800 pb-4">
          <div className="bg-amber-600 p-2.5 rounded-xl text-stone-950 font-bold">
            <Info className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-amber-300">About Yellowstone Geyser Predictor</h2>
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
            This application relies on primary geyser observation records and eruption archives provided by{' '}
            <a
              href="https://geysertimes.org/"
              target="_blank"
              rel="noreferrer"
              className="text-amber-400 hover:underline font-bold inline-flex items-center space-x-1"
            >
              <span>GeyserTimes.org</span>
              <ExternalLink className="w-3 h-3 inline" />
            </a>
            . We credit and express deep gratitude to GeyserTimes.org and its community of dedicated observers, webcams, and electronic monitoring networks for documenting Yellowstone thermal activity.
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
            Geyser eruption predictions are produced by server-side statistical models (Exponentially Weighted Moving Averages, Rolling Medians, Recent Trend Analysis, and Duration-Interval Correlation Regression) backtested chronologically against thousands of historical observations.
          </p>
          <p className="text-stone-400">
            Gemini AI is used exclusively for natural-language filter translation and answering visitor questions using structured database records. Gemini never invents or guesses numerical eruption times.
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
