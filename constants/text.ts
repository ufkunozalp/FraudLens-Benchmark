
export const TEXT = {
  APP: {
    NAME: "FraudLens Benchmark",
    SUBTITLE: "Allianz × TUM",
    DESC: "A comprehensive workbench for generating synthetic insurance claims, editing images with inpainting, and benchmarking fraud detection models."
  },
  NAV: {
    DASHBOARD: "Dashboard",
    WORKFLOWS: "Workflows",
    GENERATE: "Generate",
    EDIT: "Edit & Inpaint",
    DETECT: "Detect & Analyze",
    ANALYTICS: "Analytics",
    BENCHMARKS: "Benchmarks",
    REGISTRY: "Model Registry",
    THEME_LIGHT: "Light Mode",
    THEME_DARK: "Dark Mode",
    USER_NAME: "John Doe",
    USER_ROLE: "Lead Analyst"
  },
  COMMON: {
    UPLOAD: "Upload",
    CANCEL: "Cancel",
    CLEAR: "Clear",
    DELETE: "Delete",
    ADD: "Add",
    SAVE: "Save",
    DOWNLOAD: "Download",
    PROCESSING: "Processing...",
    LOADING: "Loading...",
    ERROR: "Error",
    SUCCESS: "Success",
    CONFIRM: "Confirm",
    BACK: "Back",
    NEXT: "Next",
    START_OVER: "Start Over",
    SELECT_ALL: "Select All",
    DESELECT_ALL: "Deselect All",
    CHOOSE_FILE: "Choose File",
    PICK_GALLERY: "Pick from Gallery",
    UPLOAD_TITLE: "Upload Images",
    UPLOAD_DESC: "JPG, PNG up to 10MB",
    NO_DATA: "No Data"
  },
  DASHBOARD: {
    TITLE: "Dashboard",
    SUBTITLE: "Real-time overview of generation and detection benchmarks.",
    STATS: {
      TOTAL_SCANS: "Total Scans",
      ACCURACY: "Accuracy (Verified)",
      FLAGGED_FAKES: "Flagged Fakes",
      VERIFIED_REAL: "Verified Real",
      GENERATED_SUB: "generated internally",
      PENDING_SUB: "pending verification",
      DETECTED_SUB: "Detected manipulations",
      PASSED_SUB: "Passed validation"
    },
    RECENT_RUNS: "Recent Runs",
    TREND_TITLE: "Model Performance Snapshot",
    TREND_SUB: "Verified Outcomes by Model (Top 5)",
    NO_DATA: "No detection data available yet.",
    NO_RUNS: "No runs recorded.",
    INFO: {
      DESCRIPTION: "The Dashboard provides a real-time command center for your fraud benchmarking activities. Monitor the volume of generated synthetic claims, track the detection accuracy of various models, and identify trends in visual manipulation detection. Use the stats to gauge the health of your defensive systems.",
      MODELS: []
    }
  },
  GENERATE: {
    TITLE: "Generator",
    SUBTITLE: "Generated fakes are for defensive benchmarking only.",
    INFO: {
      DESCRIPTION: "The Generator is the core engine for creating synthetic insurance claims. It uses state-of-the-art text-to-image models to produce high-fidelity visuals of accidents, documents, and scenes. These assets are crucial for training and stress-testing fraud detection algorithms against novel generative AI threats.",
      MODELS: [
        { name: "Imagen 4.0", type: "Google Cloud", description: "High-fidelity photorealistic generation with excellent prompt adherence. Best for creating convincing accident scenes." },
        { name: "Gemini 2.5 Flash", type: "Google Cloud", description: "Optimized for speed and efficiency. Great for batch generating large datasets of simple claims evidence." },
        { name: "Flux.1", type: "Pollinations.ai", description: "Open-weights model known for artistic control and high detail. Good for varying the visual style of synthetic data." },
        { name: "SDXL Turbo", type: "Pollinations.ai", description: "Extremely fast generation for rapid prototyping of scenarios." },
        { name: "Gemini CCTV", type: "Specialized Variant", description: "Custom prompt-engineered variant designed to simulate low-quality, grainy security footage." },
        { name: "Gemini Document", type: "Specialized Variant", description: "Optimized for generating synthetic receipts, invoices, and scanned paperwork." }
      ]
    },
    PROMPT_LABEL: "Prompt",
    NEG_PROMPT_LABEL: "Negative Prompt",
    MODEL_LABEL: "Model Strategy",
    COUNT_LABEL: "Image Count",
    ACTION: "Generate Images",
    GALLERY_TITLE: "Output Gallery",
    EMPTY_TITLE: "Ready to Generate",
    EMPTY_DESC: "Enter a prompt and parameters to start generating synthetic claims.",
    DISCLAIMER: "Generated fakes are for defensive benchmarking only."
  },
  EDIT: {
    TITLE: "Inpainting & Modification",
    STEPS: {
      UPLOAD: "1. Upload",
      MASK: "2. Mask & Prompt",
      RESULT: "3. Result"
    },
    CONFIG_TITLE: "Configuration",
    MODEL_LABEL: "Modifier Model",
    INSTRUCT_LABEL: "Instructions",
    INSTRUCT_PLACEHOLDER: "e.g. Add a deep scratch on the door panel...",
    MASK_INSTRUCT: "Describe how to modify the masked (white) area.",
    FULL_INSTRUCT: "Describe how to modify the entire image.",
    ACTION: "Run Modifier",
    ORIGINAL: "Original",
    RESULT: "Modified Result",
    ADJUST_MASK: "Adjust Mask",
    CANCEL_UPLOAD: "Cancel & Upload New",
    INFO: {
      DESCRIPTION: "The Inpainting & Modification tool allows for precise, localized editing of images. Use this to insert specific fraud indicators—like scratches, dents, or broken glass—into real or generated images. This targeted manipulation tests a detector's ability to spot anomalies within otherwise authentic content.",
      MODELS: [
        { name: "Google Inpainting", type: "Cloud API", description: "Advanced inpainting that blends new content seamlessly with the existing lighting and texture." },
        { name: "CV Inpainting (CPU)", type: "Local Algorithm", description: "Classical computer vision technique (Iterative Diffusion) running entirely in your browser. Good for simple removal or blurring without AI hallmarks." }
      ]
    }
  },
  DETECT: {
    TITLE: "Fraud Detection",
    SUBTITLE: "Run multi-path analysis: exact backend detectors, local models, forensic tools, and cloud APIs.",
    INFO: {
      DESCRIPTION: "The Detection suite routes each selected model through its native execution path: (1) backend exact detectors via /api/detect-exact and a Python worker, (2) local browser models via Transformers.js, (3) local forensic algorithms (ELA/Histogram), (4) external vendor APIs, and (5) Gemini cloud analysis. Running multiple detectors on the same image lets you triangulate manipulation evidence and compare detector behavior under identical inputs.",
      MODELS: [
        { name: "Hybrid Detector", type: "Backend Exact Ensemble", description: "Runs exact Ateeqq + Umm_Maybe + UnivFD via backend worker and applies thresholded majority vote (2 of 3 => FAKE)." },
        { name: "Exact Detectors (UnivFD, Ateeqq, Deepfake-v1, Umm-Maybe, Dima806)", type: "Backend API + Python Worker", description: "Frontend calls /api/detect-exact. Node forwards requests to a persistent Python worker using Hugging Face pipelines/torch for model-faithful inference." },
        { name: "CLIP Zero-Shot", type: "Local AI (Transformers.js)", description: "Browser-side semantic classification comparing real vs synthetic label sets without sending image bytes to external vendors." },
        { name: "ViT-Base / ResNet-50", type: "Local AI (Transformers.js)", description: "General-purpose local baselines used for consistency checks and comparative behavior against specialized detectors." },
        { name: "DeFake / DETR / Depth", type: "Local AI (Transformers.js)", description: "Specialized local tasks: deepfake classification, object coherence checks, and depth-structure consistency analysis." },
        { name: "ELA + Histogram", type: "Local Forensic Algorithms", description: "Pure in-browser pixel/statistical analysis. ELA highlights compression inconsistencies; histogram analysis flags clipping/contrast anomalies." },
        { name: "Gemini (lite/flash/pro)", type: "Cloud API (Google GenAI)", description: "Prompted multimodal fraud analysis path used when selected directly or as fallback when no other detector path matches." },
        { name: "External APIs (Sightengine, Reality Defender, AI-or-Not)", type: "External Vendor APIs", description: "Direct provider-specific HTTPS calls for third-party validation signals." },
        { name: "Unavailable Exact IDs (DistilDIRE, GramNet, NPR-R50, Hive)", type: "Guardrail Path", description: "These IDs return an explicit unavailable message and UNKNOWN result because no public exact checkpoint/API is currently wired." }
      ]
    },
    HISTORY_TITLE: "Recent Analysis",
    ACTIVE_DETECTORS: "Active Detectors",
    ACTION_RUN: "Run Analysis",
    EMPTY_TITLE: "No Analysis Results",
    EMPTY_DESC: "Upload images and run a detection model to view detailed forensic reports.",
    SELECT_IMAGES: "Select Images",
    ADD_SELECTED: "Add Selected",
    CLEAR_ALL: "Clear All",
    VERIFICATION: "Verification",
    EXPLANATION: "Forensic Explanation",
    HEATMAP: "Live Error Level Analysis (ELA) Heatmap",
    IS_CORRECT: "Is this correct?",
    YES: "Yes",
    NO: "No",
    MARKED_AS: "Marked as"
  },
  COMPARE: {
    TITLE: "Model Benchmarking",
    SUBTITLE: "Compare detector performance based on your real usage history.",
    CHART_ACCURACY: "Accuracy (Verified) vs Latency",
    CHART_RADAR: "Holistic Performance",
    TABLE_TITLE: "Detailed Metrics Table",
    NO_DATA_RADAR: "Run detection with at least 2 different models to see comparative radar chart.",
    COLUMNS: {
      MODEL: "Model",
      RUNS: "Total Runs",
      VERIFIED: "Verified",
      ACCURACY: "Accuracy",
      FPR: "False Positive Rate",
      LATENCY: "Avg Latency"
    },
    INFO: {
      DESCRIPTION: "The Benchmarking view provides a comparative analysis of your detectors. It aggregates data from all your sessions to visualize accuracy, false positive rates, and latency. \n\n**Metrics Definitions:**\n- **Accuracy**: The percentage of predictions that matched the ground truth (TP + TN / Total).\n- **Precision**: How many selected items are relevant? (TP / TP + FP). High precision means fewer false alarms.\n- **Recall**: How many relevant items are selected? (TP / TP + FN). High recall means fewer missed fakes.\n- **F1 Score**: The harmonic mean of Precision and Recall. Best for balanced evaluation.\n- **FPR (False Positive Rate)**: The percentage of authentic images incorrectly flagged as fake (FP / FP + TN). Lower is better.",
      MODELS: []
    }
  },
  REGISTRY: {
    TITLE: "Model Registry",
    SUBTITLE: "Manage and view available AI models and algorithms.",
    INFO: {
      DESCRIPTION: "The Model Registry is the catalog of all available tools in the platform. It tracks versions, providers (Local vs. Cloud), and categories of every model. Use this to verify which engines are currently active and available for benchmarking.",
      MODELS: []
    },
    REGISTER: "Register Model",
    COLUMNS: {
      NAME: "Name",
      CATEGORY: "Category",
      PROVIDER: "Provider",
      VERSION: "Version",
      ACTIONS: "Actions"
    }
  }
};
