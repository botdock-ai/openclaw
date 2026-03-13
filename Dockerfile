ARG BASE_IMAGE=ghcr.io/botdock-ai/openclaw-base:latest

FROM ${BASE_IMAGE}

# Install additional system packages at build time (optional).
# Example: docker build --build-arg OPENCLAW_DOCKER_APT_PACKAGES="ffmpeg python3" .
ARG OPENCLAW_DOCKER_APT_PACKAGES=""
RUN if [ -n "$OPENCLAW_DOCKER_APT_PACKAGES" ]; then \
      apt-get update \
      && DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends \
        $OPENCLAW_DOCKER_APT_PACKAGES \
      && rm -rf /var/lib/apt/lists/*; \
    fi

COPY --chown=openclaw:openclaw scripts/ /app/scripts/
RUN chmod +x /app/scripts/*.sh

# Pre-create /data directory structure with correct ownership.
# Docker named volumes inherit this ownership on first mount.
RUN mkdir -p /data/npm-global/bin /data/uv/tools/bin /data/uv/cache /data/go/bin \
    /data/.openclaw/agents/main/sessions /data/.openclaw/credentials /data/workspace \
  && chown -R openclaw:openclaw /data

ENV NPM_CONFIG_PREFIX="/data/npm-global" \
    UV_TOOL_DIR="/data/uv/tools" \
    UV_CACHE_DIR="/data/uv/cache" \
    GOPATH="/data/go" \
    PATH="/data/npm-global/bin:/data/uv/tools/bin:/data/go/bin:${PATH}"

ENV NODE_ENV=production \
    HOME="/data"

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:8080/healthz').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

# Security: run as non-root user (uid 1000)
USER openclaw

ENTRYPOINT ["/app/scripts/entrypoint.sh"]
