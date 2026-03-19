import React, { useState, useEffect } from 'react';
import freighter from '@stellar/freighter-api';
import * as StellarSdk from '@stellar/stellar-sdk';
import {
  NETWORK_PASSPHRASE,
  WISH_MANAGER_CONTRACT,
  server
} from './stellar';
import './App.css';

function App() {
  const [walletAddress, setWalletAddress] = useState(null);
  const [wishes, setWishes] = useState([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newWish, setNewWish] = useState({ title: '', goalAmount: '' });
  const [fundAmounts, setFundAmounts] = useState({});
  const [notification, setNotification] = useState(null);
  const [loading, setLoading] = useState(false);
  const [wishCount, setWishCount] = useState(0);

  const showNotification = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const connectWallet = async () => {
    try {
      const connectionResult = await freighter.isConnected();
      const freighterConnected = connectionResult.isConnected || connectionResult === true;
      if (freighterConnected) {
        await freighter.requestAccess();
        const result = await freighter.getAddress();
        const key = result.address || result;
        if (key) {
          setWalletAddress(key);
          showNotification('Wallet connected successfully! 🎉');
        }
      } else {
        showNotification('Please install Freighter wallet!', 'error');
      }
    } catch (err) {
      showNotification('Failed to connect: ' + err.message, 'error');
    }
  };

  const disconnectWallet = () => {
    setWalletAddress(null);
    setWishes([]);
    setWishCount(0);
    showNotification('Wallet disconnected!');
  };

  const invokeContract = async (contractId, method, params = []) => {
    try {
      const contract = new StellarSdk.Contract(contractId);
      const sourceAccount = await server.getAccount(walletAddress);
      const tx = new StellarSdk.TransactionBuilder(sourceAccount, {
        fee: StellarSdk.BASE_FEE,
        networkPassphrase: NETWORK_PASSPHRASE,
      })
        .addOperation(contract.call(method, ...params))
        .setTimeout(30)
        .build();

      const simResult = await server.simulateTransaction(tx);
      if (simResult.error) throw new Error(simResult.error);

      let preparedTx;
      if (StellarSdk.rpc && StellarSdk.rpc.assembleTransaction) {
        preparedTx = StellarSdk.rpc.assembleTransaction(tx, simResult).build();
      } else if (StellarSdk.SorobanRpc && StellarSdk.SorobanRpc.assembleTransaction) {
        preparedTx = StellarSdk.SorobanRpc.assembleTransaction(tx, simResult).build();
      } else {
        preparedTx = tx;
      }

      const signedResult = await freighter.signTransaction(preparedTx.toXDR(), {
        networkPassphrase: NETWORK_PASSPHRASE,
      });

      const signedXdr = signedResult.signedTxXdr || signedResult;
      const txToSubmit = StellarSdk.TransactionBuilder.fromXDR(signedXdr, NETWORK_PASSPHRASE);
      const sendResult = await server.sendTransaction(txToSubmit);

      let getResult = await server.getTransaction(sendResult.hash);
      let attempts = 0;
      while (getResult.status === 'NOT_FOUND' && attempts < 20) {
        await new Promise(r => setTimeout(r, 1500));
        getResult = await server.getTransaction(sendResult.hash);
        attempts++;
      }
      return getResult;
    } catch (err) {
      console.error('Contract invoke error:', err);
      throw err;
    }
  };

  const loadWishes = async () => {
    try {
      const contract = new StellarSdk.Contract(WISH_MANAGER_CONTRACT);
      const dummyKeypair = StellarSdk.Keypair.random();
      const account = new StellarSdk.Account(dummyKeypair.publicKey(), '0');

      const countTx = new StellarSdk.TransactionBuilder(account, {
        fee: StellarSdk.BASE_FEE,
        networkPassphrase: NETWORK_PASSPHRASE,
      })
        .addOperation(contract.call('get_wish_count'))
        .setTimeout(30)
        .build();

      const countSim = await server.simulateTransaction(countTx);
      if (!countSim.result) return;

      const count = Number(StellarSdk.scValToNative(countSim.result.retval));

      const loadedWishes = [];
      for (let i = 1; i <= count; i++) {
        try {
          const wishTx = new StellarSdk.TransactionBuilder(account, {
            fee: StellarSdk.BASE_FEE,
            networkPassphrase: NETWORK_PASSPHRASE,
          })
            .addOperation(contract.call('get_wish',
              StellarSdk.nativeToScVal(i, { type: 'u64' })
            ))
            .setTimeout(30)
            .build();

          const wishSim = await server.simulateTransaction(wishTx);
          if (wishSim.result && !wishSim.error) {
            const raw = StellarSdk.scValToNative(wishSim.result.retval);
            if (raw && raw.id) {
              loadedWishes.push({
                id: Number(raw.id),
                title: typeof raw.title === 'string' ? raw.title : String(raw.title),
                goalAmount: Number(raw.goal_amount),
                fundedAmount: Number(raw.funded_amount),
                creator: String(raw.creator),
                isCompleted: Boolean(raw.is_completed),
              });
            }
          }
        } catch (e) {
          console.log(`Wish ${i} was removed, skipping`);
        }
      }
      setWishes(loadedWishes);
      setWishCount(loadedWishes.length);
    } catch (err) {
      console.error('Load wishes error:', err);
    }
  };

  useEffect(() => {
    loadWishes();
    const interval = setInterval(loadWishes, 10000);
    return () => clearInterval(interval);
  }, []);

  const createWish = async () => {
    if (!walletAddress) return showNotification('Connect wallet first!', 'error');
    if (!newWish.title || !newWish.goalAmount) return showNotification('Fill all fields!', 'error');
    setLoading(true);
    try {
      await invokeContract(WISH_MANAGER_CONTRACT, 'create_wish', [
        StellarSdk.nativeToScVal(walletAddress, { type: 'address' }),
        StellarSdk.nativeToScVal(newWish.title, { type: 'string' }),
        StellarSdk.nativeToScVal(parseInt(newWish.goalAmount), { type: 'i128' }),
      ]);
      showNotification('Wish created on blockchain! 🌟');
      setNewWish({ title: '', goalAmount: '' });
      setShowCreateForm(false);
      await loadWishes();
    } catch (err) {
      showNotification('Failed to create wish: ' + err.message, 'error');
    }
    setLoading(false);
  };

  const fundWish = async (wishId) => {
    if (!walletAddress) return showNotification('Connect wallet first!', 'error');
    const amount = parseInt(fundAmounts[wishId] || 0);
    if (!amount || amount <= 0) return showNotification('Enter valid amount!', 'error');
    setLoading(true);
    try {
      await invokeContract(WISH_MANAGER_CONTRACT, 'fund_wish', [
        StellarSdk.nativeToScVal(walletAddress, { type: 'address' }),
        StellarSdk.nativeToScVal(wishId, { type: 'u64' }),
        StellarSdk.nativeToScVal(amount, { type: 'i128' }),
      ]);
      showNotification(`Funded ${amount} WISH tokens! 💜`);
      setFundAmounts({ ...fundAmounts, [wishId]: '' });
      await loadWishes();
    } catch (err) {
      console.error(err);
      showNotification('Failed to fund wish: ' + err.message, 'error');
    }
    setLoading(false);
  };

  const removeWish = async (wishId) => {
    if (!walletAddress) return showNotification('Connect wallet first!', 'error');
    setLoading(true);
    try {
      await invokeContract(WISH_MANAGER_CONTRACT, 'remove_wish', [
        StellarSdk.nativeToScVal(walletAddress, { type: 'address' }),
        StellarSdk.nativeToScVal(wishId, { type: 'u64' }),
      ]);
      setWishes(prev => prev.filter(w => w.id !== wishId));
      setWishCount(prev => prev - 1);
      showNotification('Wish removed successfully! 🗑️');
      await loadWishes();
    } catch (err) {
      console.error(err);
      showNotification('Failed to remove wish: ' + err.message, 'error');
    }
    setLoading(false);
  };

  const shortAddress = (addr) => addr ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : '';

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#0f1117' }}>

      {/* Notification */}
      {notification && (
        <div className={`fixed top-4 right-4 z-50 px-6 py-3 rounded-xl text-white font-medium shadow-lg transition-all ${notification.type === 'error' ? 'bg-red-500' : 'bg-purple-600'}`}>
          {notification.message}
        </div>
      )}

      {/* Loading overlay */}
      {loading && (
        <div className="fixed inset-0 z-40 flex items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="p-6 rounded-2xl text-white text-center" style={{ backgroundColor: '#1a1d2e' }}>
            <p className="text-2xl mb-2">⏳</p>
            <p className="font-semibold">Processing on blockchain...</p>
          </div>
        </div>
      )}

      {/* Navbar */}
<nav className="flex items-center justify-between px-4 py-4 border-b border-gray-800">
  <div className="flex items-center gap-2">
    <div className="w-8 h-8 rounded-xl flex items-center justify-center text-lg"
      style={{ background: 'linear-gradient(135deg, #7c3aed, #ec4899)' }}>
      🌟
    </div>
    <div>
      <h1 className="text-white font-bold text-sm">ChainWish</h1>
      <p className="text-gray-400 text-xs">On-chain Wishlist</p>
    </div>
  </div>
  <div className="flex gap-2">
    <button
      onClick={connectWallet}
      className="px-3 py-2 rounded-xl text-white font-semibold text-xs transition-all hover:opacity-90"
      style={{ background: 'linear-gradient(135deg, #7c3aed, #ec4899)' }}
    >
      {walletAddress ? `🔗 ${shortAddress(walletAddress)}` : '🔗 Connect'}
    </button>
    {walletAddress && (
      <button
        onClick={disconnectWallet}
        className="px-3 py-2 rounded-xl text-gray-400 font-semibold text-xs border border-gray-700 hover:border-red-500 hover:text-red-400 transition-all"
      >
        Disconnect
      </button>
    )}
  </div>
</nav>

      {/* Hero Section */}
      {!walletAddress && (
        <div className="flex flex-col items-center justify-center px-4 text-center py-16">
          <div className="w-20 h-20 rounded-2xl flex items-center justify-center text-4xl mb-6"
            style={{ background: 'linear-gradient(135deg, #7c3aed, #ec4899)' }}>
            🌟
          </div>
          <h2 className="text-5xl font-bold text-white mb-3">Welcome to ChainWish</h2>
          <p className="text-gray-400 text-lg mb-2">Decentralized wishlist on Stellar blockchain</p>
          <p className="text-gray-500 text-sm mb-8">Connect your Freighter wallet to get started</p>
          <div className="flex flex-wrap justify-center gap-3 mb-8">
            <span className="px-4 py-2 rounded-full text-sm font-medium text-white border border-gray-700">🔒 On-chain</span>
            <span className="px-4 py-2 rounded-full text-sm font-medium text-white border border-gray-700">⚡ Real-time</span>
            <span className="px-4 py-2 rounded-full text-sm font-medium text-white border border-gray-700">🌐 Decentralized</span>
          </div>
          <div className="grid grid-cols-3 gap-12 p-8 rounded-2xl border border-gray-800 w-full max-w-lg"
            style={{ backgroundColor: '#1a1d2e' }}>
            <div className="text-center">
              <p className="text-2xl font-bold text-purple-400">WISH</p>
              <p className="text-gray-400 text-sm mt-1">Token</p>
            </div>
            <div className="text-center border-x border-gray-700">
              <p className="text-2xl font-bold text-pink-400">Testnet</p>
              <p className="text-gray-400 text-sm mt-1">Network</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-purple-400">{wishCount}</p>
              <p className="text-gray-400 text-sm mt-1">Wishes</p>
            </div>
          </div>
          
        </div>
      )}

      {/* Main App */}
      {walletAddress && (
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-white">All Wishes ✨ <span className="text-purple-400 text-lg">({wishCount})</span></h2>
            <button
              onClick={() => setShowCreateForm(!showCreateForm)}
              className="px-5 py-2 rounded-xl text-white font-semibold text-sm transition-all hover:opacity-90"
              style={{ background: 'linear-gradient(135deg, #7c3aed, #ec4899)' }}
            >
              + Create Wish
            </button>
          </div>

          {/* Create Wish Form */}
          {showCreateForm && (
            <div className="p-6 rounded-2xl border border-gray-700 mb-6" style={{ backgroundColor: '#1a1d2e' }}>
              <h3 className="text-white font-bold text-lg mb-4">✨ New Wish</h3>
              <input
                type="text"
                placeholder="What do you wish for?"
                value={newWish.title}
                onChange={(e) => setNewWish({ ...newWish, title: e.target.value })}
                className="w-full px-4 py-3 rounded-xl text-white placeholder-gray-500 border border-gray-700 mb-3 outline-none focus:border-purple-500"
                style={{ backgroundColor: '#252838' }}
              />
              <input
                type="number"
                placeholder="Goal amount (WISH tokens)"
                value={newWish.goalAmount}
                onChange={(e) => setNewWish({ ...newWish, goalAmount: e.target.value })}
                className="w-full px-4 py-3 rounded-xl text-white placeholder-gray-500 border border-gray-700 mb-4 outline-none focus:border-purple-500"
                style={{ backgroundColor: '#252838' }}
              />
              <div className="flex gap-3">
                <button
                  onClick={createWish}
                  className="flex-1 py-3 rounded-xl text-white font-semibold transition-all hover:opacity-90"
                  style={{ background: 'linear-gradient(135deg, #7c3aed, #ec4899)' }}
                >
                  Create Wish 🌟
                </button>
                <button
                  onClick={() => setShowCreateForm(false)}
                  className="px-6 py-3 rounded-xl text-gray-400 font-semibold border border-gray-700 hover:border-gray-500"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Empty State */}
          {wishes.length === 0 && (
            <div className="text-center py-16 rounded-2xl border border-gray-800" style={{ backgroundColor: '#1a1d2e' }}>
              <p className="text-5xl mb-4">🌟</p>
              <p className="text-gray-400 text-lg">No wishes yet</p>
              <p className="text-gray-500 text-sm">Create your first wish above!</p>
            </div>
          )}

          {/* Wish Cards */}
          <div className="grid gap-4">
            {wishes.map(wish => {
              const progress = Math.round((wish.fundedAmount / wish.goalAmount) * 100);
              return (
                <div key={wish.id} className="p-6 rounded-2xl border border-gray-700 transition-all hover:border-purple-500"
                  style={{ backgroundColor: '#1a1d2e' }}>
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="text-white font-bold text-lg">{wish.title}</h3>
                      <p className="text-gray-500 text-xs mt-1">by {shortAddress(wish.creator)}</p>
                    </div>
                    <div className="flex gap-2 items-center">
                      {wish.creator === walletAddress && !wish.isCompleted && (
                        <button
                          onClick={() => removeWish(wish.id)}
                          className="px-3 py-1 rounded-full text-xs font-bold text-red-400 border border-red-400 hover:bg-red-400 hover:text-white transition-all"
                        >
                          🗑️ Remove
                        </button>
                      )}
                      {wish.isCompleted && (
                        <span className="px-3 py-1 rounded-full text-xs font-bold text-white"
                          style={{ background: 'linear-gradient(135deg, #7c3aed, #ec4899)' }}>
                          ✅ Funded!
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="mb-3">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-400">{wish.fundedAmount} WISH</span>
                      <span className="text-gray-400">{wish.goalAmount} WISH</span>
                    </div>
                    <div className="w-full h-2 rounded-full" style={{ backgroundColor: '#252838' }}>
                      <div
                        className="h-2 rounded-full transition-all duration-500"
                        style={{ width: `${progress}%`, background: 'linear-gradient(135deg, #7c3aed, #ec4899)' }}
                      />
                    </div>
                    <p className="text-purple-400 text-xs mt-1 text-right">{progress}% funded</p>
                  </div>
                  {!wish.isCompleted && (
                    <div className="flex gap-2 mt-4">
                      <input
                        type="number"
                        placeholder="Amount to fund"
                        value={fundAmounts[wish.id] || ''}
                        onChange={(e) => setFundAmounts({ ...fundAmounts, [wish.id]: e.target.value })}
                        className="flex-1 px-4 py-2 rounded-xl text-white placeholder-gray-500 border border-gray-700 outline-none focus:border-purple-500 text-sm"
                        style={{ backgroundColor: '#252838' }}
                      />
                      <button
                        onClick={() => fundWish(wish.id)}
                        className="px-5 py-2 rounded-xl text-white font-semibold text-sm transition-all hover:opacity-90"
                        style={{ background: 'linear-gradient(135deg, #7c3aed, #ec4899)' }}
                      >
                        Fund 💜
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default App;