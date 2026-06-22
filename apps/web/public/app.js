const canvas = document.querySelector("#drawingCanvas");
const ctx = canvas?.getContext("2d", { willReadFrequently: true });
const state = {
  tool: "pen",
  drawing: false,
  lastPoint: null,
  history: loadHistory(),
  catalog: [],
};

function byId(id) {
  const element = document.getElementById(id);
  if (!element) {
    throw new Error(`Missing element #${id}`);
  }
  return element;
}

function optional(id) {
  return document.getElementById(id);
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
  globalStatus: optional("globalStatus"),
  selectedModelNote: optional("selectedModelNote"),
  modelCatalog: optional("modelCatalog"),
  modelCatalogSummary: optional("modelCatalogSummary"),
  toastRegion: optional("toastRegion"),
};

const lab = {
  repairCanvas: optional("repairCanvas"),
  repairBeforeCanvas: optional("repairBeforeCanvas"),
  repairAfterPreview: optional("repairAfterPreview"),
  repairUpload: optional("repairUpload"),
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
  styleUpload: optional("styleUpload"),
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

const labHashes = [
  "#digit-lab",
  "#image-repair",
  "#text-lab",
  "#sound-lab",
  "#style-studio",
  "#model-battle",
  "#models",
  "#learning",
  "#playground",
];

let soundSamples = [];

class FriendlyError extends Error {
  constructor(message, technicalDetail, status) {
    super(message);
    this.name = "FriendlyError";
    this.technicalDetail = technicalDetail;
    this.status = status;
  }
}

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

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function setStatus(element, message, kind = "") {
  if (!element) return;
  element.textContent = message;
  if (kind) element.dataset.state = kind;
  else element.removeAttribute("data-state");
}

function showToast(message) {
  if (!elements.toastRegion) return;
  const toast = document.createElement("div");
  toast.className = "toast";
  toast.textContent = message;
  elements.toastRegion.append(toast);
  window.setTimeout(() => toast.remove(), 3800);
}

function setBusy(button, busy, busyText = "") {
  if (!button) return;
  if (!button.dataset.defaultLabel) {
    button.dataset.defaultLabel = button.textContent || "";
  }
  button.disabled = busy;
  button.setAttribute("aria-busy", String(busy));
  button.textContent = busy && busyText ? busyText : button.dataset.defaultLabel;
}

function detailToText(detail) {
  if (!detail) return "";
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) return detail.map(detailToText).filter(Boolean).join(" ");
  if (typeof detail === "object") {
    if ("detail" in detail) return detailToText(detail.detail);
    if ("reason" in detail) return detailToText(detail.reason);
    if ("message" in detail) return detailToText(detail.message);
    return JSON.stringify(detail);
  }
  return String(detail);
}

function friendlyMessage(detail, status) {
  const text = detailToText(detail);
  const lower = text.toLowerCase();
  if (lower.includes("unknown digit model") || lower.includes("unknown model")) {
    return "That model is not available for this lab. Choose a valid local model and try again.";
  }
  if (lower.includes("missing model file")) {
    return "The selected local model file is missing. Run the model setup, then refresh.";
  }
  if (lower.includes("licence") || lower.includes("license")) {
    return "Repair is blocked until a compatible licensed autoencoder checkpoint is packaged.";
  }
  if (lower.includes("failed to fetch") || lower.includes("networkerror")) {
    return "The local API is not reachable. Start the local server, then refresh.";
  }
  if (status === 424) {
    return "This local model path is blocked by a dependency requirement.";
  }
  if (status === 400) {
    return "The current input could not be processed. Adjust it and try again.";
  }
  if (status && status >= 500) {
    return "The local API hit an error. Technical details are in the console.";
  }
  return text || "The local request failed. Technical details are in the console.";
}

async function fetchJson(url, init) {
  let response;
  try {
    response = await fetch(url, init);
  } catch (error) {
    console.error("Local API request failed before a response was received.", { url, error });
    throw new FriendlyError(friendlyMessage(error instanceof Error ? error.message : error), error, 0);
  }

  if (!response.ok) {
    const raw = await response.text();
    let detail = raw;
    try {
      detail = JSON.parse(raw);
    } catch {
      detail = raw;
    }
    console.error("Local API request failed.", {
      url,
      status: response.status,
      detail,
    });
    throw new FriendlyError(friendlyMessage(detail, response.status), detail, response.status);
  }
  return await response.json();
}

function formatPercent(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return "-";
  return `${Math.round(number * 1000) / 10}%`;
}

