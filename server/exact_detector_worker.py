#!/usr/bin/env python3
import base64
import io
import json
import sys
from typing import Dict, Any

MODEL_REPOS: Dict[str, str] = {
    "univfd-clip": "slxhere/UnivFD",
    "ateeqq-detector": "Ateeqq/ai-vs-human-image-detector",
    "deepfake-v1-siglip": "prithivMLmods/deepfake-detector-model-v1",
    "umm-maybe-detector": "umm-maybe/AI-image-detector",
    "umm-maybe": "umm-maybe/AI-image-detector",
    "dima806-detector": "dima806/deepfake_vs_real_image_detection",
    "dima": "dima806/deepfake_vs_real_image_detection",
}

PIPELINE_CACHE: Dict[str, Any] = {}
UNIVFD_CACHE: Dict[str, Any] = {}
IMPORT_ERROR: str = ""
PIL_Image = None
hf_pipeline = None
torch_mod = None
hf_hub_download_fn = None
CLIPVisionModelWithProjection_cls = None
CLIPModel_cls = None
AutoImageProcessor_cls = None

try:
    from PIL import Image as _PIL_Image  # type: ignore
    from transformers import pipeline as _hf_pipeline  # type: ignore
    from transformers import CLIPVisionModelWithProjection as _CLIPVisionModelWithProjection  # type: ignore
    from transformers import CLIPModel as _CLIPModel  # type: ignore
    from transformers import AutoImageProcessor as _AutoImageProcessor  # type: ignore
    import torch as _torch  # type: ignore
    from huggingface_hub import hf_hub_download as _hf_hub_download  # type: ignore
    PIL_Image = _PIL_Image
    hf_pipeline = _hf_pipeline
    CLIPVisionModelWithProjection_cls = _CLIPVisionModelWithProjection
    CLIPModel_cls = _CLIPModel
    AutoImageProcessor_cls = _AutoImageProcessor
    torch_mod = _torch
    hf_hub_download_fn = _hf_hub_download
except Exception as exc:
    IMPORT_ERROR = f"Python dependencies missing in worker environment: {exc}. Install with: python3 -m pip install --user transformers torch pillow huggingface_hub"


def map_label_to_decision(model_id: str, label: str) -> str:
    normalized = (label or "").strip().lower()
    is_fake = any(k in normalized for k in ["fake", "deepfake", "ai", "artificial", "synthetic"])
    is_real = any(k in normalized for k in ["real", "human", "hum", "authentic", "genuine"])

    if model_id in {"dima806-detector", "dima"}:
        if normalized == "fake":
            return "FAKE"
        if normalized == "real":
            return "REAL"

    if model_id == "ateeqq-detector":
        if normalized == "ai":
            return "FAKE"
        if normalized in {"hum", "human"}:
            return "REAL"

    if is_fake and not is_real:
        return "FAKE"
    if is_real and not is_fake:
        return "REAL"
    return "UNKNOWN"


def get_classifier(model_repo: str):
    if model_repo in PIPELINE_CACHE:
        return PIPELINE_CACHE[model_repo]

    print(json.dumps({"event": "loading", "modelRepo": model_repo}), file=sys.stderr, flush=True)
    clf = hf_pipeline("image-classification", model=model_repo, device=-1)
    PIPELINE_CACHE[model_repo] = clf
    print(json.dumps({"event": "loaded", "modelRepo": model_repo}), file=sys.stderr, flush=True)
    return clf


