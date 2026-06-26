import type {
  ClassProbability,
  DigitBattleResponse,
  DigitPredictionRequest,
  DigitPredictionResponse,
  DigitTransforms,
  ImageRepairBlockerResponse,
  PlaygroundModel,
  SoundPredictionResponse,
  StyleTransferResponse,
  TextPredictionResponse,
} from "../../../packages/types/src/playground";

export type {
  ClassProbability,
  DigitBattleResponse,
  DigitPredictionRequest,
  DigitPredictionResponse,
  DigitTransforms,
  ImageRepairBlockerResponse,
  PlaygroundModel,
  SoundPredictionResponse,
  StyleTransferResponse,
  TextPredictionResponse,
};

export interface DigitExperiment {
  id: string;
  createdAt: string;
  modelId: string;
  prediction: string;
  confidence: number;
  latencyMs: number;
  preprocessingMs: number;
  transforms: DigitTransforms;
}