function formatMs(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return "-";
  return `${number.toFixed(1)} ms`;
}

function formatBytes(value) {
  const number = Number(value || 0);
  if (!Number.isFinite(number)) return "-";
  if (number < 1024) return `${number} B`;
  if (number < 1024 * 1024) return `${(number / 1024).toFixed(1)} KB`;
  return `${(number / (1024 * 1024)).toFixed(1)} MB`;
}

function modelSize(model) {
  return model.model_size_bytes ?? model.modelSizeBytes ?? 0;
}

function parameterCount(model) {
  return model.parameter_count ?? model.parameterCount ?? 0;
}

function setupCanvas() {
  if (!canvas || !ctx) return;
  ctx.fillStyle = "#04070d";
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
  ctx.strokeStyle = state.tool === "pen" ? "#fff7fa" : "#04070d";
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
  elements.preview.alt = "";
  setStatus(elements.status, "Canvas cleared.", "success");
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

function requestBody(modelId = elements.modelSelect.value || "mnist-12-float32", topK = 3) {
  return {
    image_data_url: currentImageDataUrl(),
    model_id: modelId,
    transforms: currentTransforms(),
    top_k: topK,
  };
}

function renderProbabilities(probabilities) {
  elements.probabilities.innerHTML = "";
  probabilities.forEach((item) => {
    const row = document.createElement("div");
    const label = document.createElement("span");
    const track = document.createElement("span");
    const fill = document.createElement("span");
    const value = document.createElement("span");

    row.className = "probability-row";
    label.className = "probability-label";
    label.textContent = item.label;
    track.className = "probability-track";
    track.setAttribute("aria-hidden", "true");
    fill.className = "probability-fill";
    fill.style.width = `${Math.max(2, Number(item.probability) * 100)}%`;
    value.className = "probability-value";
    value.textContent = formatPercent(item.probability);

    track.append(fill);
    row.append(label, track, value);
    elements.probabilities.append(row);
  });
}

function recordExperiment(result) {
  const experiment = {
    id: window.crypto?.randomUUID ? window.crypto.randomUUID() : `${Date.now()}`,
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
    const transforms = item.transforms || {};
    row.className = "history-row";
    row.innerHTML = `
      <span class="history-rank">${index + 1}</span>
      <span>${escapeHtml(String(item.modelId || "").replace("mnist-12-", ""))}</span>
      <strong>${escapeHtml(item.prediction ?? "-")}</strong>
      <span>${formatPercent(item.confidence)}</span>
      <span>${formatMs(item.latencyMs)}</span>
      <span>rot ${escapeHtml(transforms.rotation_degrees ?? 0)} deg</span>
      <span>noise ${Math.round(Number(transforms.noise_level || 0) * 100)}%</span>
    `;
    elements.history.append(row);
  });

  if (state.history.length > 1) {
    const [latest, previous] = state.history;
    const delta = Number(latest.confidence || 0) - Number(previous.confidence || 0);
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
    setBusy(elements.predictButton, true, "Running...");
    setStatus(elements.status, "Running local model...");
    const result = await fetchJson("/api/predict/digit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody()),
    });
    renderPrediction(result);
    recordExperiment(result);
    setStatus(elements.status, "Prediction complete.", "success");
    setStatus(elements.globalStatus, `Digit prediction complete: ${result.prediction}.`, "success");
  } catch (error) {
    const message = error instanceof Error ? error.message : "Prediction failed.";
    setStatus(elements.status, message, "error");
    showToast(message);
  } finally {
    setBusy(elements.predictButton, false);
  }
}