def _extract_fc_state(fc_state: Any):
    # Handle both direct state_dict and wrapped checkpoint objects.
    if isinstance(fc_state, dict) and "state_dict" in fc_state and isinstance(fc_state["state_dict"], dict):
        fc_state = fc_state["state_dict"]

    if not isinstance(fc_state, dict):
        raise RuntimeError("Unexpected UnivFD fc checkpoint format (expected dict/state_dict).")

    # Normalize common key variants to Linear state_dict keys.
    if "weight" in fc_state and "bias" in fc_state:
        state = {"weight": fc_state["weight"], "bias": fc_state["bias"]}
    elif "fc.weight" in fc_state and "fc.bias" in fc_state:
        state = {"weight": fc_state["fc.weight"], "bias": fc_state["fc.bias"]}
    elif "module.fc.weight" in fc_state and "module.fc.bias" in fc_state:
        state = {"weight": fc_state["module.fc.weight"], "bias": fc_state["module.fc.bias"]}
    else:
        # Best-effort fallback: pick first 2D tensor as weight, first 1D as bias.
        weight = None
        bias = None
        for value in fc_state.values():
            if hasattr(value, "ndim") and value.ndim == 2 and weight is None:
                weight = value
            elif hasattr(value, "ndim") and value.ndim == 1 and bias is None:
                bias = value
        if weight is None or bias is None:
            raise RuntimeError("Could not infer UnivFD classifier weights from checkpoint.")
        state = {"weight": weight, "bias": bias}

    if not hasattr(state["weight"], "shape") or len(state["weight"].shape) != 2:
        raise RuntimeError("Invalid UnivFD classifier weight shape.")
    in_features = int(state["weight"].shape[1])
    return state, in_features


def _to_embedding_tensor(output_obj: Any):
    # Normal path: already an embedding tensor.
    if torch_mod.is_tensor(output_obj):
        return output_obj

    # Common CLIP-style fields.
    if hasattr(output_obj, "image_embeds") and torch_mod.is_tensor(output_obj.image_embeds):
        return output_obj.image_embeds
    if hasattr(output_obj, "pooler_output") and torch_mod.is_tensor(output_obj.pooler_output):
        return output_obj.pooler_output
    if hasattr(output_obj, "last_hidden_state") and torch_mod.is_tensor(output_obj.last_hidden_state):
        return output_obj.last_hidden_state[:, 0, :]

    # Dataclass/ModelOutput fallback.
    if hasattr(output_obj, "to_tuple"):
        values = output_obj.to_tuple()
        for value in values:
            if torch_mod.is_tensor(value):
                # If a full sequence is returned, use CLS token as embedding.
                if value.ndim == 3:
                    return value[:, 0, :]
                return value

    # Tuple/list fallback.
    if isinstance(output_obj, (tuple, list)):
        for value in output_obj:
            if torch_mod.is_tensor(value):
                if value.ndim == 3:
                    return value[:, 0, :]
                return value

    raise RuntimeError(f"Unsupported CLIP output type for embeddings: {type(output_obj).__name__}")


def get_univfd_components():
    if UNIVFD_CACHE:
        return UNIVFD_CACHE

    print(json.dumps({"event": "loading", "modelRepo": "slxhere/UnivFD"}), file=sys.stderr, flush=True)

    processor = AutoImageProcessor_cls.from_pretrained("openai/clip-vit-large-patch14")
    model_mode = "vision_projection"
    try:
        # Works in many transformers releases; produces image_embeds directly.
        clip_model = CLIPVisionModelWithProjection_cls.from_pretrained("openai/clip-vit-large-patch14")
    except Exception as exc:
        # Compatibility fallback for newer/changed CLIP config handling.
        if CLIPModel_cls is None:
            raise RuntimeError(f"Failed to load CLIP vision model: {exc}")
        clip_model = CLIPModel_cls.from_pretrained("openai/clip-vit-large-patch14")
        model_mode = "clip_model"
    clip_model.eval()

    fc_path = hf_hub_download_fn(repo_id="slxhere/UnivFD", filename="fc_weights.pth")
    fc_state = torch_mod.load(fc_path, map_location="cpu")
    linear_state, in_features = _extract_fc_state(fc_state)
    classifier = torch_mod.nn.Linear(in_features, 1)
    classifier.load_state_dict(linear_state)
    classifier.eval()

    UNIVFD_CACHE["processor"] = processor
    UNIVFD_CACHE["clip_model"] = clip_model
    UNIVFD_CACHE["classifier"] = classifier
    UNIVFD_CACHE["model_mode"] = model_mode

    print(json.dumps({"event": "loaded", "modelRepo": "slxhere/UnivFD"}), file=sys.stderr, flush=True)
    return UNIVFD_CACHE


