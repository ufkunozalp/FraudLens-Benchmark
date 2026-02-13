#!/usr/bin/env bash
# FraudLens setup script
# - Supports macOS (Homebrew) and Debian/Ubuntu Linux (apt-get)
# - Installs system/toolchain dependencies
# - Installs local MongoDB server runtime for macOS/Linux
# - Creates env files from templates when missing
# - Validates required env variables before project dependency installation
# - Installs Node and Python dependencies

set -euo pipefail
IFS=$'\n\t'

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SERVER_DIR="${PROJECT_ROOT}/server"

FRONTEND_ENV_TEMPLATE="${PROJECT_ROOT}/.env.example"
FRONTEND_ENV_FILE="${PROJECT_ROOT}/.env"
FRONTEND_ENV_LOCAL_FILE="${PROJECT_ROOT}/.env.local"

SERVER_ENV_TEMPLATE="${SERVER_DIR}/.env.example"
SERVER_ENV_FILE="${SERVER_DIR}/.env"

NODE_MIN_MAJOR=20
NPM_MIN_MAJOR=10
PY_MIN_MAJOR=3
PY_MIN_MINOR=10
MONGODB_REPO_MAJOR=7.0

OS=""
DISTRO=""
SUDO=""
PYTHON_BIN="python3"

log() {
  printf '[INFO] %s\n' "$1"
}

warn() {
  printf '[WARN] %s\n' "$1"
}

error() {
  printf '[ERROR] %s\n' "$1" >&2
}

die() {
  error "$1"
  exit 1
}

command_exists() {
  command -v "$1" >/dev/null 2>&1
}

require_file() {
  local file="$1"
  [[ -f "$file" ]] || die "Required file not found: $file"
}

resolve_sudo() {
  if [[ "${EUID}" -eq 0 ]]; then
    SUDO=""
    return
  fi

  if command_exists sudo; then
    SUDO="sudo"
    return
  fi

  die "sudo is required for package installation. Re-run as root or install sudo."
}

detect_platform() {
  case "$(uname -s)" in
    Darwin)
      OS="macos"
      ;;
    Linux)
      OS="linux"
      [[ -f /etc/os-release ]] || die "Cannot detect Linux distribution (/etc/os-release missing)."
      # shellcheck disable=SC1091
      source /etc/os-release
      DISTRO="${ID:-unknown}"
      if [[ "${ID:-}" != "ubuntu" && "${ID:-}" != "debian" && "${ID_LIKE:-}" != *"debian"* ]]; then
        die "Unsupported Linux distribution (${ID:-unknown}). Supported: Debian/Ubuntu via apt-get."
      fi
      ;;
    *)
      die "Unsupported OS: $(uname -s). Supported: macOS, Debian/Ubuntu Linux."
      ;;
  esac

  log "Detected platform: ${OS}${DISTRO:+ (${DISTRO})}"
}

node_major() {
  node -p "process.versions.node.split('.')[0]" 2>/dev/null || echo "0"
}

npm_major() {
  npm -v 2>/dev/null | awk -F. '{print $1}' || echo "0"
}

python_version_ok_with() {
  local py_bin="$1"
  "${py_bin}" - <<PY
import sys
ok = sys.version_info >= (${PY_MIN_MAJOR}, ${PY_MIN_MINOR})
raise SystemExit(0 if ok else 1)
PY
}

select_python_bin() {
  local candidates=("python3" "python3.13" "python3.12" "python3.11" "python3.10")
  local candidate=""
  for candidate in "${candidates[@]}"; do
    if command_exists "${candidate}" && python_version_ok_with "${candidate}"; then
      PYTHON_BIN="${candidate}"
      return 0
    fi
  done
  return 1
}

node_version_ok() {
  [[ "$(node_major)" -ge "${NODE_MIN_MAJOR}" ]]
}

npm_version_ok() {
  [[ "$(npm_major)" -ge "${NPM_MIN_MAJOR}" ]]
}

ensure_brew() {
  if command_exists brew; then
    return
  fi

  log "Homebrew not found. Installing Homebrew..."
  /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

  if [[ -x /opt/homebrew/bin/brew ]]; then
    eval "$(/opt/homebrew/bin/brew shellenv)"
  elif [[ -x /usr/local/bin/brew ]]; then
    eval "$(/usr/local/bin/brew shellenv)"
  else
    die "Homebrew installation completed but brew binary was not found."
  fi
}

