from __future__ import annotations

import re
import time
from functools import lru_cache
from pathlib import Path

import numpy as np
import onnxruntime as ort

from app.adapters.base import ModelAdapter, cpu_session_options
from app.schemas.common import ClassProbability
from app.schemas.playgrounds import TextPredictionResponse
from app.settings import get_settings


LABELS = ["Negative", "Positive"]
WORD_RE = re.compile(r"[a-z0-9]+|[^\w\s]", re.IGNORECASE)


def _softmax(scores: np.ndarray) -> np.ndarray:
    scores = scores.astype(np.float64)
    exps = np.exp(scores - np.max(scores))
    return exps / np.sum(exps)


class WordPieceTokenizer:
    def __init__(self, vocab_path: Path) -> None:
        vocab = vocab_path.read_text(encoding="utf-8").splitlines()
        self.vocab = {token: index for index, token in enumerate(vocab)}
        self.pad_id = self.vocab["[PAD]"]
        self.unk_id = self.vocab["[UNK]"]
        self.cls_id = self.vocab["[CLS]"]
        self.sep_id = self.vocab["[SEP]"]

    def tokenize(self, text: str, max_length: int = 64) -> tuple[np.ndarray, np.ndarray, list[str]]:
        tokens = ["[CLS]"]
        for word in WORD_RE.findall(text.lower()):
            tokens.extend(self._wordpiece(word))
        tokens = tokens[: max_length - 1] + ["[SEP]"]
        ids = [self.vocab.get(token, self.unk_id) for token in tokens]
        mask = [1] * len(ids)
        while len(ids) < max_length:
            ids.append(self.pad_id)
            mask.append(0)
        return (
            np.asarray([ids], dtype=np.int64),
            np.asarray([mask], dtype=np.int64),
            tokens,
        )

    def _wordpiece(self, word: str) -> list[str]:
        if word in self.vocab:
            return [word]
        pieces: list[str] = []
        start = 0
        while start < len(word):
            end = len(word)
            current = None
            while start < end:
                candidate = word[start:end] if start == 0 else f"##{word[start:end]}"
                if candidate in self.vocab:
                    current = candidate
                    break
                end -= 1
            if current is None:
                return ["[UNK]"]
            pieces.append(current)
            start = end
        return pieces


class TextSentimentAdapter(ModelAdapter[str, TextPredictionResponse]):
    id = "distilbert-sst2-int8-onnx"
    task = "sentiment-classification"

    def __init__(self) -> None:
        settings = get_settings()
        self.path = settings.text_model_root / "model_quantized.onnx"
        self.vocab_path = settings.text_model_root / "vocab.txt"
        if not self.path.exists() or not self.vocab_path.exists():
            raise FileNotFoundError("Missing text model files. Run scripts/download_all_models.py.")
        self.tokenizer = WordPieceTokenizer(self.vocab_path)
        self.session = ort.InferenceSession(
            str(self.path),
            sess_options=cpu_session_options(),
            providers=["CPUExecutionProvider"],
        )

    def predict(self, model_input: str) -> TextPredictionResponse:
        ids, mask, tokens = self.tokenizer.tokenize(model_input)
        started = time.perf_counter()
        logits = self.session.run(["logits"], {"input_ids": ids, "attention_mask": mask})[0]
        latency_ms = (time.perf_counter() - started) * 1000.0
        probabilities = _softmax(logits.reshape(-1))
        rows = [
            ClassProbability(label=label, probability=float(probabilities[index]))
            for index, label in enumerate(LABELS)
        ]
        winner = max(rows, key=lambda item: item.probability)
        highlighted = [token for token in tokens if token not in {"[CLS]", "[SEP]", "[PAD]"}][:12]
        return TextPredictionResponse(
            model_id=self.id,
            model_name="MIT int8 DistilBERT SST-2 sentiment classifier",
            prediction=winner.label,
            confidence=winner.probability,
            probabilities=rows,
            latency_ms=latency_ms,
            model_size_bytes=self.path.stat().st_size,
            token_count=len(highlighted),
            highlighted_tokens=highlighted,
            explanation=(
                "The local model tokenizes the sentence into WordPiece tokens and predicts whether the mood "
                "leans positive or negative. The richer emotion model from the blueprint is not packaged "
                "because its public licence could not be verified."
            ),
        )


@lru_cache(maxsize=1)
def get_text_adapter() -> TextSentimentAdapter:
    return TextSentimentAdapter()
