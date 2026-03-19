# 🌟 ChainWish — On-Chain Wishlist | Level 4

A decentralized wishlist application built on the **Stellar Testnet** using **Soroban Smart Contracts**. Users can connect their Freighter wallet, create wishes, and fund them using WISH tokens — all recorded permanently on the blockchain.

---

## 🎥 Demo Video
👉 **[Watch Demo Video](https://drive.google.com/file/d/1z-f1AXjv55X7aetaArpGT9JSf9aVRH7L/view?usp=drive_link)**

---

## 🌐 Live Demo
👉 **[https://stellar-internship-level-4.vercel.app](https://stellar-internship-level-4.vercel.app)**

---

## 📸 Screenshots

### Mobile Responsive View
![Mobile View](screenshots/mobile.png)

### CI/CD Pipeline
![CI/CD](screenshots/cicd.png)

---

## ✨ Features
- ✅ Create wishes on **Stellar blockchain**
- ✅ Fund wishes using custom **WISH tokens**
- ✅ Remove wishes (creator only)
- ✅ **Inter-contract calls** (WishManager → WishToken)
- ✅ Real-time progress bar updates every **10 seconds**
- ✅ **Freighter wallet** integration
- ✅ Mobile responsive design
- ✅ CI/CD pipeline with **GitHub Actions**

---

## 🛠️ Tech Stack

| Technology | Purpose |
|---|---|
| Rust + Soroban SDK | Smart Contracts |
| React.js | Frontend UI |
| Tailwind CSS | Styling |
| Stellar SDK | Blockchain interaction |
| Freighter API | Wallet integration |
| GitHub Actions | CI/CD pipeline |
| Vercel | Deployment |

---

## 📋 Contract Addresses

| Contract | Address |
|---|---|
| WishToken | `CBLNIJAJDC4OZXJ7BW4374WQGSPMSU4SOCNUXPUW53WTM6TN76PK5J3B` |
| WishManager | `CDVWSXTOL2IJQIVTPTD3BKPNER3SIKWITVECX6WPWNMG3O66G6DZ4CUS` |

---

## 🔗 Transaction Hashes

| Transaction | Hash |
|---|---|
| WishToken Deploy | `445976cc1319224d0c45f1492a95a6c70c0ebad30db0f955410e0c71333f18d6` |
| WishManager Deploy | `f60852da1d0503ef62e4ba6ba78da3e02724d20c5fdb792f740fdc5462048aeb` |
| WishManager Init | `2b24ca0a620ea60dfb70e6a56f5a2d6a524a6ff290945310ac233876b83edc82` |
| WishToken Init | `c654616a193fd276f2ca6c1dd92e977e36648d80ce23d177944f57d3adf346cd` |

---

## 🪙 Token Address
- **WISH Token**: `CBLNIJAJDC4OZXJ7BW4374WQGSPMSU4SOCNUXPUW53WTM6TN76PK5J3B`
- **Network**: Stellar Testnet
- **RPC URL**: `https://soroban-testnet.stellar.org`

---

## 🔄 Inter-Contract Call
WishManager calls WishToken to transfer tokens when a wish is funded:
```rust
let token_client = TokenClient::new(&env, &token_contract);
token_client.transfer(&funder, &env.current_contract_address(), &amount);
```

---

## ⚡ Real-time Event Streaming
The app polls blockchain every 10 seconds for real-time updates:
- New wishes appear automatically
- Progress bars update in real-time
- Removed wishes disappear instantly

---

## 🚀 Getting Started

### Prerequisites
- Node.js installed
- Rust installed
- [Freighter Wallet](https://freighter.app) browser extension
- Stellar testnet account

### Installation
```bash
# Clone the repository
git clone https://github.com/vaiii05-hub/Stellar-Internship-Level-4.git

# Go to frontend folder
cd Stellar-Internship-Level-4/frontend

# Install dependencies
npm install

# Start the app
npm start
```
App will run at `http://localhost:3000`

### Run Contract Tests
```bash
cd contracts/wish-token
cargo test

cd contracts/wish-manager
cargo test
```

---

## 💡 How It Works
1. Connect **Freighter** wallet
2. Click **+ Create Wish** and fill title + goal amount
3. Click **Create Wish** → approve in Freighter
4. Anyone can **Fund** a wish with WISH tokens
5. Progress bar updates in **real-time**
6. When 100% funded → wish marked as **Completed**
7. Creator can **Remove** unfunded wishes anytime

---

## 📁 Project Structure
```
chainwish/
├── .github/
│   └── workflows/
│       └── ci.yml          # GitHub Actions CI/CD
├── contracts/
│   ├── wish-token/         # WISH ERC-20 like token
│   └── wish-manager/       # Main wishlist contract
├── frontend/               # React app
├── screenshots/            # Mobile + CI/CD screenshots
└── README.md
```

---

## 🔁 CI/CD Pipeline
GitHub Actions runs automatically on every push:
- ✅ Frontend build check
- ✅ Runs on every push to master branch

---

## 📱 Mobile Responsive
Built with Tailwind CSS — fully responsive on all screen sizes.

---

## 👤 Author
**vaiii05-hub**
- GitHub: [@vaiii05-hub](https://github.com/vaiii05-hub)

---

## 📄 License
This project is open source and available under the [MIT License](LICENSE).