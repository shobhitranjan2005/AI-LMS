from __future__ import annotations

from pydantic import BaseModel, Field


class ClassProbability(BaseModel):
    label: str
    probability: float = Field(ge=0.0, le=1.0)


class ModelCatalogEntry(BaseModel):
    id: str
    name: str
    task: str
    precision: str
    local_path: str
    source_url: str
    license: str
    parameter_count: int
    model_size_bytes: int
    available: bool
    notes: str

