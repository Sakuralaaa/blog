#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
VERSION="$(node -p "require('${ROOT_DIR}/package.json').version")"

if [[ -z "${VERSION}" ]]; then
  echo "未能读取应用版本号" >&2
  exit 1
fi

IMAGE="${IMAGE:-ghcr.io/sakuralaaa/blog}"
TAG_VERSION="${VERSION}"
if [[ "${TAG_VERSION}" != v* ]]; then
  TAG_VERSION="v${TAG_VERSION}"
fi

echo "使用版本: ${TAG_VERSION}"
# 可选：TAG_SUFFIX（如 -arm64）、CACHE_SCOPE（启用 buildx 的 GitHub Actions 缓存）
TAG_SUFFIX="${TAG_SUFFIX:-}"
BUILD_ARGS=(--build-arg APP_VERSION="${VERSION}" -t "${IMAGE}:${TAG_VERSION}${TAG_SUFFIX}")
if [[ -z "${TAG_SUFFIX}" ]]; then
  BUILD_ARGS+=(-t "${IMAGE}:latest")
fi

if [[ -n "${CACHE_SCOPE:-}" ]]; then
  docker buildx build --load \
    --cache-from "type=gha,scope=${CACHE_SCOPE}" \
    --cache-to "type=gha,mode=max,scope=${CACHE_SCOPE}" \
    "${BUILD_ARGS[@]}" "${ROOT_DIR}"
else
  docker build "${BUILD_ARGS[@]}" "${ROOT_DIR}"
fi
