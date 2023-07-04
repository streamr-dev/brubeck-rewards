#!/bin/bash
set -euxo pipefail

# produces e.g. 2021-11-01
DATE=$(node -p "new Date().toISOString().substring(0,10)")

export ADDRESS=0xd24aEFDDF905Cf927cB643FeBf6eC06ECc9D7802
export INPUT=data/${DATE}-rewards-no-stipend.csv
# export STIPEND_MATIC=0
# npx ts-node src/setStipend.ts |tee -a logs/log-${DATE}-rewards-2.txt
npx ts-node src/send-in-one-batch.ts |tee -a logs/log-${DATE}-rewards-2.txt
npx ts-node src/check.ts 2>&1 |tee -a logs/log-${DATE}-check-2.txt
# grep --after=2 fail logs/log-${DATE}-check.txt |grep -v "\[" > logs/${DATE}-todo-check.txt