def run_univfd(image):
    components = get_univfd_components()
    processor = components["processor"]
    clip_model = components["clip_model"]
    classifier = components["classifier"]
    model_mode = components.get("model_mode", "vision_projection")

    with torch_mod.no_grad():
        inputs = processor(images=image, return_tensors="pt")
        if model_mode == "clip_model":
            embeds = _to_embedding_tensor(clip_model.get_image_features(**inputs))
        else:
            embeds = _to_embedding_tensor(clip_model(**inputs))
        logits = classifier(embeds).squeeze(1)
        fake_prob = torch_mod.sigmoid(logits).item()

    fake_score = float(fake_prob)
    real_score = float(1.0 - fake_score)
    label = "FAKE" if fake_score >= 0.5 else "REAL"
    top_label = "Fake" if label == "FAKE" else "Real"
    top_score = fake_score if label == "FAKE" else real_score
    predictions = [
        {"label": "Fake", "score": fake_score},
        {"label": "Real", "score": real_score},
    ]
    return label, top_label, top_score, predictions


def handle_request(req: Dict[str, Any]) -> Dict[str, Any]:
    request_id = req.get("requestId")
    model_id = req.get("modelId")
    image_base64 = req.get("imageBase64")

    if not request_id:
        return {"ok": False, "error": "requestId is required"}
    if not model_id or not image_base64:
        return {"requestId": request_id, "ok": False, "error": "modelId and imageBase64 are required"}
    if IMPORT_ERROR:
        return {"requestId": request_id, "ok": False, "error": IMPORT_ERROR}

    model_repo = MODEL_REPOS.get(model_id)
    if not model_repo:
        return {"requestId": request_id, "ok": False, "error": f"No exact model mapping found for {model_id}"}

    try:
        cleaned = image_base64.split(",", 1)[1] if "," in image_base64 else image_base64
        image_bytes = base64.b64decode(cleaned)
        image = PIL_Image.open(io.BytesIO(image_bytes)).convert("RGB")
    except Exception as exc:
        return {"requestId": request_id, "ok": False, "error": f"Failed to parse image: {exc}"}

    try:
        if model_id == "univfd-clip":
            final_label, top_label, top_score, outputs = run_univfd(image)
        else:
            clf = get_classifier(model_repo)
            outputs = clf(image, top_k=5)
            if not outputs:
                return {"requestId": request_id, "ok": False, "error": f"Empty predictions from model {model_repo}"}
            top = outputs[0]
            top_label = str(top.get("label", ""))
            top_score = float(top.get("score", 0.0))
            final_label = map_label_to_decision(model_id, top_label)
    except Exception as exc:
        return {"requestId": request_id, "ok": False, "error": f"Exact model inference failed ({model_repo}): {exc}"}

    return {
        "requestId": request_id,
        "ok": True,
        "modelId": model_id,
        "modelRepo": model_repo,
        "label": final_label,
        "confidence": top_score,
        "topLabel": top_label,
        "predictions": outputs,
        "explanation": f"Exact model ({model_repo}) top prediction: '{top_label}' ({round(top_score * 100)}%).",
    }


def main() -> None:
    for line in sys.stdin:
        line = line.strip()
        if not line:
            continue

        try:
            req = json.loads(line)
        except Exception as exc:
            print(json.dumps({"ok": False, "error": f"Invalid JSON: {exc}"}), flush=True)
            continue

        res = handle_request(req)
        print(json.dumps(res), flush=True)


if __name__ == "__main__":
    main()