function renderBattle(result) {
  elements.battleResults.innerHTML = "";
  result.results.forEach((entry) => {
    const panel = document.createElement("div");
    panel.className = "battle-result";
    panel.innerHTML = `
      <div>
        <span class="eyebrow">${escapeHtml(entry.model_id)}</span>
        <strong>${escapeHtml(entry.prediction)}</strong>
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
    setBusy(elements.battleButton, true, "Comparing...");
    setStatus(elements.status, "Running float32 and int8 battle...");
    const result = await fetchJson("/api/battle/run", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        image_data_url: currentImageDataUrl(),
        transforms: currentTransforms(),
      }),
    });
    renderBattle(result);
    setStatus(elements.status, "Model Battle complete.", "success");
    setStatus(elements.globalStatus, "Digit model battle complete.", "success");
  } catch (error) {
    const message = error instanceof Error ? error.message : "Model Battle failed.";
    setStatus(elements.status, message, "error");
    showToast(message);
  } finally {
    setBusy(elements.battleButton, false);
  }
}

function updateSelectedModelNote() {
  if (!elements.selectedModelNote) return;
  const model = state.catalog.find((entry) => entry.id === elements.modelSelect.value);
  if (!model) {
    elements.selectedModelNote.textContent = "Choose a local digit model to run the canvas.";
    return;
  }
  const status = model.available ? "available locally" : "not available";
  elements.selectedModelNote.textContent =
    `${model.name || model.id} uses ${model.precision || "unknown"} precision, ` +
    `${formatBytes(modelSize(model))}, ${status}.`;
}

function renderModelCatalog(catalog) {
  if (!elements.modelCatalog || !elements.modelCatalogSummary) return;
  elements.modelCatalog.innerHTML = "";
  const models = Array.isArray(catalog.models) ? catalog.models : [];
  const available = models.filter((model) => model.available).length;
  elements.modelCatalogSummary.textContent =
    `${available} of ${models.length} catalog models are available locally. No external assets or cloud APIs are required.`;

  models.forEach((model) => {
    const card = document.createElement("article");
    card.className = "model-card";
    const statusLabel = model.available ? "Available" : "Missing";
    const statusClass = model.available ? "model-badge" : "model-badge unavailable";
    card.innerHTML = `
      <header>
        <div>
          <p class="eyebrow">${escapeHtml(model.task || "model")}</p>
          <h3>${escapeHtml(model.name || model.id)}</h3>
        </div>
        <span class="${statusClass}">${statusLabel}</span>
      </header>
      <dl>
        <div><dt>Format</dt><dd>${escapeHtml(model.precision || "unknown")}</dd></div>
        <div><dt>Size</dt><dd>${formatBytes(modelSize(model))}</dd></div>
        <div><dt>Params</dt><dd>${parameterCount(model).toLocaleString()}</dd></div>
      </dl>
      <p class="status">${escapeHtml(model.notes || model.local_path || "")}</p>
    `;
    elements.modelCatalog.append(card);
  });

  const blocked = catalog.blocked || {};
  Object.entries(blocked).forEach(([task, entries]) => {
    Object.entries(entries || {}).forEach(([modelId, entry]) => {
      const card = document.createElement("article");
      card.className = "model-card";
      card.innerHTML = `
        <header>
          <div>
            <p class="eyebrow">${escapeHtml(task)}</p>
            <h3>${escapeHtml(modelId)}</h3>
          </div>
          <span class="model-badge unavailable">Blocked</span>
        </header>
        <p class="status">${escapeHtml(entry.reason || "Blocked by local packaging requirements.")}</p>
      `;
      elements.modelCatalog.append(card);
    });
  });
}

async function loadCatalog() {
  try {
    const catalog = await fetchJson("/api/models/catalog");
    const models = Array.isArray(catalog.models) ? catalog.models : [];
    state.catalog = models;
    elements.modelSelect.innerHTML = "";

    const digitModels = models.filter((model) => {
      const task = String(model.task || "").toLowerCase();
      return task === "digit-classification" || String(model.id || "").startsWith("mnist-12");
    });

    digitModels.forEach((model) => {
      const option = document.createElement("option");
      option.value = model.id;
      option.textContent = `${model.precision || "model"} - ${formatBytes(modelSize(model))}`;
      option.disabled = !model.available;
      elements.modelSelect.append(option);
    });

    const firstAvailable = Array.from(elements.modelSelect.options).find((option) => !option.disabled);
    if (firstAvailable) {
      elements.modelSelect.value = firstAvailable.value;
    }

    renderModelCatalog(catalog);
    updateSelectedModelNote();
    const readyMessage = catalog.offline_ready
      ? "Local models ready."
      : "Some local models are missing. Available models can still run.";
    setStatus(elements.status, readyMessage, catalog.offline_ready ? "success" : "warning");
    setStatus(elements.globalStatus, readyMessage, catalog.offline_ready ? "success" : "warning");
  } catch (error) {
    const message = error instanceof Error ? error.message : "API not available.";
    setStatus(elements.status, message, "error");
    setStatus(elements.globalStatus, message, "error");
    if (elements.modelCatalogSummary) {
      elements.modelCatalogSummary.textContent = "The local API is not reachable, so the model catalog cannot be displayed yet.";
    }
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

function setPlaygroundOpen(open) {
  document.body.classList.toggle("playground-open", open);
}

function setActiveNav(hash) {
  const activeHash = labHashes.includes(hash) ? hash : "";
  document.querySelectorAll(".nav-links a").forEach((link) => {
    if (link.getAttribute("href") === activeHash) {
      link.setAttribute("aria-current", "page");
    } else {
      link.removeAttribute("aria-current");
    }
  });
}

function openPlayground(hash = "#digit-lab", focusTarget = false) {
  const targetHash = hash === "#playground" ? "#digit-lab" : hash;
  setPlaygroundOpen(true);
  if (window.location.hash !== targetHash) {
    window.history.pushState(null, "", targetHash);
  }
  const target = document.querySelector(targetHash);
  if (target) {
    target.scrollIntoView({ behavior: shouldReduceMotion() ? "auto" : "smooth", block: "start" });
    if (focusTarget) {
      window.setTimeout(() => target.focus?.({ preventScroll: true }), 250);
    }
  }
  setActiveNav(targetHash);
}

function handleHash() {
  const hash = window.location.hash || "#landing";
  if (labHashes.includes(hash)) {
    setPlaygroundOpen(true);
    setActiveNav(hash === "#playground" ? "#digit-lab" : hash);
  } else {
    setPlaygroundOpen(false);
    setActiveNav("");
  }
}

function shouldReduceMotion() {
  return (
    document.documentElement.classList.contains("force-reduced-motion") ||
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

function bindNavigation() {
  document.querySelectorAll("[data-enter-playground]").forEach((button) => {
    button.addEventListener("click", () => openPlayground("#digit-lab"));
  });

  document.querySelectorAll("[data-lab-link]").forEach((link) => {
    link.addEventListener("click", (event) => {
      const hash = link.getAttribute("href");
      if (!hash || !hash.startsWith("#")) return;
      event.preventDefault();
      openPlayground(hash);
    });
  });

  window.addEventListener("hashchange", handleHash);
  handleHash();

  const observer = new IntersectionObserver(
    (entries) => {
      const visible = entries
        .filter((entry) => entry.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (visible?.target?.id) {
        setActiveNav(`#${visible.target.id}`);
      }
    },
    { rootMargin: "-35% 0px -48% 0px", threshold: [0.1, 0.25, 0.5] }
  );
  document.querySelectorAll(".lab-section").forEach((section) => observer.observe(section));
}

