# Token distribution contract

[![CI](https://github.com/jtakalai/brubeck-rewards/actions/workflows/ci.yaml/badge.svg)](https://github.com/jtakalai/brubeck-rewards/actions/workflows/ci.yaml)

## Usage

1. Deploy the contract (argument = address of the token to distribute) 
1. Send distributed tokens into contract
1. Send native token into the contract (stipends to recipients so that they can transfer the token forward)
1. Call send with the intended targets' addresses and amounts

## Costs

Gas measurements using index.js
```
batch 10, gas 179857 (18000/target)
batch 30, gas 486143 (16200/target)
batch 100, gas 1558330 (15600/target)
```
