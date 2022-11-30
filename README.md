# Token distribution contract

[![CI tests](https://github.com/streamr-dev/brubeck-rewards/actions/workflows/ci.yaml/badge.svg)](https://github.com/streamr-dev/brubeck-rewards/actions/workflows/ci.yaml)

## Smart contract

1. Deploy the contract, argument = address of the token to distribute
1. Send distributed tokens into contract
1. Send native token into the contract (stipends to recipients so that they can transfer the token forward)
1. Call send, arguments = (array of the intended targets' addresses, respective array of token wei amounts)
1. Call withdrawAll to return any extra tokens and native tokens to the deployer

## Usage

To run the Stream-team distribution:
1. Send tokens to the [distributor contract](https://polygonscan.com/address/0x4f9c39FD42010c1bDFf33e8176caf66b9F5F356b#readContract)
1. Clone this repo and/or `cd brubeck-rewards` (enter commands from repository root)
1. Save the CSV file to `data/stream-team/2022-11-01` (use today's date!)
1. export KEY=0x1234567890123456789012345678901234567890123456789012345678901234 (find the "distributor" private key in 1password)
1. `scripts/stream-team.sh`

## Costs

Gas measurements using index.js
```
batch 10, gas 179857 (18000/target)
batch 30, gas 486143 (16200/target)
batch 100, gas 1558330 (15600/target)
```
