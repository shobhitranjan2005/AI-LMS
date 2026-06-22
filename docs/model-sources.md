# Model Sources And Licences

All inference is local and CPU-only through ONNX Runtime.

| Lab | Model | Source | Licence | Status |
|---|---|---|---|---|
| Digit Lab | ONNX Model Zoo MNIST-12 float32 | `onnx/models` MNIST model directory | MIT | Packaged locally |
| Digit Lab | ONNX Model Zoo MNIST-12 int8 | `onnx/models` MNIST model directory | MIT | Packaged locally |
| Text Lab | DistilBERT SST-2 ONNX int8 candidate | `fxmarty/distilbert-base-uncased-sst2-onnx-int8-for-tensorrt` | MIT | Packaged locally; compatible but large |
| Sound Lab | YAMNet ONNX | `zeropointnine/yamnet-onnx` | Apache-2.0 | Packaged locally |
| Style Studio | ONNX Fast Neural Style: Mosaic, Candy, Rain Princess | `onnx/models` Fast Neural Style directory | BSD-3-Clause | Packaged locally |
| Image Repair Studio | Researched MNIST autoencoder candidates | `Ab0/autoencoder-keras-mnist-demo`, `nateraw/autoencoder-keras-mnist-demo-with-card` | Not verified | Blocked, not packaged |

The Image Repair Studio remains visible because it is one of the required playgrounds, but it reports a clear blocker instead of simulating a reconstruction or packaging unlicensed weights.

