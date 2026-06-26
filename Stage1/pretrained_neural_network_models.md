# Stage 1: Pretrained Neural-Network Models

This document lists seven small pretrained neural-network models selected for Stage 1 research. Each model has public trained weights, a compatible public dataset, and a practical local CPU inference path. Parameter counts are approximate where they are calculated from the verified public architecture rather than reported directly by the model author.

## MNIST MLP

**Model name:** MNIST MLP

**Neural-network architecture:** Multi-layer perceptron with three linear layers: `784 -> 256 -> 256 -> 10`, ReLU activations after the first two layers, and softmax over the output logits in the model forward pass.

**AI task or domain:** Image classification for handwritten digits.

**Dataset name:** MNIST

**Dataset description:** MNIST contains 28x28 grayscale handwritten digit images with labels for digits `0` through `9`. The public Hugging Face dataset metadata lists 60,000 training examples and 10,000 test examples.

**Pretrained-weight source:** [dacorvo/mnist-mlp](https://huggingface.co/dacorvo/mnist-mlp). The repository exposes `model.safetensors`, `pytorch_model.bin`, `config.json`, `configuration_mlp.py`, and `modeling_mlp.py`.

**Approximate parameter count:** 269,322 parameters, calculated from the verified architecture.

**Input format and preprocessing:** Input is one MNIST image flattened to a 784-element tensor. The model card specifies torchvision preprocessing with `ToTensor()`, `Normalize((0.1307,), (0.3081,))`, and flattening.

**Output classes or expected output:** Ten digit classes, `0` through `9`, returned as class probabilities by the model forward pass.

**CPU inference requirements:** PyTorch and Transformers are sufficient. The checkpoint is small and expected to run comfortably on a local CPU.

**Verification status:** Verified from the Hugging Face model card, config, custom model source, and checkpoint file listing.

## Fashion-MNIST MLP

**Model name:** Fashion-MNIST MLP

**Neural-network architecture:** Multi-layer perceptron with three linear layers: `784 -> 300 -> 100 -> 10`, ReLU activations after the first two layers, and raw logits as output.

**AI task or domain:** Image classification for clothing and fashion-product images.

**Dataset name:** Fashion-MNIST

**Dataset description:** Fashion-MNIST contains 28x28 grayscale Zalando article images from 10 classes. The public Hugging Face dataset metadata lists 60,000 training examples and 10,000 test examples.

**Pretrained-weight source:** [sadhaklal/mlp-fashion-mnist](https://huggingface.co/sadhaklal/mlp-fashion-mnist). The repository exposes `model.safetensors` and includes usage code for `PyTorchModelHubMixin`.

**Approximate parameter count:** 266,610 parameters, calculated from the verified architecture.

**Input format and preprocessing:** Input is a 28x28 grayscale image converted to a float tensor and scaled to `[0, 1]`. The model card uses `torchvision.transforms.v2.ToImage()` and `ToDtype(torch.float32, scale=True)`, then flattens inside the model.

**Output classes or expected output:** Ten Fashion-MNIST classes: T-shirt/top, trouser, pullover, dress, coat, sandal, shirt, sneaker, bag, and ankle boot. The model returns logits; apply softmax for probabilities.

**CPU inference requirements:** PyTorch and `huggingface_hub` are sufficient. The model card uses `torch.device("cpu")`, and the checkpoint is lightweight.

**Verification status:** Verified from the Hugging Face model card, dataset tag, usage code, architecture snippet, and checkpoint file listing.

## CIFAR-10 Small CNN

**Model name:** CIFAR-10 small CNN

**Neural-network architecture:** Small convolutional neural network with `Conv2d(3, 32, kernel_size=3)`, ReLU, max pooling, `Conv2d(32, 64, kernel_size=3)`, ReLU, max pooling, flattening, and `Linear(64 * 6 * 6, 10)`.

**AI task or domain:** Image classification for small natural images.

**Dataset name:** CIFAR-10

**Dataset description:** CIFAR-10 contains 32x32 RGB images in 10 classes. The public Hugging Face dataset metadata lists 50,000 training examples and 10,000 test examples.

**Pretrained-weight source:** [luantber/k_cnn_cifar10](https://huggingface.co/luantber/k_cnn_cifar10). The repository exposes `pytorch_model.bin`, `config.json`, `config.py`, and `model.py`.

**Approximate parameter count:** 42,442 parameters, calculated from the verified architecture.

**Input format and preprocessing:** Input is expected as a batched PyTorch tensor shaped like CIFAR-10 images, `N x 3 x 32 x 32`. The public model source verifies the tensor shape expected by the convolutional layers. Exact training normalization is not documented in the model card or source files I verified.

**Output classes or expected output:** Ten CIFAR-10 classes: airplane, automobile, bird, cat, deer, dog, frog, horse, ship, and truck. The model returns logits.

**CPU inference requirements:** PyTorch, Transformers, and PyTorch Lightning may be needed because the custom source imports `pytorch_lightning`. The network itself is very small and suitable for CPU inference.

**Verification status:** Verified from the Hugging Face model metadata, custom source files, config, and checkpoint file listing. Exact preprocessing normalization could not be verified from the public model card/source.

## MNIST Autoencoder

**Model name:** MNIST Autoencoder

**Neural-network architecture:** Small convolutional autoencoder saved as a Keras SavedModel. The verified serialized Keras config shows an input layer for `28 x 28 x 1`, two `Conv2D(32, 3x3, activation="relu", padding="same")` encoder layers with max pooling, two `Conv2DTranspose(32, 3x3, strides=2, activation="relu", padding="same")` decoder layers, and a final `Conv2D(1, 3x3, activation="sigmoid", padding="same")` reconstruction layer.

**AI task or domain:** Image reconstruction.

**Dataset name:** MNIST

**Dataset description:** MNIST contains 28x28 grayscale handwritten digit images with labels for digits `0` through `9`. The public Hugging Face dataset metadata lists 60,000 training examples and 10,000 test examples.

**Pretrained-weight source:** [Ab0/autoencoder-keras-mnist-demo](https://huggingface.co/Ab0/autoencoder-keras-mnist-demo). The repository exposes a TensorFlow/Keras SavedModel with `saved_model.pb`, `keras_metadata.pb`, and `variables/` checkpoint files.

**Approximate parameter count:** 28,353 parameters, calculated from the verified serialized Keras layer configuration.

**Input format and preprocessing:** Input shape is `N x 28 x 28 x 1`. Because the final layer uses sigmoid reconstruction, inputs should be float grayscale images scaled to `[0, 1]`. The exact training preprocessing is not documented in the repository metadata I verified.

**Output classes or expected output:** Reconstructed grayscale image shaped `N x 28 x 28 x 1`, with pixel values expected in `[0, 1]`.

**CPU inference requirements:** TensorFlow/Keras CPU inference can load the SavedModel. The model is small enough for local CPU inference.

**Verification status:** Verified from the Hugging Face repository file listing and serialized `keras_metadata.pb` architecture. The repository has minimal public documentation, so exact training preprocessing is not fully documented.

## Fashion-MNIST VAE

**Model name:** Fashion-MNIST VAE

**Neural-network architecture:** Fully connected variational autoencoder. The verified linked source defines an encoder with `784 -> 512 -> 256`, batch normalization after the hidden layers, separate `Linear(256, latent_dim)` layers for `mu` and `log_var`, and a decoder with `latent_dim -> 256 -> 512 -> 784` ending in sigmoid reconstruction. The selected checkpoint variant is `latent_dim=16`.

**AI task or domain:** Image reconstruction and generation.

**Dataset name:** Fashion-MNIST

**Dataset description:** Fashion-MNIST contains 28x28 grayscale Zalando article images from 10 classes. The model card states the experiment used Fashion-MNIST with 48,000 training images, 12,000 validation images, and 10,000 test images.

**Pretrained-weight source:** [sudo-paras-shah/vae-fashion-mnist](https://huggingface.co/sudo-paras-shah/vae-fashion-mnist). The repository exposes several PyTorch checkpoints, including `vae_bce_adam_latent16.pth`, `vae_bce_adam_latent2.pth`, `vae_bce_adam_latent8.pth`, and `vae_bce_adam_latent32.pth`. The model card links to the source notebook in [sudo-paras-shah/paras-dl-lab](https://github.com/sudo-paras-shah/paras-dl-lab/tree/main/lab08).

**Approximate parameter count:** About 1.08 million trainable parameters for the `latent_dim=16` VAE, calculated from the verified source architecture including trainable batch-normalization scale and bias parameters.

**Input format and preprocessing:** Input is a Fashion-MNIST image shaped as `N x 1 x 28 x 28`, flattened internally by the encoder. The source expects normalized image tensors with values in `[0, 1]`.

**Output classes or expected output:** The VAE returns reconstructed images plus latent distribution parameters `mu` and `log_var`. Its `generate` method samples from a standard normal latent vector and returns generated `1 x 28 x 28` grayscale images.

**CPU inference requirements:** PyTorch is sufficient. CPU inference and generation are practical because the model is fully connected and small.

**Verification status:** Verified from the Hugging Face checkpoint file listing, model card, and linked GitHub notebook source.

## AG News GRU

**Model name:** AG News GRU

**Neural-network architecture:** Keras sequential text classifier: `Embedding(input_dim=20000, output_dim=128, mask_zero=True)`, `GRU(32, activation="tanh")`, `Dropout(0.2)`, and `Dense(4, activation="softmax")`.

**AI task or domain:** Text classification for news-topic classification.

**Dataset name:** AG News

**Dataset description:** AG News contains news text labeled into four topic classes: World, Sports, Business, and Sci/Tech. The public Hugging Face dataset metadata lists 120,000 training examples and 7,600 test examples.

**Pretrained-weight source:** [lopezplidia/ag-news-gru-classifier](https://huggingface.co/lopezplidia/ag-news-gru-classifier). The repository exposes `gru_news_classifier.keras` and `tokenizer.pkl`. The model card links to the source project [lopezplidia/clasificador-noticias-ag](https://github.com/lopezplidia/clasificador-noticias-ag).

**Approximate parameter count:** 2,575,684 parameters, calculated from the verified Keras architecture.

**Input format and preprocessing:** Input text is tokenized with a Keras `Tokenizer(num_words=20000, oov_token="<OOV>")`, converted to integer sequences, and padded/truncated to 100 tokens using post-padding and post-truncation. The repository includes the trained tokenizer artifact.

**Output classes or expected output:** Four softmax probabilities for AG News classes: World, Sports, Business, and Sci/Tech.

**CPU inference requirements:** TensorFlow/Keras CPU inference can load the `.keras` model. The tokenizer artifact is required to reproduce the model's input IDs. The model is small enough for local CPU inference.

**Verification status:** Verified from the Hugging Face model card, checkpoint file listing, tokenizer artifact listing, linked GitHub README, and linked notebook architecture/preprocessing.

## Iris MLP

**Model name:** Iris MLP

**Neural-network architecture:** Small multilayer perceptron with `Linear(4, 5)`, ReLU, and `Linear(5, 3)`.

**AI task or domain:** Tabular classification.

**Dataset name:** Iris

**Dataset description:** The Iris dataset contains flower measurements for sepal length, sepal width, petal length, and petal width. The model predicts one of three species: Iris-setosa, Iris-versicolor, or Iris-virginica.

**Pretrained-weight source:** [sadhaklal/mlp-iris](https://huggingface.co/sadhaklal/mlp-iris). The repository exposes `model.safetensors` and includes usage code for `PyTorchModelHubMixin`.

**Approximate parameter count:** 43 parameters, calculated from the verified architecture.

**Input format and preprocessing:** Input is a four-feature float tensor with `SepalLengthCm`, `SepalWidthCm`, `PetalLengthCm`, and `PetalWidthCm`. The model card normalizes inputs by subtracting the training-set means and dividing by the training-set standard deviations computed after the documented train/validation/test split.

**Output classes or expected output:** Three logits corresponding to Iris-setosa, Iris-versicolor, and Iris-virginica. Apply softmax for probabilities.

**CPU inference requirements:** PyTorch and `huggingface_hub` are sufficient. The model is tiny and runs trivially on CPU.

**Verification status:** Verified from the Hugging Face model card, dataset tag, usage code, architecture snippet, and checkpoint file listing.
