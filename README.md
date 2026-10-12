# otter-js

otter-js builds, signs, and broadcasts multi-chain transactions. It exposes the same operations over HTTP and gRPC.

Supported chains:

- Ethereum, including ERC-20 transfers and contract calls
- Ethereum Gnosis Safe
- Bitcoin, including legacy and segwit accounts
- Polkadot, including staking and multisig
- Cosmos, including staking and multisig
- Solana, including SPL token transfers
- Tron, including TRC-10 and TRC-20 transfers
- Ripple
- Avalanche

## Requirements

- Node.js 22.12.0
- pnpm 10.12.1

## Run locally

```bash
pnpm install
cp .env.example .env
pnpm start
```

`pnpm start` generates protobuf types, compiles TypeScript, and starts both servers.


| Service | Default address         |
| ------- | ----------------------- |
| HTTP    | `http://localhost:3000` |
| gRPC    | `localhost:50051`       |


Check that the process is up:

```bash
curl http://localhost:3000/health
```

The health check returns `ok`.

## Configuration

Copy `.env.example` to `.env`.


| Variable           | Default  | Purpose          |
| ------------------ | -------- | ---------------- |
| `PORT`             | `3000`   | HTTP port        |
| `GRPC_PORT`        | `50051`  | gRPC port        |
| `LOG_LEVEL`        |          | Logger level     |
| `GRPC_SERVER_NAME` | `Wallet` | gRPC server name |


## Docker

```bash
docker compose up --build
```

Compose publishes HTTP on port `13000` and gRPC on port `50051`. Mount a local `.env` before starting the stack.

## HTTP API

Routes live under `/api`. Each chain module is mounted at its own prefix, and the handlers are `POST` endpoints. Request and response bodies follow the protobuf messages in `proto/`.


| Prefix                 | Chain       |
| ---------------------- | ----------- |
| `/api/ethereum`        | Ethereum    |
| `/api/ethereum/gnosis` | Gnosis Safe |
| `/api/bitcoin`         | Bitcoin     |
| `/api/polkadot`        | Polkadot    |
| `/api/cosmos`          | Cosmos      |
| `/api/solana`          | Solana      |
| `/api/tron`            | Tron        |
| `/api/ripple`          | Ripple      |
| `/api/avalanche`       | Avalanche   |


Typical calls deploy an account, build a transaction, sign it, and send it. Chain modules add their own methods, such as fee data, decoding, rebuilding, staking, and multisig. The route list is in `src/rest/api/`.

Example:

```bash
curl -X POST http://localhost:3000/api/ethereum/deployAccount \
  -H 'content-type: application/json' \
  -d '{"key":"<public-key>"}'
```

## gRPC

The gRPC server loads the contracts in `proto/` and registers one service per chain, plus a health service. Use the same message shapes as the HTTP API.

## Development

```bash
pnpm test
pnpm run debug
```

`pnpm test` runs the Jest suite on ports `14000` and `60051`, so it does not collide with a local server. `pnpm run debug` starts the service with the Node inspector enabled.

## License

MIT