export type PlaygroundId = "digit-lab" | "image-repair" | "text-lab" | "sound-lab" | "style-studio" | "model-battle";
export type ModelPrecision = "float32" | "int8";

export interface ClassProbability {
  label: string;
  probability: number;
}

export interface PlaygroundModel {
  id: string;
  name: string;
  task: string;
  precision: ModelPrecision;
  localPath: string;
  sourceUrl: string;
  license: string;
  parameterCount: number;
  modelSizeBytes: number;
  available: boolean;
  notes: string;
}

export interface ModelAdapter<Input, Output> {
  id: string;
  task: string;
  predict(input: Input): Promise<Output>;
}

export interface DigitTransforms {
  rotation_degrees: number;
  noise_level: number;
  stroke_width?: number;
  seed?: number;
}

export interface DigitPredictionRequest {
  image_data_url: string;
  model_id: string;
  transforms: DigitTransforms;
  top_k: number;
}

export interface DigitPredictionResponse {
  model_id: string;
  model_name: string;
  prediction: string;
  confidence: number;
  probabilities: ClassProbability[];
  top_k: ClassProbability[];
  latency_ms: number;
  preprocessing_latency_ms: number;
  model_size_bytes: number;
  parameter_count: number;
  preprocessed_preview: string;
  transforms: DigitTransforms;
  explanation: string;
}

export interface DigitBattleResponse {
  results: DigitPredictionResponse[];
  agreement: boolean;
  latency_winner_model_id: string;
  confidence_delta: number;
  explanation: string;
}

export interface TextPredictionResponse {
  model_id: string;
  model_name: string;
  prediction: string;
  confidence: number;
  probabilities: ClassProbability[];
  latency_ms: number;
  model_size_bytes: number;
  token_count: number;
  highlighted_tokens: string[];
  explanation: string;
}

export interface SoundPredictionResponse {
  model_id: string;
  model_name: string;
  prediction: string;
  confidence: number;
  top_k: ClassProbability[];
  latency_ms: number;
  model_size_bytes: number;
  duration_seconds: number;
  explanation: string;
}

export interface StyleTransferResponse {
  model_id: string;
  model_name: string;
  output_image_data_url: string;
  latency_ms: number;
  model_size_bytes: number;
  explanation: string;
}

export interface ImageRepairBlockerResponse {
  status: "blocked";
  model_id: string;
  reason: string;
  researched_candidates: string[];
}
