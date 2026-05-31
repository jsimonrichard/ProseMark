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

    # `bun pm pack` resolves workspace:* in dependencies but also tries to
    # resolve devDependencies (which npm install ignores for consumers anyway).
    jq 'del(.devDependencies)' package.json >package.json.tmp
    mv package.json.tmp package.json

    bun pm pack --filename "${PKG_PATH}"
    npm publish "${PKG_PATH}"
fi
