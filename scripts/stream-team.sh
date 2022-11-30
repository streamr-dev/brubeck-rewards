#!/bin/bash
set -ex

# produces e.g. 2021-11-01
DATE=$(node -p "new Date().toISOString().substring(0,10)")

export INPUT=data/stream-team/${DATE}.csv
export ADDRESS=0x4f9c39FD42010c1bDFf33e8176caf66b9F5F356b
npx ts-node src/distribute.ts |tee logs/stream-team/run-${DATE}.txt
npx ts-node src/check.ts &> logs/stream-team/check-${DATE}.txt
grep --after=2 fail logs/stream-team/check-${DATE}.txt |grep -v "\[" > logs/stream-team/todo-check-${DATE}.txt
