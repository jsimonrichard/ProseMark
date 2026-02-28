#!/bin/bash

set -euo pipefail

NAME=$(jq -r '.name' package.json)
PUBLISHER=$(jq -r '.publisher' package.json)
VERSION=$(jq -r '.version' package.json)
DRY_RUN=${DRY_RUN:-false}

if [[ -z "${NAME}" || "${NAME}" == "null" ]]; then
  echo "Unable to publish extension: missing package.json name."
  exit 1
fi

if [[ -z "${PUBLISHER}" || "${PUBLISHER}" == "null" ]]; then
  echo "Unable to publish extension: missing package.json publisher."
  exit 1
fi

if [[ -z "${VERSION}" || "${VERSION}" == "null" ]]; then
  echo "Unable to publish extension: missing package.json version."
  exit 1
fi

is_truthy_flag() {
  case "${1,,}" in
  1 | true | yes | on)
    return 0
    ;;
  *)
    return 1
    ;;
  esac
}

EXTENSION_ID="${PUBLISHER}.${NAME}"
SAFE_NAME=${EXTENSION_ID//\//-}
VSIX_PATH=$(mktemp "/tmp/${SAFE_NAME}-${VERSION}-XXXXXX.vsix")

cleanup() {
  rm -f "${VSIX_PATH}"
}
trap cleanup EXIT

has_marketplace_release=false
# Probe existing versions first so reruns are idempotent; if lookups fail we
# still continue and let publish commands surface actionable errors.
if marketplace_metadata=$(bunx @vscode/vsce show "${EXTENSION_ID}" --json 2>/dev/null); then
  if jq -e --arg version "${VERSION}" '(.versions // []) | any(.version == $version)' >/dev/null <<<"${marketplace_metadata}"; then
    has_marketplace_release=true
  fi
fi

has_openvsx_release=false
if openvsx_metadata=$(curl -fsSL "https://open-vsx.org/api/${PUBLISHER}/${NAME}" 2>/dev/null); then
  if jq -e --arg version "${VERSION}" '.allVersions[$version] != null' >/dev/null <<<"${openvsx_metadata}"; then
    has_openvsx_release=true
  fi
fi

if ${has_marketplace_release} && ${has_openvsx_release}; then
  echo "Extension ${EXTENSION_ID}@${VERSION} already published to both registries, skipping."
  exit 0
fi

echo "Packaging ${EXTENSION_ID}@${VERSION}..."
# This repo uses workspaces, so dependency scanning can misread local workspace
# deps; --no-dependencies keeps packaging deterministic in CI.
bunx @vscode/vsce package --no-dependencies --out "${VSIX_PATH}"

# Dry-run still packages the VSIX so local checks catch build/prepublish issues.
if is_truthy_flag "${DRY_RUN}"; then
  if ! ${has_marketplace_release}; then
    echo "DRY RUN: would publish ${EXTENSION_ID}@${VERSION} to VS Code Marketplace."
  else
    echo "DRY RUN: VS Code Marketplace already contains ${EXTENSION_ID}@${VERSION}, would skip."
  fi

  if ! ${has_openvsx_release}; then
    echo "DRY RUN: would publish ${EXTENSION_ID}@${VERSION} to Open VSX."
  else
    echo "DRY RUN: Open VSX already contains ${EXTENSION_ID}@${VERSION}, would skip."
  fi

  exit 0
fi

if ! ${has_marketplace_release}; then
  if [[ -z "${VSCE_PAT:-}" ]]; then
    echo "VSCE_PAT secret is not set, but ${EXTENSION_ID}@${VERSION} is missing from VS Code Marketplace."
    exit 1
  fi

  echo "Publishing ${EXTENSION_ID}@${VERSION} to VS Code Marketplace..."
  set +e
  # Capture output so "already exists" can be treated as a safe no-op.
  marketplace_publish_output=$(bunx @vscode/vsce publish --no-dependencies --packagePath "${VSIX_PATH}" --pat "${VSCE_PAT}" 2>&1)
  marketplace_status=$?
  set -e
  if [[ ${marketplace_status} -ne 0 ]]; then
    if rg -qi "already exists" <<<"${marketplace_publish_output}"; then
      echo "VS Code Marketplace already contains ${EXTENSION_ID}@${VERSION}, skipping."
    else
      echo "${marketplace_publish_output}"
      exit "${marketplace_status}"
    fi
  fi
else
  echo "VS Code Marketplace already contains ${EXTENSION_ID}@${VERSION}, skipping."
fi

if ! ${has_openvsx_release}; then
  if [[ -z "${OVSX_PAT:-}" ]]; then
    echo "OVSX_PAT secret is not set, but ${EXTENSION_ID}@${VERSION} is missing from Open VSX."
    exit 1
  fi

  echo "Publishing ${EXTENSION_ID}@${VERSION} to Open VSX..."
  set +e
  # Capture output so "already exists" can be treated as a safe no-op.
  openvsx_publish_output=$(bunx ovsx publish "${VSIX_PATH}" --pat "${OVSX_PAT}" 2>&1)
  openvsx_status=$?
  set -e
  if [[ ${openvsx_status} -ne 0 ]]; then
    if rg -qi "already exists" <<<"${openvsx_publish_output}"; then
      echo "Open VSX already contains ${EXTENSION_ID}@${VERSION}, skipping."
    else
      echo "${openvsx_publish_output}"
      exit "${openvsx_status}"
    fi
  fi
else
  echo "Open VSX already contains ${EXTENSION_ID}@${VERSION}, skipping."
fi
