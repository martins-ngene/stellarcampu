#!/usr/bin/env bash
set -e

echo "=== StellarCampus Soroban Contract Testnet Deployment ==="

NETWORK="testnet"
RPC_URL="https://soroban-testnet.stellar.org"
PASSPHRASE="Test SDF Network ; September 2015"
ADMIN_ALIAS="campus-admin"

echo "1. Ensuring network configuration exists in stellar-cli..."
stellar network add \
  --global $NETWORK \
  --rpc-url $RPC_URL \
  --network-passphrase "$PASSPHRASE" 2>/dev/null || true

echo "2. Checking / creating deployer identity: $ADMIN_ALIAS..."
stellar keys generate --global $ADMIN_ALIAS --network $NETWORK 2>/dev/null || true

echo "3. Funding deployer with Friendbot..."
stellar keys fund $ADMIN_ALIAS --network $NETWORK 2>/dev/null || true

ADMIN_ADDR=$(stellar keys address $ADMIN_ALIAS)
echo "Deployer / Admin Address: $ADMIN_ADDR"

echo "4. Building Soroban WASM contract..."
cd "$(dirname "$0")/../contracts/challenge-contract"
cargo test
cargo build --target wasm32-unknown-unknown --release

WASM_FILE="target/wasm32-unknown-unknown/release/stellar_campus_contract.wasm"

echo "5. Deploying contract to Stellar Testnet..."
CONTRACT_ID=$(stellar contract deploy \
  --wasm $WASM_FILE \
  --source $ADMIN_ALIAS \
  --network $NETWORK)

echo "✅ Contract Deployed Successfully!"
echo "CONTRACT_ID: $CONTRACT_ID"
echo "$CONTRACT_ID" > ../../contract-id.txt

echo "6. Initializing contract with Admin address..."
stellar contract invoke \
  --id $CONTRACT_ID \
  --source $ADMIN_ALIAS \
  --network $NETWORK \
  -- initialize \
  --admin $ADMIN_ADDR

echo "✅ Contract Initialized!"
echo "Update your backend/.env with:"
echo "SOROBAN_CONTRACT_ID=\"$CONTRACT_ID\""
echo "CAMPUS_VAULT_ADDRESS=\"$ADMIN_ADDR\""
