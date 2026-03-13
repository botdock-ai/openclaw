#!/usr/bin/env bash
# Build openclaw Docker images locally.
#
# Usage:
#   ./scripts/build.sh                  # build both base + final
#   ./scripts/build.sh base             # build base only
#   ./scripts/build.sh final            # build final only (requires base)
#   OPENCLAW_GIT_REF=v2026.1.29 ./scripts/build.sh  # pin to a specific version
#   OPENCLAW_DOCKER_APT_PACKAGES="ffmpeg" ./scripts/build.sh  # extra packages

set -euo pipefail

OPENCLAW_GIT_REF="${OPENCLAW_GIT_REF:-main}"
OPENCLAW_DOCKER_APT_PACKAGES="${OPENCLAW_DOCKER_APT_PACKAGES:-}"
BASE_TAG="openclaw-base:local"
FINAL_TAG="openclaw:local"
TARGET="${1:-all}"

build_base() {
  echo "==> Building base image (ref: ${OPENCLAW_GIT_REF})..."
  docker build \
    -f Dockerfile.base \
    --build-arg "OPENCLAW_GIT_REF=${OPENCLAW_GIT_REF}" \
    -t "${BASE_TAG}" \
    .
  echo "==> Base image built: ${BASE_TAG}"
}

build_final() {
  echo "==> Building final image..."
  docker build \
    -f Dockerfile \
    --build-arg "BASE_IMAGE=${BASE_TAG}" \
    --build-arg "OPENCLAW_DOCKER_APT_PACKAGES=${OPENCLAW_DOCKER_APT_PACKAGES}" \
    -t "${FINAL_TAG}" \
    .
  echo "==> Final image built: ${FINAL_TAG}"
}

case "${TARGET}" in
  base)
    build_base
    ;;
  final)
    build_final
    ;;
  all)
    build_base
    build_final
    ;;
  *)
    echo "Usage: $0 [base|final|all]"
    exit 1
    ;;
esac

echo ""
echo "Done. Run with:"
echo "  docker run -e OPENCLAW_GATEWAY_TOKEN=\$(openssl rand -hex 32) -e ANTHROPIC_API_KEY=sk-... -p 8080:8080 ${FINAL_TAG}"