install_macos_dependencies() {
  ensure_brew

  local brew_prefix
  brew_prefix="$(brew --prefix)"
  export PATH="${brew_prefix}/bin:${PATH}"

  log "Updating Homebrew metadata..."
  brew update >/dev/null || warn "brew update failed; continuing with current metadata."

  command_exists git || brew install git
  command_exists python3 || brew install python

  if ! command_exists node || ! node_version_ok; then
    brew install node@20 || brew upgrade node@20 || true
    if [[ -d /opt/homebrew/opt/node@20/bin ]]; then
      export PATH="/opt/homebrew/opt/node@20/bin:${PATH}"
    elif [[ -d /usr/local/opt/node@20/bin ]]; then
      export PATH="/usr/local/opt/node@20/bin:${PATH}"
    fi
    brew link --overwrite --force node@20 >/dev/null 2>&1 || true
  fi
}

install_macos_mongodb() {
  if command_exists mongod; then
    log "Local MongoDB server already installed (mongod found)."
    return
  fi

  log "Installing local MongoDB server with Homebrew..."
  brew tap mongodb/brew >/dev/null 2>&1 || true
  if brew list --versions mongodb-community >/dev/null 2>&1 || brew list --versions mongodb-community@8.0 >/dev/null 2>&1; then
    return
  fi

  brew install mongodb-community || brew install mongodb-community@8.0
}

install_linux_dependencies() {
  resolve_sudo

  ${SUDO} apt-get update -y
  ${SUDO} apt-get install -y \
    ca-certificates \
    curl \
    gnupg \
    lsb-release \
    software-properties-common \
    build-essential \
    git \
    python3 \
    python3-pip

  if ! command_exists node || ! node_version_ok; then
    log "Installing Node.js 20.x from NodeSource..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | ${SUDO} -E bash -
    ${SUDO} apt-get install -y nodejs
  fi
}

get_linux_mongodb_repo_line() {
  local distro_id="${ID:-${DISTRO}}"
  local distro_like="${ID_LIKE:-}"
  local keyring_path="/usr/share/keyrings/mongodb-server-${MONGODB_REPO_MAJOR}.gpg"

  if [[ "${distro_id}" == "ubuntu" || "${distro_like}" == *"ubuntu"* ]]; then
    local codename="${VERSION_CODENAME:-${UBUNTU_CODENAME:-}}"
    if [[ -z "${codename}" ]] && command_exists lsb_release; then
      codename="$(lsb_release -cs)"
    fi
    [[ -n "${codename}" ]] || die "Could not determine Ubuntu codename for MongoDB repository setup."
    printf 'deb [ signed-by=%s ] https://repo.mongodb.org/apt/ubuntu %s/mongodb-org/%s multiverse\n' "${keyring_path}" "${codename}" "${MONGODB_REPO_MAJOR}"
    return 0
  fi

  if [[ "${distro_id}" != "debian" && "${distro_like}" != *"debian"* ]]; then
    warn "Automatic MongoDB install supports Debian/Ubuntu derivatives only. Install MongoDB manually for local mode."
    return 1
  fi

  local debian_major="${VERSION_ID%%.*}"
  local debian_codename=""
  case "${debian_major}" in
    12)
      debian_codename="bookworm"
      ;;
    11)
      debian_codename="bullseye"
      ;;
    *)
      warn "Automatic MongoDB install supports Debian 11/12. Current Debian version: ${VERSION_ID:-unknown}. Install MongoDB manually for local mode."
      return 1
      ;;
  esac

  printf 'deb [ signed-by=%s ] https://repo.mongodb.org/apt/debian %s/mongodb-org/%s main\n' "${keyring_path}" "${debian_codename}" "${MONGODB_REPO_MAJOR}"
}

