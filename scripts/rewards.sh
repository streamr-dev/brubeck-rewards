#!/bin/bash
set -ex
DATE=2022-11-01

export ADDRESS=0x3979f7d6b5c5bfa4bcd441b4f35bfa0731ccfaef
export INPUT=data/${DATE}-rewards.csv
npx ts-node src/distribute.ts |tee logs/log-${DATE}-rewards.txt
npx ts-node src/check.ts &> logs/log-${DATE}-check.txt
grep --after=2 fail logs/log-${DATE}-check.txt |grep -v "\[" > logs/${DATE}-todo-check.txt