function bindEvents() {
  if (!canvas) return;
  canvas.addEventListener("pointerdown", beginStroke);
  canvas.addEventListener("pointermove", moveStroke);
  canvas.addEventListener("pointerup", endStroke);
  canvas.addEventListener("pointercancel", endStroke);
  canvas.addEventListener("contextmenu", (event) => event.preventDefault());
  canvas.addEventListener("keydown", (event) => {
    if (event.key === "Delete" || event.key === "Backspace") {
      event.preventDefault();
      clearCanvas();
    }
  });

  document.querySelectorAll("[data-tool]").forEach((button) => {
    button.addEventListener("click", () => setTool(button.dataset.tool === "eraser" ? "eraser" : "pen"));
  });

  elements.clearButton.addEventListener("click", clearCanvas);
  elements.predictButton.addEventListener("click", predictDigit);
  elements.battleButton.addEventListener("click", runBattle);
  elements.modelSelect.addEventListener("change", updateSelectedModelNote);
  [elements.strokeWidth, elements.rotation, elements.noise].forEach((input) => {
    input.addEventListener("input", syncControlLabels);
  });

  elements.calmMotion.checked = window.localStorage.getItem("calm-motion") === "true";
  document.documentElement.classList.toggle("force-reduced-motion", elements.calmMotion.checked);
  elements.calmMotion.addEventListener("change", () => {
    document.documentElement.classList.toggle("force-reduced-motion", elements.calmMotion.checked);
    window.localStorage.setItem("calm-motion", String(elements.calmMotion.checked));
    document.dispatchEvent(new CustomEvent("motion-preference-changed"));
  });
}

function saveLabResult(kind, payload) {
  const key = "ai-playground-experiments";
  const current = JSON.parse(window.localStorage.getItem(key) || "[]");
  current.unshift({ kind, createdAt: new Date().toISOString(), payload });
  window.localStorage.setItem(key, JSON.stringify(current.slice(0, 30)));
}

function resultLine(label, value) {
  return `<div class="result-card"><strong>${escapeHtml(label)}</strong><br><span>${escapeHtml(value)}</span></div>`;
}

function topKText(rows) {
  return rows.map((item) => `${item.label}: ${formatPercent(item.probability)}`).join(" | ");
}

