# Lightweight AI Learning Playground

This repository implements the local AI Learning Playground from the Deep Research blueprint. It uses local ONNX Runtime CPU inference through FastAPI and a TypeScript/static frontend shell served from the same app for offline operation after setup.

## Included

- Cherry-blossom visual shell with frosted-glass panels
- Responsive navigation, keyboard focus states, screen-reader summaries, and reduced-motion support
- Shared playground and model-adapter contracts
- Digit Lab drawing, erasing, clear, stroke width, rotation, and noise controls
- Prediction probabilities, confidence, latency, experiment comparison, and float32-vs-int8 Model Battle
- Image Repair Studio with a visible licensed-checkpoint blocker for the researched autoencoder
- Emotion/Text Lab using local DistilBERT SST-2 sentiment inference
- Sound Lab using local YAMNet ONNX inference
- Style and Colour Studio using local ONNX Fast Neural Style models
- Curiosity challenges, explanation modes, local experiment saving, and cross-lab battle endpoints
- Local model storage under `models`
- Python tests for preprocessing, adapters, API behavior, and critical UI expectations

No paid cloud APIs are used. Student inputs stay local by default.

## Quick Start On Windows

See [docs/windows-setup.md](docs/windows-setup.md) for exact commands.

## Model Sources

See [docs/model-sources.md](docs/model-sources.md).