install_linux_mongodb() {
  if command_exists mongod; then
    log "Local MongoDB server already installed (mongod found)."
    return
  fi

  resolve_sudo

  local repo_line
  repo_line="$(get_linux_mongodb_repo_line)" || return 0

  local keyring_path="/usr/share/keyrings/mongodb-server-${MONGODB_REPO_MAJOR}.gpg"
  local repo_file="/etc/apt/sources.list.d/mongodb-org-${MONGODB_REPO_MAJOR}.list"

  if [[ ! -f "${keyring_path}" ]]; then
    log "Adding MongoDB apt signing key..."
    curl -fsSL "https://pgp.mongodb.com/server-${MONGODB_REPO_MAJOR}.asc" | ${SUDO} gpg --dearmor -o "${keyring_path}"
  fi

  if [[ ! -f "${repo_file}" ]] || ! grep -qF "${repo_line}" "${repo_file}"; then
    log "Adding MongoDB apt repository..."
    printf '%s\n' "${repo_line}" | ${SUDO} tee "${repo_file}" >/dev/null
  fi

  log "Installing local MongoDB server (mongodb-org)..."
  ${SUDO} apt-get update -y
  ${SUDO} apt-get install -y mongodb-org
}

install_local_mongodb_server() {
  if [[ "${OS}" == "macos" ]]; then
    install_macos_mongodb
  else
    install_linux_mongodb
  fi

  if command_exists mongod; then
    log "Local MongoDB runtime is available: $(mongod --version | awk 'NR==1 {print $0}')"
  else
    warn "Local MongoDB runtime is not installed. Atlas mode still works; install MongoDB manually for local storage mode."
  fi
}

verify_required_tools() {
  command_exists git || die "git is not installed."
  command_exists node || die "node is not installed."
  command_exists npm || die "npm is not installed."
  command_exists python3 || die "python3 is not installed."

  select_python_bin || die "Python >= ${PY_MIN_MAJOR}.${PY_MIN_MINOR} is required."

  node_version_ok || die "Node.js >= ${NODE_MIN_MAJOR} is required. Current: $(node -v)"
  npm_version_ok || die "npm >= ${NPM_MIN_MAJOR} is required. Current: $(npm -v)"
  python_version_ok_with "${PYTHON_BIN}" || die "Python >= ${PY_MIN_MAJOR}.${PY_MIN_MINOR} is required. Current: $(${PYTHON_BIN} --version 2>&1)"

  log "Tool versions"
  printf '  - git: %s\n' "$(git --version)"
  printf '  - node: %s\n' "$(node -v)"
  printf '  - npm: %s\n' "$(npm -v)"
  printf '  - python: %s\n' "$(${PYTHON_BIN} --version 2>&1)"
}

create_env_files_if_missing() {
  require_file "${FRONTEND_ENV_TEMPLATE}"
  require_file "${SERVER_ENV_TEMPLATE}"

  if [[ ! -f "${FRONTEND_ENV_FILE}" ]]; then
    cp "${FRONTEND_ENV_TEMPLATE}" "${FRONTEND_ENV_FILE}"
    log "Environment file created with placeholders. Please paste the real values provided privately."
  fi

  if [[ ! -f "${SERVER_ENV_FILE}" ]]; then
    cp "${SERVER_ENV_TEMPLATE}" "${SERVER_ENV_FILE}"
    log "Backend environment file created with placeholders. Please paste the real values provided privately."
  fi
}

get_env_value() {
  local file="$1"
  local key="$2"
  [[ -f "$file" ]] || return 0
  awk -F= -v k="$key" '
    $0 ~ /^[[:space:]]*#/ { next }
    $1 == k {
      sub(/^[[:space:]]+/, "", $2)
      print substr($0, index($0, "=") + 1)
    }
  ' "$file" | tail -n 1
}

trim_whitespace() {
  local value="$1"
  value="${value#${value%%[![:space:]]*}}"
  value="${value%${value##*[![:space:]]}}"
  printf '%s' "$value"
}

is_placeholder_value() {
  local value
  value="$(trim_whitespace "$1")"

  [[ -z "$value" ]] && return 0

  case "$value" in
    your_google_genai_api_key_here|your_*|YOUR_*|changeme|change_me|replace_me|REPLACE_ME|placeholder|todo|TODO)
      return 0
      ;;
  esac

  [[ "$value" == *"<"* ]] && return 0
  [[ "$value" == *">"* ]] && return 0
  [[ "$value" == *"username:password"* ]] && return 0
  [[ "$value" == *"cluster.example"* ]] && return 0
  [[ "$value" == *"example.mongodb.net"* ]] && return 0
  [[ "$value" == hf_your_* ]] && return 0

  return 1
}