function copyCanvas(source, target) {
  const targetContext = target?.getContext("2d");
  if (!source || !target || !targetContext) return;
  targetContext.clearRect(0, 0, target.width, target.height);
  targetContext.drawImage(source, 0, 0, target.width, target.height);
}

function resetRepairOutput(message = "Awaiting compatible model") {
  if (!lab.repairAfterPreview) return;
  lab.repairAfterPreview.textContent = message;
}

function drawImageCover(ctx2d, image, width, height) {
  const scale = Math.max(width / image.width, height / image.height);
  const drawWidth = image.width * scale;
  const drawHeight = image.height * scale;
  const dx = (width - drawWidth) / 2;
  const dy = (height - drawHeight) / 2;
  ctx2d.fillStyle = "#04070d";
  ctx2d.fillRect(0, 0, width, height);
  ctx2d.drawImage(image, dx, dy, drawWidth, drawHeight);
}

function loadImageFileToCanvas(input, targetCanvas, onReady) {
  const file = input.files?.[0];
  const ctx2d = targetCanvas?.getContext("2d");
  if (!file || !targetCanvas || !ctx2d) return;
  if (!file.type.startsWith("image/")) {
    showToast("Choose an image file.");
    return;
  }
  const image = new Image();
  const url = URL.createObjectURL(file);
  image.onload = () => {
    drawImageCover(ctx2d, image, targetCanvas.width, targetCanvas.height);
    URL.revokeObjectURL(url);
    onReady?.();
  };
  image.onerror = () => {
    URL.revokeObjectURL(url);
    showToast("The image could not be loaded.");
  };
  image.src = url;
}

function drawRepairSample() {
  const repairCanvas = lab.repairCanvas;
  const ctx2d = repairCanvas?.getContext("2d");
  if (!repairCanvas || !ctx2d) return;
  const hue = Math.floor(Math.random() * 180) + 160;
  ctx2d.fillStyle = "#07101d";
  ctx2d.fillRect(0, 0, repairCanvas.width, repairCanvas.height);
  ctx2d.fillStyle = `hsl(${hue}, 70%, 72%)`;
  ctx2d.fillRect(32, 30, 86, 160);
  ctx2d.fillStyle = "#f0c875";
  ctx2d.beginPath();
  ctx2d.arc(142, 92, 46, 0, Math.PI * 2);
  ctx2d.fill();
  ctx2d.strokeStyle = "#fff7fa";
  ctx2d.lineWidth = 10;
  ctx2d.strokeRect(48, 52, 128, 112);
  copyCanvas(repairCanvas, lab.repairBeforeCanvas);
  resetRepairOutput();
  setStatus(lab.repairStatus, "Editable sample ready.", "success");
}

function damageRepairCanvas() {
  const repairCanvas = lab.repairCanvas;
  const ctx2d = repairCanvas?.getContext("2d");
  if (!repairCanvas || !ctx2d || !lab.repairStrength || !lab.repairDamage) return;
  copyCanvas(repairCanvas, lab.repairBeforeCanvas);
  const strength = Number(lab.repairStrength.value);
  if (lab.repairDamage.value === "block") {
    ctx2d.fillStyle = "rgba(3, 5, 9, 0.92)";
    const size = 42 + strength * 88;
    ctx2d.fillRect(86, 74, size, size);
  } else {
    const image = ctx2d.getImageData(0, 0, repairCanvas.width, repairCanvas.height);
    for (let i = 0; i < image.data.length; i += 4) {
      const n = (Math.random() - 0.5) * 255 * strength;
      image.data[i] = Math.max(0, Math.min(255, image.data[i] + n));
      image.data[i + 1] = Math.max(0, Math.min(255, image.data[i + 1] + n));
      image.data[i + 2] = Math.max(0, Math.min(255, image.data[i + 2] + n));
    }
    ctx2d.putImageData(image, 0, 0);
  }
  resetRepairOutput();
  setStatus(lab.repairStatus, "Damage applied. The licensed autoencoder check will run locally.", "warning");
}

async function runRepair() {
  if (!lab.repairCanvas || !lab.repairStatus || !lab.repairStrength || !lab.repairDamage) return;
  setBusy(lab.repairRunButton, true, "Checking...");
  setStatus(lab.repairStatus, "Checking local autoencoder...");
  try {
    const result = await fetchJson("/api/repair/image", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        image_data_url: lab.repairCanvas.toDataURL("image/png"),
        damage: lab.repairDamage.value,
        strength: Number(lab.repairStrength.value),
      }),
    });
    setStatus(lab.repairStatus, result.reason || "Repair request completed.", "success");
  } catch (error) {
    const message = error instanceof Error ? error.message : "Repair check failed.";
    setStatus(lab.repairStatus, message, "warning");
    resetRepairOutput("Blocked by local model packaging");
  } finally {
    setBusy(lab.repairRunButton, false);
  }
}

