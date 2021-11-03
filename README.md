# Token distribution contract

[![CI](https://github.com/jtakalai/brubeck-rewards/actions/workflows/ci.yaml/badge.svg)](https://github.com/jtakalai/brubeck-rewards/actions/workflows/ci.yaml)

## Usage

1. Deploy the contract
1. Send tokens into contract
1. Call send with the intended targets' addresses and amounts

## Costs

Gas measurements using index.js
```
batch 10, gas 179857 (18000/target)
batch 30, gas 486143 (16200/target)
batch 100, gas 1558330 (15600/target)
```