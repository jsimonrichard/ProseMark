#!/bin/bash

NAME=$(jq -r .name package.json)
VERSION=$(jq -r .version package.json)

set -e

if npm view "${NAME}" versions --json | grep -q "\"${VERSION}\""; then
    echo "Package ${NAME}@${VERSION} already published, skipping."
else
    echo "Publishing ${NAME}@${VERSION}..."

    # convert @scope/name → scope-name
    SAFE_NAME=${NAME//@/}
    SAFE_NAME=${SAFE_NAME//\//-}

    TMPDIR=${TMPDIR:-/tmp}
    PKG_FILE="${SAFE_NAME}-${VERSION}.tgz"
    PKG_PATH="${TMPDIR}/${PKG_FILE}"

    # `bun pm pack` resolves workspace:* in dependencies (required for publish)
    # but also tries to resolve devDependencies. Private workspace-only packages
    # such as @prosemark/eslint-config cannot be resolved for packing; Bun has
    # no --omit=dev flag for pack, so we strip workspace devDeps temporarily.
    restore_package_json() {
        if [[ -n "${PACKAGE_JSON_BACKUP:-}" && -f "${PACKAGE_JSON_BACKUP}" ]]; then
            mv "${PACKAGE_JSON_BACKUP}" package.json
        fi
    }
    PACKAGE_JSON_BACKUP=$(mktemp)
    cp package.json "${PACKAGE_JSON_BACKUP}"
    trap restore_package_json EXIT

    jq '
      if .devDependencies then
        .devDependencies |= with_entries(select(.value | test("^workspace:") | not))
        | if .devDependencies == {} then del(.devDependencies) else . end
      else .
      end
    ' "${PACKAGE_JSON_BACKUP}" >package.json

    bun pm pack --filename "${PKG_PATH}"
    npm publish "${PKG_PATH}"
fi