validate_required_env() {
  local missing=()

  # Frontend key resolution matches Vite precedence: .env.local overrides .env
  local gemini_api_key=""
  gemini_api_key="$(get_env_value "${FRONTEND_ENV_LOCAL_FILE}" "GEMINI_API_KEY")"
  if is_placeholder_value "$gemini_api_key"; then
    gemini_api_key="$(get_env_value "${FRONTEND_ENV_FILE}" "GEMINI_API_KEY")"
  fi

  local mongodb_uri
  mongodb_uri="$(get_env_value "${SERVER_ENV_FILE}" "MONGODB_URI")"

  if is_placeholder_value "$gemini_api_key"; then
    missing+=("GEMINI_API_KEY")
  fi

  if is_placeholder_value "$mongodb_uri"; then
    missing+=("MONGODB_URI")
  fi

  if (( ${#missing[@]} > 0 )); then
    printf '%s\n' "${missing[@]}"
    die "Missing required environment values. Provide real values in .env/.env.local and server/.env, then re-run setup."
  fi
}

install_npm_dependencies() {
  local target_dir="$1"
  require_file "${target_dir}/package.json"

  if (cd "$target_dir" && npm ls --depth=0 >/dev/null 2>&1); then
    log "Node.js dependencies already satisfied in ${target_dir}."
    return
  fi

  if [[ -f "${target_dir}/package-lock.json" ]]; then
    (cd "$target_dir" && npm ci)
  else
    (cd "$target_dir" && npm install)
  fi
}

install_python_dependencies() {
  if "${PYTHON_BIN}" - <<'PY'
import importlib.util
import sys
required = ["transformers", "torch", "PIL", "huggingface_hub"]
missing = [m for m in required if importlib.util.find_spec(m) is None]
if missing:
    print(",".join(missing))
    sys.exit(1)
sys.exit(0)
PY
  then
    log "Python worker dependencies already satisfied."
    return
  fi

  log "Installing Python worker dependencies..."

  if ! "${PYTHON_BIN}" -m pip install --user --upgrade pip; then
    "${PYTHON_BIN}" -m pip install --user --break-system-packages --upgrade pip
  fi

  if ! "${PYTHON_BIN}" -m pip install --user --upgrade transformers torch pillow huggingface_hub; then
    "${PYTHON_BIN}" -m pip install --user --break-system-packages --upgrade transformers torch pillow huggingface_hub
  fi
}

ensure_exact_python_env() {
  local exact_python
  exact_python="$(get_env_value "${SERVER_ENV_FILE}" "EXACT_PYTHON")"
  if [[ -z "$(trim_whitespace "$exact_python")" ]]; then
    local python_path
    python_path="$(command -v "${PYTHON_BIN}")"
    printf '\nEXACT_PYTHON=%s\n' "$python_path" >> "${SERVER_ENV_FILE}"
    log "Set EXACT_PYTHON in server/.env to ${python_path}"
  fi
}

print_next_steps() {
  cat <<'NEXTEOF'
[INFO] Setup completed successfully.

Next steps:
  1) Start development:
     npm run dev

  2) Start backend only (production-style API process):
     node server/index.js

  3) Optional local MongoDB start (only needed for LOCAL_MONGODB_URI users):
     macOS: brew services start mongodb-community || brew services start mongodb-community@8.0
     Linux: sudo systemctl start mongod
NEXTEOF
}

main() {
  log "Starting FraudLens setup..."

  require_file "${PROJECT_ROOT}/package.json"
  require_file "${SERVER_DIR}/package.json"

  detect_platform

  if [[ "${OS}" == "macos" ]]; then
    install_macos_dependencies
  else
    install_linux_dependencies
  fi

  install_local_mongodb_server
  verify_required_tools

  create_env_files_if_missing
  validate_required_env

  log "Installing Node.js dependencies..."
  install_npm_dependencies "${PROJECT_ROOT}"
  install_npm_dependencies "${SERVER_DIR}"

  select_python_bin
  install_python_dependencies
  ensure_exact_python_env

  print_next_steps
}

main "$@"
