#!/bin/bash
set -ex

# produces e.g. 2021-11-01
DATE=$(node -p "new Date().toISOString().substring(0,10)")

export ADDRESS=0x3979f7d6b5c5bfa4bcd441b4f35bfa0731ccfaef
export INPUT=data/${DATE}-rewards.csv
npx ts-node src/distribute.ts |tee logs/log-${DATE}-rewards.txt
npx ts-node src/check.ts 2>&1 |tee logs/log-${DATE}-check.txt
grep --after=2 fail logs/log-${DATE}-check.txt |grep -v "\[" > logs/${DATE}-todo-check.txt