async function predictTextLab() {
  if (!lab.textInput || !lab.textResult) return;
  lab.textResult.innerHTML = resultLine("Text Lab", "Running local sentiment model...");
  setBusy(lab.textPredictButton, true, "Reading...");
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
      resultLine("Explanation", result.explanation) +
      resultLine("Tokens", result.highlighted_tokens.join(" "));
    saveLabResult("text", result);
    setStatus(elements.globalStatus, "Text prediction complete.", "success");
  } catch (error) {
    lab.textResult.innerHTML = resultLine("Notice", error instanceof Error ? error.message : "Text prediction failed.");
  } finally {
    setBusy(lab.textPredictButton, false);
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
  lab.crossBattleResults.innerHTML = resultLine("Text Battle", "Comparing original and edited text...");
  setBusy(lab.textBattleButton, true, "Comparing...");
  try {
    const result = await fetchJson("/api/battle/text", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ original_text: original, edited_text: edited }),
    });
    lab.crossBattleResults.innerHTML = resultLine(
      "Text Battle",
      `${result.results[0].prediction} vs ${result.results[1].prediction}; confidence delta ${formatPercent(result.confidence_delta)}`
    );
  } catch (error) {
    lab.crossBattleResults.innerHTML = resultLine("Notice", error instanceof Error ? error.message : "Text battle failed.");
  } finally {
    setBusy(lab.textBattleButton, false);
  }
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
  ctx2d.fillStyle = "#04070d";
  ctx2d.fillRect(0, 0, lab.soundCanvas.width, lab.soundCanvas.height);
  const gradient = ctx2d.createLinearGradient(0, 0, lab.soundCanvas.width, 0);
  gradient.addColorStop(0, "#9bc9e6");
  gradient.addColorStop(0.55, "#f59ab8");
  gradient.addColorStop(1, "#f0c875");
  ctx2d.strokeStyle = gradient;
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
  setBusy(lab.soundPredictButton, true, "Classifying...");
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
      resultLine("CPU Latency", formatMs(result.latency_ms)) +
      resultLine("Explanation", result.explanation);
    saveLabResult("sound", result);
    setStatus(elements.globalStatus, "Sound classification complete.", "success");
  } catch (error) {
    lab.soundResult.innerHTML = resultLine("Notice", error instanceof Error ? error.message : "Sound prediction failed.");
  } finally {
    setBusy(lab.soundPredictButton, false);
  }
}

async function battleSoundLab() {
  if (!lab.crossBattleResults) return;
  if (soundSamples.length === 0) generateSound();
  lab.crossBattleResults.innerHTML = resultLine("Sound Battle", "Comparing clean and noisy waveform...");
  setBusy(lab.soundBattleButton, true, "Comparing...");
  try {
    const result = await fetchJson("/api/battle/sound", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ samples: soundSamples, sample_rate: 16000 }),
    });
    lab.crossBattleResults.innerHTML = resultLine(
      "Sound Battle",
      `${result.results[0].prediction} vs ${result.results[1].prediction}; confidence delta ${formatPercent(result.confidence_delta)}`
    );
  } catch (error) {
    lab.crossBattleResults.innerHTML = resultLine("Notice", error instanceof Error ? error.message : "Sound battle failed.");
  } finally {
    setBusy(lab.soundBattleButton, false);
  }
}

function drawStyleSample() {
  const styleCanvas = lab.styleCanvas;
  const ctx2d = styleCanvas?.getContext("2d");
  if (!styleCanvas || !ctx2d) return;
  const gradient = ctx2d.createLinearGradient(0, 0, 224, 224);
  gradient.addColorStop(0, "#204c78");
  gradient.addColorStop(0.48, "#d96f90");
  gradient.addColorStop(1, "#f0c875");
  ctx2d.fillStyle = gradient;
  ctx2d.fillRect(0, 0, 224, 224);
  ctx2d.fillStyle = "#f0c875";
  ctx2d.fillRect(30, 130, 164, 42);
  ctx2d.fillStyle = "#9bc9e6";
  ctx2d.beginPath();
  ctx2d.arc(112, 84, 46, 0, Math.PI * 2);
  ctx2d.fill();
  ctx2d.strokeStyle = "#fff7fa";
  ctx2d.lineWidth = 8;
  ctx2d.strokeRect(54, 48, 116, 118);
  if (lab.styleOutput) {
    lab.styleOutput.removeAttribute("src");
  }
}

