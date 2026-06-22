// @ts-nocheck
const canvas = document.querySelector("#drawingCanvas");
const ctx = canvas?.getContext("2d", { willReadFrequently: true });
const state = {
  tool: "pen",
  drawing: false,
  lastPoint: null,
  history: loadHistory(),
};

function byId(id) {
  const element = document.getElementById(id);
  if (!element) {
    throw new Error(`Missing element #${id}`);
  }
  return element;
}

const elements = {
  modelSelect: byId("modelSelect"),
  strokeWidth: byId("strokeWidth"),
  strokeValue: byId("strokeValue"),
  rotation: byId("rotation"),
  rotationValue: byId("rotationValue"),
  noise: byId("noise"),
  noiseValue: byId("noiseValue"),
  predictButton: byId("predictButton"),
  battleButton: byId("battleButton"),
  clearButton: byId("clearButton"),
  status: byId("statusText"),
  prediction: byId("prediction"),
  confidence: byId("confidence"),
  latency: byId("latency"),
  probabilities: byId("probabilities"),
  preview: byId("previewImage"),
  history: byId("historyList"),
  comparison: byId("comparisonText"),
  battleResults: byId("battleResults"),
  srSummary: byId("srSummary"),
  calmMotion: byId("calmMotion"),
};

function loadHistory() {
  try {
    const raw = window.localStorage.getItem("digit-lab-history");
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveHistory() {
  window.localStorage.setItem("digit-lab-history", JSON.stringify(state.history.slice(0, 5)));
}

function setupCanvas() {
  if (!canvas || !ctx) return;
  ctx.fillStyle = "#05070c";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.imageSmoothingEnabled = true;
}

function pointerPoint(event) {
  if (!canvas) return { x: 0, y: 0 };
  const rect = canvas.getBoundingClientRect();
  return {
    x: (event.clientX - rect.left) * (canvas.width / rect.width),
    y: (event.clientY - rect.top) * (canvas.height / rect.height),
  };
}

function configureStroke() {
  if (!ctx) return;
  ctx.globalCompositeOperation = "source-over";
  ctx.strokeStyle = state.tool === "pen" ? "#fff7fa" : "#05070c";
  ctx.fillStyle = ctx.strokeStyle;
  ctx.lineWidth = Number(elements.strokeWidth.value);
}

function beginStroke(event) {
  if (!canvas || !ctx) return;
  event.preventDefault();
  canvas.setPointerCapture(event.pointerId);
  state.drawing = true;
  state.lastPoint = pointerPoint(event);
  configureStroke();
  ctx.beginPath();
  ctx.moveTo(state.lastPoint.x, state.lastPoint.y);
  ctx.arc(state.lastPoint.x, state.lastPoint.y, Number(elements.strokeWidth.value) / 2, 0, Math.PI * 2);
  ctx.fill();
}

function moveStroke(event) {
  if (!state.drawing || !ctx) return;
  event.preventDefault();
  const point = pointerPoint(event);
  configureStroke();
  ctx.beginPath();
  if (state.lastPoint) {
    ctx.moveTo(state.lastPoint.x, state.lastPoint.y);
  }
  ctx.lineTo(point.x, point.y);
  ctx.stroke();
  state.lastPoint = point;
}

function endStroke(event) {
  if (!canvas) return;
  state.drawing = false;
  state.lastPoint = null;
  if (canvas.hasPointerCapture(event.pointerId)) {
    canvas.releasePointerCapture(event.pointerId);
  }
}

function clearCanvas() {
  setupCanvas();
  elements.preview.removeAttribute("src");
  elements.status.textContent = "Canvas cleared.";
}

function currentTransforms() {
  return {
    rotation_degrees: Number(elements.rotation.value),
    noise_level: Number(elements.noise.value),
    stroke_width: Number(elements.strokeWidth.value),
    seed: 1337,
  };
}

function currentImageDataUrl() {
  if (!canvas) {
    throw new Error("Canvas is not available.");
  }
  return canvas.toDataURL("image/png");
}

function requestBody(modelId = elements.modelSelect.value, topK = 3) {
  return {
    image_data_url: currentImageDataUrl(),
    model_id: modelId,
    transforms: currentTransforms(),
    top_k: topK,
  };
}

async function fetchJson(url, init) {
  const response = await fetch(url, init);
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(detail || response.statusText);
  }
  return await response.json();
}

function formatPercent(value) {
  return `${Math.round(value * 1000) / 10}%`;
}

function formatMs(value) {
  return `${value.toFixed(1)} ms`;
}

function formatBytes(value) {
  if (value < 1024) return `${value} B`;
  return `${(value / 1024).toFixed(1)} KB`;
}

function renderProbabilities(probabilities) {
  elements.probabilities.innerHTML = "";
  probabilities.forEach((item) => {
    const row = document.createElement("div");
    row.className = "probability-row";
    row.innerHTML = `
      <span class="probability-label">${item.label}</span>
      <span class="probability-track" aria-hidden="true">
        <span class="probability-fill" style="width: ${Math.max(2, item.probability * 100)}%"></span>
      </span>
      <span class="probability-value">${formatPercent(item.probability)}</span>
    `;
    elements.probabilities.append(row);
  });
}

function recordExperiment(result) {
  const experiment = {
    id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}`,
    createdAt: new Date().toISOString(),
    modelId: result.model_id,
    prediction: result.prediction,
    confidence: result.confidence,
    latencyMs: result.latency_ms,
    preprocessingMs: result.preprocessing_latency_ms,
    transforms: result.transforms,
  };
  state.history = [experiment, ...state.history].slice(0, 5);
  saveHistory();
  renderHistory();
}

function renderHistory() {
  elements.history.innerHTML = "";
  if (state.history.length === 0) {
    elements.history.textContent = "No experiments yet.";
    elements.comparison.textContent = "Run a prediction to compare experiments.";
    return;
  }

  state.history.forEach((item, index) => {
    const row = document.createElement("div");
    row.className = "history-row";
    row.innerHTML = `
      <span class="history-rank">${index + 1}</span>
      <span>${item.modelId.replace("mnist-12-", "")}</span>
      <strong>${item.prediction}</strong>
      <span>${formatPercent(item.confidence)}</span>
      <span>${formatMs(item.latencyMs)}</span>
      <span>rot ${item.transforms.rotation_degrees} deg</span>
      <span>noise ${Math.round(item.transforms.noise_level * 100)}%</span>
    `;
    elements.history.append(row);
  });

  if (state.history.length > 1) {
    const [latest, previous] = state.history;
    const delta = latest.confidence - previous.confidence;
    elements.comparison.textContent =
      `Latest ${latest.prediction} changed confidence by ${formatPercent(Math.abs(delta))} ` +
      `${delta >= 0 ? "up" : "down"} from the previous run.`;
  } else {
    elements.comparison.textContent = "One experiment captured.";
  }
}

function renderPrediction(result) {
  elements.prediction.textContent = result.prediction;
  elements.confidence.textContent = formatPercent(result.confidence);
  elements.latency.textContent = `${formatMs(result.latency_ms)} inference, ${formatMs(result.preprocessing_latency_ms)} prep`;
  elements.preview.src = result.preprocessed_preview;
  elements.preview.alt = "28 by 28 preprocessed digit preview";
  renderProbabilities(result.probabilities);
  elements.srSummary.textContent =
    `${result.model_name} predicted ${result.prediction} with ${formatPercent(result.confidence)} confidence.`;
}

async function predictDigit() {
  try {
    elements.predictButton.disabled = true;
    elements.status.textContent = "Running local model...";
    const result = await fetchJson("/api/predict/digit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody()),
    });
    renderPrediction(result);
    recordExperiment(result);
    elements.status.textContent = "Prediction complete.";
  } catch (error) {
    elements.status.textContent = error instanceof Error ? error.message : "Prediction failed.";
  } finally {
    elements.predictButton.disabled = false;
  }
}

function renderBattle(result) {
  elements.battleResults.innerHTML = "";
  result.results.forEach((entry) => {
    const panel = document.createElement("div");
    panel.className = "battle-result";
    panel.innerHTML = `
      <div>
        <span class="eyebrow">${entry.model_id}</span>
        <strong>${entry.prediction}</strong>
      </div>
      <dl>
        <div><dt>Confidence</dt><dd>${formatPercent(entry.confidence)}</dd></div>
        <div><dt>Latency</dt><dd>${formatMs(entry.latency_ms)}</dd></div>
        <div><dt>Size</dt><dd>${formatBytes(entry.model_size_bytes)}</dd></div>
      </dl>
    `;
    elements.battleResults.append(panel);
  });

  const summary = document.createElement("p");
  summary.className = "battle-summary";
  summary.textContent =
    `${result.agreement ? "Models agree" : "Models disagree"}; fastest model is ` +
    `${result.latency_winner_model_id}; confidence delta is ${formatPercent(result.confidence_delta)}.`;
  elements.battleResults.append(summary);
}

async function runBattle() {
  try {
    elements.battleButton.disabled = true;
    elements.status.textContent = "Running float32 and int8 battle...";
    const result = await fetchJson("/api/battle/run", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        image_data_url: currentImageDataUrl(),
        transforms: currentTransforms(),
      }),
    });
    renderBattle(result);
    elements.status.textContent = "Model Battle complete.";
  } catch (error) {
    elements.status.textContent = error instanceof Error ? error.message : "Model Battle failed.";
  } finally {
    elements.battleButton.disabled = false;
  }
}

async function loadCatalog() {
  try {
    const catalog = await fetchJson("/api/models/catalog");
    elements.modelSelect.innerHTML = "";
    catalog.models.forEach((model) => {
      const option = document.createElement("option");
      option.value = model.id;
      option.textContent = `${model.precision} - ${formatBytes(model.modelSizeBytes)}`;
      option.disabled = !model.available;
      elements.modelSelect.append(option);
    });
    elements.status.textContent = catalog.offline_ready ? "Local models ready." : "Run the model download setup.";
  } catch {
    elements.status.textContent = "API not available.";
  }
}

function syncControlLabels() {
  elements.strokeValue.textContent = `${elements.strokeWidth.value}px`;
  elements.rotationValue.textContent = `${elements.rotation.value} deg`;
  elements.noiseValue.textContent = `${Math.round(Number(elements.noise.value) * 100)}%`;
}

function setTool(tool) {
  state.tool = tool;
  document.querySelectorAll("[data-tool]").forEach((button) => {
    const active = button.dataset.tool === tool;
    button.setAttribute("aria-pressed", String(active));
  });
}

function bindEvents() {
  if (!canvas) return;
  canvas.addEventListener("pointerdown", beginStroke);
  canvas.addEventListener("pointermove", moveStroke);
  canvas.addEventListener("pointerup", endStroke);
  canvas.addEventListener("pointercancel", endStroke);
  canvas.addEventListener("contextmenu", (event) => event.preventDefault());

  document.querySelectorAll("[data-tool]").forEach((button) => {
    button.addEventListener("click", () => setTool(button.dataset.tool === "eraser" ? "eraser" : "pen"));
  });

  elements.clearButton.addEventListener("click", clearCanvas);
  elements.predictButton.addEventListener("click", predictDigit);
  elements.battleButton.addEventListener("click", runBattle);
  [elements.strokeWidth, elements.rotation, elements.noise].forEach((input) => {
    input.addEventListener("input", syncControlLabels);
  });

  elements.calmMotion.checked = window.localStorage.getItem("calm-motion") === "true";
  document.documentElement.classList.toggle("force-reduced-motion", elements.calmMotion.checked);
  elements.calmMotion.addEventListener("change", () => {
    document.documentElement.classList.toggle("force-reduced-motion", elements.calmMotion.checked);
    window.localStorage.setItem("calm-motion", String(elements.calmMotion.checked));
  });
}

setupCanvas();
bindEvents();
syncControlLabels();
renderHistory();
void loadCatalog();

function optional(id) {
  return document.getElementById(id);
}

const lab = {
  repairCanvas: optional("repairCanvas"),
  repairStrength: optional("repairStrength"),
  repairStrengthValue: optional("repairStrengthValue"),
  repairDamage: optional("repairDamage"),
  repairSampleButton: optional("repairSampleButton"),
  repairDamageButton: optional("repairDamageButton"),
  repairRunButton: optional("repairRunButton"),
  repairStatus: optional("repairStatus"),
  textInput: optional("textInput"),
  textPredictButton: optional("textPredictButton"),
  textSwapButton: optional("textSwapButton"),
  textBattleButton: optional("textBattleButton"),
  textResult: optional("textResult"),
  soundCanvas: optional("soundCanvas"),
  soundFreq: optional("soundFreq"),
  soundFreqValue: optional("soundFreqValue"),
  soundGain: optional("soundGain"),
  soundGainValue: optional("soundGainValue"),
  soundNoise: optional("soundNoise"),
  soundNoiseValue: optional("soundNoiseValue"),
  soundGenerateButton: optional("soundGenerateButton"),
  soundPredictButton: optional("soundPredictButton"),
  soundBattleButton: optional("soundBattleButton"),
  soundResult: optional("soundResult"),
  styleCanvas: optional("styleCanvas"),
  styleOutput: optional("styleOutput"),
  styleSelect: optional("styleSelect"),
  styleIntensity: optional("styleIntensity"),
  styleIntensityValue: optional("styleIntensityValue"),
  styleSaturation: optional("styleSaturation"),
  styleSaturationValue: optional("styleSaturationValue"),
  styleSampleButton: optional("styleSampleButton"),
  styleRunButton: optional("styleRunButton"),
  styleBattleButton: optional("styleBattleButton"),
  styleResult: optional("styleResult"),
  educationMode: optional("educationMode"),
  educationText: optional("educationText"),
  challengeList: optional("challengeList"),
  crossBattleResults: optional("crossBattleResults"),
};

let soundSamples = [];

function saveLabResult(kind, payload) {
  const key = "ai-playground-experiments";
  const current = JSON.parse(window.localStorage.getItem(key) || "[]");
  current.unshift({ kind, createdAt: new Date().toISOString(), payload });
  window.localStorage.setItem(key, JSON.stringify(current.slice(0, 30)));
}

function resultLine(label, value) {
  return `<div class="result-card"><strong>${label}</strong><br><span>${value}</span></div>`;
}

function topKText(rows) {
  return rows.map((item) => `${item.label}: ${formatPercent(item.probability)}`).join(" | ");
}

function drawRepairSample() {
  const canvas = lab.repairCanvas;
  const ctx2d = canvas?.getContext("2d");
  if (!canvas || !ctx2d) return;
  const hue = Math.floor(Math.random() * 180) + 160;
  ctx2d.fillStyle = "#07101d";
  ctx2d.fillRect(0, 0, canvas.width, canvas.height);
  ctx2d.fillStyle = `hsl(${hue}, 80%, 72%)`;
  ctx2d.fillRect(32, 30, 86, 160);
  ctx2d.fillStyle = "#ffd27a";
  ctx2d.beginPath();
  ctx2d.arc(142, 92, 46, 0, Math.PI * 2);
  ctx2d.fill();
  ctx2d.strokeStyle = "#fff7fa";
  ctx2d.lineWidth = 10;
  ctx2d.strokeRect(48, 52, 128, 112);
  if (lab.repairStatus) lab.repairStatus.textContent = "Editable sample ready.";
}

function damageRepairCanvas() {
  const canvas = lab.repairCanvas;
  const ctx2d = canvas?.getContext("2d");
  if (!canvas || !ctx2d || !lab.repairStrength || !lab.repairDamage) return;
  const strength = Number(lab.repairStrength.value);
  if (lab.repairDamage.value === "block") {
    ctx2d.fillStyle = "rgba(3, 5, 9, 0.92)";
    const size = 42 + strength * 88;
    ctx2d.fillRect(86, 74, size, size);
  } else {
    const image = ctx2d.getImageData(0, 0, canvas.width, canvas.height);
    for (let i = 0; i < image.data.length; i += 4) {
      const n = (Math.random() - 0.5) * 255 * strength;
      image.data[i] = Math.max(0, Math.min(255, image.data[i] + n));
      image.data[i + 1] = Math.max(0, Math.min(255, image.data[i + 1] + n));
      image.data[i + 2] = Math.max(0, Math.min(255, image.data[i + 2] + n));
    }
    ctx2d.putImageData(image, 0, 0);
  }
  if (lab.repairStatus) lab.repairStatus.textContent = "Damage applied. The licensed autoencoder check will run locally.";
}

async function runRepair() {
  if (!lab.repairCanvas || !lab.repairStatus || !lab.repairStrength || !lab.repairDamage) return;
  lab.repairStatus.textContent = "Checking local autoencoder...";
  try {
    await fetchJson("/api/repair/image", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        image_data_url: lab.repairCanvas.toDataURL("image/png"),
        damage: lab.repairDamage.value,
        strength: Number(lab.repairStrength.value),
      }),
    });
  } catch (error) {
    let message = "No licensed pretrained autoencoder is packaged.";
    if (error instanceof Error && error.message.includes("licence")) {
      message = "Blocked: researched autoencoder checkpoint lacks compatible licence metadata.";
    }
    lab.repairStatus.textContent = message;
  }
}

async function predictTextLab() {
  if (!lab.textInput || !lab.textResult) return;
  lab.textResult.innerHTML = resultLine("Text Lab", "Running local sentiment model...");
  try {
    const result = await fetchJson("/api/predict/text", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: lab.textInput.value }),
    });
    lab.textResult.innerHTML =
      resultLine("Mood", `${result.prediction} at ${formatPercent(result.confidence)}`) +
      resultLine("Scores", topKText(result.probabilities)) +
      resultLine("CPU Latency", formatMs(result.latency_ms)) +
      resultLine("Tokens", result.highlighted_tokens.join(" "));
    saveLabResult("text", result);
  } catch (error) {
    lab.textResult.innerHTML = resultLine("Error", error instanceof Error ? error.message : "Text prediction failed.");
  }
}

function swapTextWord() {
  if (!lab.textInput) return;
  const swaps = [
    ["wonderful", "terrible"],
    ["loved", "hated"],
    ["bright", "dull"],
    ["amazing", "awful"],
    ["calm", "angry"],
  ];
  let value = lab.textInput.value;
  for (const [from, to] of swaps) {
    if (value.toLowerCase().includes(from)) {
      lab.textInput.value = value.replace(new RegExp(from, "i"), to);
      return;
    }
  }
  lab.textInput.value = `${value} This was terrible.`;
}

async function battleTextLab() {
  if (!lab.textInput || !lab.crossBattleResults) return;
  const original = lab.textInput.value;
  swapTextWord();
  const edited = lab.textInput.value;
  const result = await fetchJson("/api/battle/text", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ original_text: original, edited_text: edited }),
  });
  lab.crossBattleResults.innerHTML = resultLine(
    "Text Battle",
    `${result.results[0].prediction} vs ${result.results[1].prediction}; confidence delta ${formatPercent(result.confidence_delta)}`
  );
}

function generateSound() {
  if (!lab.soundCanvas || !lab.soundFreq || !lab.soundGain || !lab.soundNoise) return;
  const sampleRate = 16000;
  const freq = Number(lab.soundFreq.value);
  const gain = Number(lab.soundGain.value);
  const noise = Number(lab.soundNoise.value);
  soundSamples = Array.from({ length: sampleRate }, (_, i) => {
    const tone = Math.sin((2 * Math.PI * freq * i) / sampleRate) * 0.35 * gain;
    return Math.max(-1, Math.min(1, tone + (Math.random() - 0.5) * noise * 0.25));
  });
  const ctx2d = lab.soundCanvas.getContext("2d");
  if (!ctx2d) return;
  ctx2d.fillStyle = "#05070c";
  ctx2d.fillRect(0, 0, lab.soundCanvas.width, lab.soundCanvas.height);
  ctx2d.strokeStyle = "#7de0d4";
  ctx2d.lineWidth = 2;
  ctx2d.beginPath();
  soundSamples.forEach((sample, index) => {
    const x = (index / soundSamples.length) * lab.soundCanvas.width;
    const y = lab.soundCanvas.height / 2 - sample * 45;
    if (index === 0) ctx2d.moveTo(x, y);
    else ctx2d.lineTo(x, y);
  });
  ctx2d.stroke();
  if (lab.soundResult) lab.soundResult.innerHTML = resultLine("Sound", "Generated locally.");
}

async function predictSoundLab() {
  if (!lab.soundResult || !lab.soundGain || !lab.soundNoise) return;
  if (soundSamples.length === 0) generateSound();
  lab.soundResult.innerHTML = resultLine("Sound Lab", "Running local YAMNet...");
  try {
    const result = await fetchJson("/api/predict/sound", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        samples: soundSamples,
        sample_rate: 16000,
        gain: Number(lab.soundGain.value),
        noise_level: Number(lab.soundNoise.value),
      }),
    });
    lab.soundResult.innerHTML =
      resultLine("Prediction", `${result.prediction} at ${formatPercent(result.confidence)}`) +
      resultLine("Top Labels", topKText(result.top_k)) +
      resultLine("CPU Latency", formatMs(result.latency_ms));
    saveLabResult("sound", result);
  } catch (error) {
    lab.soundResult.innerHTML = resultLine("Error", error instanceof Error ? error.message : "Sound prediction failed.");
  }
}

async function battleSoundLab() {
  if (!lab.crossBattleResults) return;
  if (soundSamples.length === 0) generateSound();
  const result = await fetchJson("/api/battle/sound", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ samples: soundSamples, sample_rate: 16000 }),
  });
  lab.crossBattleResults.innerHTML = resultLine(
    "Sound Battle",
    `${result.results[0].prediction} vs ${result.results[1].prediction}; confidence delta ${formatPercent(result.confidence_delta)}`
  );
}

function drawStyleSample() {
  const canvas = lab.styleCanvas;
  const ctx2d = canvas?.getContext("2d");
  if (!canvas || !ctx2d) return;
  const gradient = ctx2d.createLinearGradient(0, 0, 224, 224);
  gradient.addColorStop(0, "#204c78");
  gradient.addColorStop(1, "#ff9fbd");
  ctx2d.fillStyle = gradient;
  ctx2d.fillRect(0, 0, 224, 224);
  ctx2d.fillStyle = "#ffd27a";
  ctx2d.fillRect(30, 130, 164, 42);
  ctx2d.fillStyle = "#7de0d4";
  ctx2d.beginPath();
  ctx2d.arc(112, 84, 46, 0, Math.PI * 2);
  ctx2d.fill();
  ctx2d.strokeStyle = "#fff7fa";
  ctx2d.lineWidth = 8;
  ctx2d.strokeRect(54, 48, 116, 118);
}

async function runStyleLab() {
  if (!lab.styleCanvas || !lab.styleSelect || !lab.styleIntensity || !lab.styleSaturation || !lab.styleResult) return;
  lab.styleResult.innerHTML = resultLine("Style", "Running local neural style model...");
  try {
    const result = await fetchJson("/api/transform/style", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        image_data_url: lab.styleCanvas.toDataURL("image/png"),
        style_id: lab.styleSelect.value,
        intensity: Number(lab.styleIntensity.value),
        saturation: Number(lab.styleSaturation.value),
      }),
    });
    if (lab.styleOutput) lab.styleOutput.src = result.output_image_data_url;
    lab.styleResult.innerHTML =
      resultLine("Model", result.model_name) +
      resultLine("CPU Latency", formatMs(result.latency_ms)) +
      resultLine("Size", formatBytes(result.model_size_bytes));
    saveLabResult("style", result);
  } catch (error) {
    lab.styleResult.innerHTML = resultLine("Error", error instanceof Error ? error.message : "Style transform failed.");
  }
}

async function battleStyleLab() {
  if (!lab.styleCanvas || !lab.crossBattleResults) return;
  const result = await fetchJson("/api/battle/style", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      image_data_url: lab.styleCanvas.toDataURL("image/png"),
      first_style_id: "mosaic-9",
      second_style_id: "candy-9",
    }),
  });
  lab.crossBattleResults.innerHTML = resultLine(
    "Style Battle",
    `${result.results[0].model_id} ${formatMs(result.results[0].latency_ms)} vs ${result.results[1].model_id} ${formatMs(result.results[1].latency_ms)}`
  );
}

const explanations = {
  simple: "Try changing one thing at a time. The app shows what the model guessed and how sure it felt.",
  intermediate: "Each lab converts your input into numbers, runs a local neural network, and compares output scores. Confidence is useful, but it is not proof.",
  advanced:
    "The adapters enforce preprocessing contracts: MNIST uses 28x28 normalized grayscale, DistilBERT uses WordPiece IDs and attention masks, YAMNet uses 16 kHz waveform frames, and style transfer uses 224x224 RGB tensors.",
};

const challenges = [
  "Digit: draw an 8, erase one loop, and compare confidence.",
  "Repair: hide a central block and inspect the checkpoint blocker.",
  "Text: replace one emotional word and run Text Battle.",
  "Sound: add noise until the top YAMNet label changes.",
  "Style: compare Mosaic and Candy on the same scene.",
  "Battle: look for a model that is faster but less confident.",
];

function updateEducationMode() {
  const mode = lab.educationMode?.value || "simple";
  if (lab.educationText) lab.educationText.textContent = explanations[mode] || explanations.simple;
  if (lab.challengeList) {
    lab.challengeList.innerHTML = challenges.map((item) => `<div class="challenge-item">${item}</div>`).join("");
  }
}

function syncLabLabels() {
  if (lab.repairStrength && lab.repairStrengthValue) lab.repairStrengthValue.textContent = `${Math.round(Number(lab.repairStrength.value) * 100)}%`;
  if (lab.soundFreq && lab.soundFreqValue) lab.soundFreqValue.textContent = `${lab.soundFreq.value} Hz`;
  if (lab.soundGain && lab.soundGainValue) lab.soundGainValue.textContent = Number(lab.soundGain.value).toFixed(1);
  if (lab.soundNoise && lab.soundNoiseValue) lab.soundNoiseValue.textContent = `${Math.round(Number(lab.soundNoise.value) * 100)}%`;
  if (lab.styleIntensity && lab.styleIntensityValue) lab.styleIntensityValue.textContent = `${Math.round(Number(lab.styleIntensity.value) * 100)}%`;
  if (lab.styleSaturation && lab.styleSaturationValue) lab.styleSaturationValue.textContent = `${Math.round(Number(lab.styleSaturation.value) * 100)}%`;
}

function bindLabEvents() {
  lab.repairSampleButton?.addEventListener("click", drawRepairSample);
  lab.repairDamageButton?.addEventListener("click", damageRepairCanvas);
  lab.repairRunButton?.addEventListener("click", runRepair);
  lab.textPredictButton?.addEventListener("click", predictTextLab);
  lab.textSwapButton?.addEventListener("click", swapTextWord);
  lab.textBattleButton?.addEventListener("click", battleTextLab);
  lab.soundGenerateButton?.addEventListener("click", generateSound);
  lab.soundPredictButton?.addEventListener("click", predictSoundLab);
  lab.soundBattleButton?.addEventListener("click", battleSoundLab);
  lab.styleSampleButton?.addEventListener("click", drawStyleSample);
  lab.styleRunButton?.addEventListener("click", runStyleLab);
  lab.styleBattleButton?.addEventListener("click", battleStyleLab);
  lab.educationMode?.addEventListener("change", updateEducationMode);
  [lab.repairStrength, lab.soundFreq, lab.soundGain, lab.soundNoise, lab.styleIntensity, lab.styleSaturation].forEach((input) => {
    input?.addEventListener("input", syncLabLabels);
  });
}

bindLabEvents();
syncLabLabels();
drawRepairSample();
generateSound();
drawStyleSample();
updateEducationMode();
