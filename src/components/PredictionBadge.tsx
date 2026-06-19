import type { Prediction } from "../types/prode";
import { compactPredictionLabel, predictionLabel } from "../utils/format";

interface PredictionBadgeProps {
  prediction: Prediction;
}

export function PredictionBadge({ prediction }: PredictionBadgeProps) {
  const isEmpty = prediction === null;

  return (
    <span
      title={predictionLabel(prediction)}
      className={`inline-flex min-w-10 justify-center rounded-full px-2.5 py-1 text-xs font-black ring-1 ${
        isEmpty
          ? "bg-maize/15 text-amber-800 ring-maize/30"
          : "bg-ink text-chalk ring-ink"
      }`}
    >
      {compactPredictionLabel(prediction)}
    </span>
  );
}