async function runStyleLab() {
  if (!lab.styleCanvas || !lab.styleSelect || !lab.styleIntensity || !lab.styleSaturation || !lab.styleResult) return;
  lab.styleResult.innerHTML = resultLine("Style", "Running local neural style model...");
  setBusy(lab.styleRunButton, true, "Stylizing...");
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
      resultLine("Size", formatBytes(result.model_size_bytes)) +
      resultLine("Explanation", result.explanation);
    saveLabResult("style", result);
    setStatus(elements.globalStatus, "Style transfer complete.", "success");
  } catch (error) {
    lab.styleResult.innerHTML = resultLine("Notice", error instanceof Error ? error.message : "Style transform failed.");
  } finally {
    setBusy(lab.styleRunButton, false);
  }
}

async function battleStyleLab() {
  if (!lab.styleCanvas || !lab.crossBattleResults) return;
  lab.crossBattleResults.innerHTML = resultLine("Style Battle", "Comparing Mosaic and Candy styles...");
  setBusy(lab.styleBattleButton, true, "Comparing...");
  try {
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
  } catch (error) {
    lab.crossBattleResults.innerHTML = resultLine("Notice", error instanceof Error ? error.message : "Style battle failed.");
  } finally {
    setBusy(lab.styleBattleButton, false);
  }
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
    lab.challengeList.innerHTML = challenges.map((item) => `<div class="challenge-item">${escapeHtml(item)}</div>`).join("");
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
  lab.repairUpload?.addEventListener("change", () => {
    loadImageFileToCanvas(lab.repairUpload, lab.repairCanvas, () => {
      copyCanvas(lab.repairCanvas, lab.repairBeforeCanvas);
      resetRepairOutput();
      setStatus(lab.repairStatus, "Source image loaded.", "success");
    });
  });
  lab.styleUpload?.addEventListener("change", () => {
    loadImageFileToCanvas(lab.styleUpload, lab.styleCanvas, () => {
      if (lab.styleOutput) lab.styleOutput.removeAttribute("src");
      if (lab.styleResult) lab.styleResult.innerHTML = resultLine("Style", "Source image loaded.");
    });
  });
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

function setupLivingScene() {
  const sceneCanvas = optional("sceneCanvas");
  const sceneContext = sceneCanvas?.getContext("2d");
  if (!sceneCanvas || !sceneContext) return;

  const mediaReduce = window.matchMedia("(prefers-reduced-motion: reduce)");
  const scene = {
    width: 0,
    height: 0,
    dpr: 1,
    petals: [],
    glints: [],
    raf: 0,
    last: 0,
  };

  function reduced() {
    return mediaReduce.matches || document.documentElement.classList.contains("force-reduced-motion");
  }

  function petalCount() {
    if (reduced()) return 0;
    if (window.innerWidth < 640) return 18;
    if (window.innerWidth < 1024) return 36;
    return 64;
  }

  function makePetal(y = Math.random() * scene.height) {
    const depth = 0.45 + Math.random() * 0.75;
    return {
      x: Math.random() * scene.width,
      y,
      size: (5 + Math.random() * 9) * depth,
      speed: (16 + Math.random() * 34) * depth,
      drift: (-10 + Math.random() * 28) * depth,
      rotation: Math.random() * Math.PI * 2,
      spin: (-0.8 + Math.random() * 1.6) * depth,
      phase: Math.random() * Math.PI * 2,
      opacity: 0.28 + Math.random() * 0.5,
      color: Math.random() > 0.5 ? "rgba(255, 188, 207, 0.86)" : "rgba(245, 154, 184, 0.78)",
    };
  }

  function makeGlint() {
    return {
      x: Math.random() * scene.width,
      y: scene.height * (0.56 + Math.random() * 0.34),
      width: 26 + Math.random() * 90,
      alpha: 0.08 + Math.random() * 0.18,
      speed: 8 + Math.random() * 16,
    };
  }

  function resizeScene() {
    scene.dpr = Math.min(window.devicePixelRatio || 1, 1.6);
    scene.width = window.innerWidth;
    scene.height = window.innerHeight;
    sceneCanvas.width = Math.floor(scene.width * scene.dpr);
    sceneCanvas.height = Math.floor(scene.height * scene.dpr);
    sceneCanvas.style.width = `${scene.width}px`;
    sceneCanvas.style.height = `${scene.height}px`;
    sceneContext.setTransform(scene.dpr, 0, 0, scene.dpr, 0, 0);
    scene.petals = Array.from({ length: petalCount() }, () => makePetal());
    scene.glints = Array.from({ length: window.innerWidth < 640 ? 8 : 14 }, makeGlint);
  }

  function drawPetal(petal) {
    sceneContext.save();
    sceneContext.globalAlpha = petal.opacity;
    sceneContext.translate(petal.x, petal.y);
    sceneContext.rotate(petal.rotation);
    sceneContext.fillStyle = petal.color;
    sceneContext.beginPath();
    sceneContext.ellipse(0, 0, petal.size * 0.48, petal.size, 0.2, 0, Math.PI * 2);
    sceneContext.fill();
    sceneContext.restore();
  }

  function drawGlint(glint) {
    const gradient = sceneContext.createLinearGradient(glint.x, glint.y, glint.x + glint.width, glint.y);
    gradient.addColorStop(0, "rgba(255, 246, 236, 0)");
    gradient.addColorStop(0.5, `rgba(255, 236, 218, ${glint.alpha})`);
    gradient.addColorStop(1, "rgba(255, 246, 236, 0)");
    sceneContext.strokeStyle = gradient;
    sceneContext.lineWidth = 1;
    sceneContext.beginPath();
    sceneContext.moveTo(glint.x, glint.y);
    sceneContext.lineTo(glint.x + glint.width, glint.y + Math.sin(glint.x * 0.01) * 2);
    sceneContext.stroke();
  }

  function animate(now) {
    if (document.hidden || reduced()) {
      scene.raf = 0;
      sceneContext.clearRect(0, 0, scene.width, scene.height);
      return;
    }

    const dt = Math.min(0.05, (now - (scene.last || now)) / 1000);
    scene.last = now;
    sceneContext.clearRect(0, 0, scene.width, scene.height);

    scene.glints.forEach((glint) => {
      glint.x += glint.speed * dt;
      if (glint.x > scene.width + glint.width) {
        Object.assign(glint, makeGlint(), { x: -glint.width });
      }
      drawGlint(glint);
    });

    scene.petals.forEach((petal, index) => {
      const wind = Math.sin(now * 0.00024 + petal.phase) * 18;
      petal.x += (petal.drift + wind) * dt;
      petal.y += petal.speed * dt;
      petal.rotation += petal.spin * dt;
      if (petal.y > scene.height + 28 || petal.x < -40 || petal.x > scene.width + 60) {
        scene.petals[index] = makePetal(-30 - Math.random() * scene.height * 0.3);
      } else {
        drawPetal(petal);
      }
    });

    scene.raf = requestAnimationFrame(animate);
  }

  function startScene() {
    if (scene.raf || reduced() || document.hidden) return;
    scene.last = performance.now();
    scene.raf = requestAnimationFrame(animate);
  }

  function stopScene() {
    if (scene.raf) cancelAnimationFrame(scene.raf);
    scene.raf = 0;
    sceneContext.clearRect(0, 0, scene.width, scene.height);
  }

  let resizeTimer = 0;
  window.addEventListener("resize", () => {
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(() => {
      resizeScene();
      if (!reduced()) startScene();
    }, 120);
  });

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) stopScene();
    else startScene();
  });

  document.addEventListener("motion-preference-changed", () => {
    if (reduced()) stopScene();
    else {
      resizeScene();
      startScene();
    }
  });

  mediaReduce.addEventListener("change", () => {
    document.dispatchEvent(new CustomEvent("motion-preference-changed"));
  });

  let pointerFrame = 0;
  window.addEventListener("pointermove", (event) => {
    if (reduced() || window.innerWidth < 780 || pointerFrame) return;
    pointerFrame = requestAnimationFrame(() => {
      const x = ((event.clientX / window.innerWidth) - 0.5) * 18;
      const y = ((event.clientY / window.innerHeight) - 0.5) * 12;
      document.documentElement.style.setProperty("--parallax-x", `${x.toFixed(2)}px`);
      document.documentElement.style.setProperty("--parallax-y", `${y.toFixed(2)}px`);
      pointerFrame = 0;
    });
  });

  resizeScene();
  startScene();
}

bindNavigation();
setupCanvas();
bindEvents();
syncControlLabels();
renderHistory();
bindLabEvents();
syncLabLabels();
drawRepairSample();
generateSound();
drawStyleSample();
updateEducationMode();
setupLivingScene();
void loadCatalog();
