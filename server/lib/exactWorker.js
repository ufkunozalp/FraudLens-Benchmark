const { spawn, execSync } = require('child_process');
const readline = require('readline');

const EXACT_DETECTOR_MODELS = {
  'univfd-clip': 'slxhere/UnivFD',
  'ateeqq-detector': 'Ateeqq/ai-vs-human-image-detector',
  'deepfake-v1-siglip': 'prithivMLmods/deepfake-detector-model-v1',
  'umm-maybe-detector': 'umm-maybe/AI-image-detector',
  'umm-maybe': 'umm-maybe/AI-image-detector',
  'dima806-detector': 'dima806/deepfake_vs_real_image_detection',
  'dima': 'dima806/deepfake_vs_real_image_detection',
};

const EXACT_UNAVAILABLE_DETECTORS = {
  'distil-dire': 'No public inference-ready DistilDIRE checkpoint/API is available for exact execution.',
  'gramnet-detector': 'No public inference-ready GramNet checkpoint/API is available for exact execution.',
  'npr-r50': 'No public inference-ready NPR-R50 checkpoint/API is available for exact execution.',
  'hive-det': 'Hive detector requires proprietary vendor access; exact public checkpoint is unavailable.'
};

let exactWorker = null;
let exactWorkerSeq = 0;
const exactPending = new Map();

let pythonUserSite = '';
let exactPythonExecutable = null;
let exactPythonProbeError = '';

try {
  pythonUserSite = execSync("python3 -c 'import site; print(site.getusersitepackages())'", { encoding: 'utf8' }).trim();
} catch (_error) {
  pythonUserSite = '';
}

function detectExactPython() {
  if (exactPythonExecutable || exactPythonProbeError) return;

  const candidates = [
    process.env.EXACT_PYTHON,
    'python3',
    '/opt/homebrew/bin/python3',
    '/usr/bin/python3',
  ].filter(Boolean);

  const uniqueCandidates = [...new Set(candidates)];
  const errors = [];

  for (const candidate of uniqueCandidates) {
    try {
      execSync(`${candidate} -c "import transformers, PIL; print('ok')"`, { stdio: 'pipe' });
      exactPythonExecutable = candidate;
      return;
    } catch (_error) {
      errors.push(`${candidate}: missing deps`);
    }
  }

  exactPythonProbeError = `No Python interpreter with required packages found. Tried: ${errors.join(', ')}. Install with: python3 -m pip install --user transformers torch pillow`;
}

function ensureExactWorker() {
  detectExactPython();
  if (!exactPythonExecutable) {
    throw new Error(exactPythonProbeError || 'Exact Python runtime is not available');
  }

  if (exactWorker && !exactWorker.killed) return exactWorker;

  const workerPath = `${__dirname}/../exact_detector_worker.py`;
  const pythonPath = [process.env.PYTHONPATH, pythonUserSite].filter(Boolean).join(':');

  exactWorker = spawn(exactPythonExecutable, [workerPath], {
    stdio: ['pipe', 'pipe', 'pipe'],
    env: {
      ...process.env,
      PYTHONPATH: pythonPath
    }
  });

  const stdoutRl = readline.createInterface({ input: exactWorker.stdout });
  stdoutRl.on('line', (line) => {
    let msg;
    try {
      msg = JSON.parse(line);
    } catch (_error) {
      console.error('Invalid JSON from exact worker:', line);
      return;
    }

    const requestId = msg.requestId;
    if (!requestId) return;

    const pending = exactPending.get(requestId);
    if (!pending) return;

    exactPending.delete(requestId);
    pending.resolve(msg);
  });

  const stderrRl = readline.createInterface({ input: exactWorker.stderr });
  stderrRl.on('line', (line) => {
    console.log(`[exact-worker] ${line}`);
  });

  exactWorker.stdin.on('error', (error) => {
    console.error(`Exact worker stdin error: ${error.message}`);
  });

  exactWorker.on('exit', (code, signal) => {
    console.error(`Exact worker exited (code=${code}, signal=${signal})`);
    for (const [, pending] of exactPending.entries()) {
      pending.reject(new Error('Exact detector worker exited unexpectedly'));
    }
    exactPending.clear();
    exactWorker = null;
  });

  return exactWorker;
}

function runExactWorkerInference(modelId, imageBase64, timeoutMs = 300000) {
  return new Promise((resolve, reject) => {
    let worker;
    try {
      worker = ensureExactWorker();
    } catch (error) {
      reject(error);
      return;
    }

    const requestId = `r_${Date.now()}_${++exactWorkerSeq}`;

    const timer = setTimeout(() => {
      exactPending.delete(requestId);
      reject(new Error(`Exact detector timed out after ${Math.round(timeoutMs / 1000)}s while loading/running model ${modelId}.`));
    }, timeoutMs);

    exactPending.set(requestId, {
      resolve: (payload) => {
        clearTimeout(timer);
        resolve(payload);
      },
      reject: (error) => {
        clearTimeout(timer);
        reject(error);
      }
    });

    if (!worker.stdin || worker.stdin.destroyed || !worker.stdin.writable) {
      exactPending.delete(requestId);
      clearTimeout(timer);
      reject(new Error('Exact detector worker is not available (stdin is closed).'));
      return;
    }

    worker.stdin.write(`${JSON.stringify({ requestId, modelId, imageBase64 })}\n`, (error) => {
      if (error) {
        exactPending.delete(requestId);
        clearTimeout(timer);
        reject(new Error(`Failed to send request to exact worker: ${error.message}`));
      }
    });
  });
}

module.exports = {
  EXACT_DETECTOR_MODELS,
  EXACT_UNAVAILABLE_DETECTORS,
  runExactWorkerInference
};
