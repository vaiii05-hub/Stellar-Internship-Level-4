import * as StellarSdk from '@stellar/stellar-sdk';

export const NETWORK_PASSPHRASE = 'Test SDF Network ; September 2015';
export const HORIZON_URL = 'https://horizon-testnet.stellar.org';
export const RPC_URL = 'https://soroban-testnet.stellar.org';

export const WISH_TOKEN_CONTRACT = 'CBLNIJAJDC4OZXJ7BW4374WQGSPMSU4SOCNUXPUW53WTM6TN76PK5J3B';
export const WISH_MANAGER_CONTRACT = 'CDVWSXTOL2IJQIVTPTD3BKPNER3SIKWITVECX6WPWNMG3O66G6DZ4CUS';
let server;
try {
  if (StellarSdk.rpc && StellarSdk.rpc.Server) {
    server = new StellarSdk.rpc.Server(RPC_URL);
  } else if (StellarSdk.SorobanRpc && StellarSdk.SorobanRpc.Server) {
    server = new StellarSdk.SorobanRpc.Server(RPC_URL);
  } else {
    server = new StellarSdk.Server(RPC_URL, { allowHttp: false });
  }
} catch (e) {
  console.error('Server init error:', e);
}

export { server };
export const horizon = new StellarSdk.Horizon.Server(HORIZON_URL);