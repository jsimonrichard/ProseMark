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

    # npm pack (not `bun pm pack`) — Bun fails to resolve private workspace
    # devDependencies such as @prosemark/eslint-config when creating tarballs.
    npm pack --pack-destination "${TMPDIR}"
    if [[ ! -f "${PKG_PATH}" ]]; then
        echo "Expected pack output at ${PKG_PATH} but file was not created."
        exit 1
    fi
    npm publish "${PKG_PATH}"
fi