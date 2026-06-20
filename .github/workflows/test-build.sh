#!/bin/sh -ex

node ./.github/workflows/test-build.js
npx tsx ./.github/workflows/test-build.ts
