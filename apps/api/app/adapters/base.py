from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Generic, TypeVar

import onnxruntime as ort

InputT = TypeVar("InputT")
OutputT = TypeVar("OutputT")


class ModelAdapter(ABC, Generic[InputT, OutputT]):
    id: str
    task: str

    @abstractmethod
    def predict(self, model_input: InputT) -> OutputT:
        """Run local inference and return a structured prediction."""


def cpu_session_options() -> ort.SessionOptions:
    options = ort.SessionOptions()
    options.graph_optimization_level = ort.GraphOptimizationLevel.ORT_ENABLE_ALL
    options.intra_op_num_threads = 2
    options.inter_op_num_threads = 1
    options.log_severity_level = 3
    return options
