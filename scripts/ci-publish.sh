#!/bin/bash

NAME=$(jq -r .name package.json)
VERSION=$(jq -r .version package.json)

set -e

if npm view "${NAME}" versions --json | grep -q "\"${VERSION}\""; then
    echo "Version ${VERSION} already published, skipping."
else
    bun pn pack --filename prosemark-package.tgz
    npm publish prosemark-package.tgz
fi