#!/bin/sh -ex

export PATH=$PATH:$(npm bin)

node ./.github/workflows/test-build.js
ts-node ./.github/workflows/test-build.ts