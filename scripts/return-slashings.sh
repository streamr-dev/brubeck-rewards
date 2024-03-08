#!/bin/bash
set -euxo pipefail

# produces e.g. 2021-11-01
DATE=$(node -p "new Date().toISOString().substring(0,10)")

export ADDRESS=0xB7c47d6FEb01e9CC3d1c2fd387688Ac599fE50e4
export INPUT=data/return-slashings/${DATE}.csv
npx ts-node src/distribute.ts |tee -a logs/return-slashings/run-${DATE}.txt
npx ts-node src/check.ts 2>&1 |tee -a logs/return-slashings/check-${DATE}.txt
grep --after=2 fail logs/return-slashings/check-${DATE}.txt |grep -v "\[" > logs/return-slashings/todo-check-${DATE}.txt

#export TARGET=0xd24aEFDDF905Cf927cB643FeBf6eC06ECc9D7802
#npx ts-node src/sweep-leftovers.ts |tee -a logs/log-${DATE}-rewards.txt
