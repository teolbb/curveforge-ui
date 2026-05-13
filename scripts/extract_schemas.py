#!/usr/bin/env python3
"""Emit the curveforge UI schema bundle as JSON to stdout.

Reads `curveforge` from the active Python environment, walks every
registered curve and transform, and emits a single JSON object the
browser UI ingests directly. The shape matches what the same logic
produces at runtime via Pyodide, so the static cache is byte-equivalent
to the runtime fetch.

Run from the curveforge-ui repo:

    python scripts/extract_schemas.py > public/schemas.json

Requires `curveforge` to be importable (e.g. `pip install curveforge`).
"""

from __future__ import annotations

import json
import sys
from importlib.metadata import PackageNotFoundError, version
from typing import Any

from curveforge.curves import list_curves
from curveforge.transforms import list_transforms


def _step_from_range(lo: float, hi: float, kind: str) -> float:
    if kind == "integer":
        return 1.0
    r = hi - lo
    if r <= 2:
        return 0.05
    if r <= 20:
        return 0.5
    if r <= 200:
        return 1.0
    if r <= 2000:
        return 5.0
    return 10.0


def _infer_bounds(
    name: str,
    lo: float | None,
    hi: float | None,
    default: float | None,
) -> tuple[float, float, float]:
    if lo is None or hi is None:
        if name == "freq" or name.endswith("_hz") or name in ("corner", "anchor"):
            lo = 20.0 if lo is None else lo
            hi = 20000.0 if hi is None else hi
        elif "gain" in name:
            lo = -24.0 if lo is None else lo
            hi = 24.0 if hi is None else hi
        elif name == "order":
            lo = 1 if lo is None else lo
            hi = 8 if hi is None else hi
        elif name == "taper":
            lo = 0.0 if lo is None else lo
            hi = 1.0 if hi is None else hi
        else:
            lo = 0.0 if lo is None else lo
            hi = 1.0 if hi is None else hi
    if default is None:
        if "gain" in name:
            default = 0.0
        elif name == "freq":
            default = 1000.0
        elif name == "corner":
            default = 200.0
        elif name == "anchor":
            default = 1000.0
        elif name.endswith("_hz"):
            default = 1000.0
        elif name == "order":
            default = 2
        elif name == "taper":
            default = 1.0 / 6.0
        else:
            default = (lo + hi) / 2
    return lo, hi, default


def _param_to_dict(name: str, info: dict[str, Any]) -> dict[str, Any]:
    enum_vals = info.get("enum")
    if enum_vals is not None:
        return {
            "name": name,
            "kind": "enum",
            "enumValues": enum_vals,
            "default": info.get("default", enum_vals[0]),
            "description": info.get("description", ""),
        }
    t = info.get("type", "number")
    if t == "array":
        # Pairs of (freq_hz, gain_db); UI renders a table.
        return {
            "name": name,
            "kind": "breakpoints",
            "default": [[20.0, 0.0], [20000.0, 0.0]],
            "description": info.get("description", ""),
        }
    kind = "integer" if t == "integer" else "number"
    lo, hi, default = _infer_bounds(
        name, info.get("minimum"), info.get("maximum"), info.get("default")
    )
    return {
        "name": name,
        "kind": kind,
        "min": float(lo),
        "max": float(hi),
        "default": float(default),
        "step": _step_from_range(lo, hi, kind),
        "description": info.get("description", ""),
    }


def _spec_to_dict(spec: Any, *, include_citation: bool) -> dict[str, Any] | None:
    schema = spec.params_model.model_json_schema()
    props = schema.get("properties", {})
    params = [
        _param_to_dict(name, props.get(name, {})) for name in spec.params_model.model_fields
    ]
    out: dict[str, Any] = {
        "name": spec.name,
        "title": spec.title,
        "description": spec.description,
        "params": params,
    }
    if include_citation:
        out["citation"] = spec.citation
    return out


def main() -> int:
    try:
        cf_version = version("curveforge")
    except PackageNotFoundError:
        cf_version = "unknown"

    out = {
        "curveforge_version": cf_version,
        "curves": [
            d for d in (_spec_to_dict(s, include_citation=True) for s in list_curves()) if d
        ],
        "transforms": [
            d
            for d in (_spec_to_dict(s, include_citation=False) for s in list_transforms())
            if d
        ],
    }
    json.dump(out, sys.stdout, indent=2)
    sys.stdout.write("\n")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
