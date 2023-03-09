#!/bin/sh -ex

node ./.github/workflows/test-build.js
npx ts-node ./.github/workflows/test-build.ts
