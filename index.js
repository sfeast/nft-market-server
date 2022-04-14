const express = require('express')
const path = require('path')
const PORT = process.env.PORT || 5000
const cors = require('cors')
const admin = require("firebase-admin");

const serviceAccount = (process.env.ENV && JSON.parse(process.env.ENV['FIREBASE_PRIVATE_KEY']))
                        || require("./firebase-private-key.json");
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://nft-market-7ba58-default-rtdb.firebaseio.com"
});

// TODO: move to environment variables
// /* casper-test */
const NODE_ADDRESS='http://95.216.67.162:7777/rpc'
const EVENT_STREAM_ADDRESS='http://95.216.67.162:9999/events/main'
const CHAIN_NAME = 'casper-test';
const NFT_CONTRACT_HASH = 'hash-9de2e5785c920c139d66bf6db7198b48019ddb6973dc3d13e61b9c12a76d45a1';
const NFT_CONTRACT_PACKAGE_HASH = 'hash-e38adbdaca505cbe435ede201f64771350d6f5a282510bd49df56c8424e946f3';
const MARKET_CONTRACT_HASH = 'hash-ccdb2fab9f8cbb2416cb1227a7ffcbc35a33ae9f8059f5a637e4a2a92e766575';
const MARKET_CONTRACT_PACKAGE_HASH = 'hash-bc6b9203fb9b07ff1e1e30b7eb2d870e39101feab82a6e4ff2e8f88bedf21a6d';

// /* NCTL */
// const NODE_ADDRESS = 'http://localhost:11101/rpc';
// const CHAIN_NAME = 'casper-net-1';
// const NFT_CONTRACT_HASH = 'hash-6539e9c16bbea881d2a9cc2183d72dca956c798a3fb838e5b9707fa938e06687';
// const NFT_CONTRACT_PACKAGE_HASH = 'hash-a1f8c65b2f7776f314484433a43e9bd48e9bed423b022c21554f034d5ec92937';
// const MARKET_CONTRACT_HASH = 'hash-34cfb79524146a9df2efb044a96479afd59688701f2c2aa09d856afad2ce7d22';
// const MARKET_CONTRACT_PACKAGE_HASH = 'hash-3ff56d345cdc501971ff0ccb9946b57dc4974bdf15b83042c0def68cd90ec3bc';
// const EVENT_STREAM_ADDRESS = 'http://localhost:18101/events/main';

const Market = require('./src/market.js');
const market = new Market({
    nodeAddress: NODE_ADDRESS,
    eventStreamAddress: EVENT_STREAM_ADDRESS,
    nftContractHash: NFT_CONTRACT_HASH,
    nftContractPackageHash: NFT_CONTRACT_PACKAGE_HASH,
    marketContractHash: MARKET_CONTRACT_HASH,
    marketContractPackageHash: MARKET_CONTRACT_PACKAGE_HASH,
});

const Search = require('./src/search.js');
const search = new Search({
    nftPackage: NFT_CONTRACT_PACKAGE_HASH
});

express()
    .use(cors())
    .use(express.json({ limit: '50mb'}))

    .post('/sendDeploy', async (req, res) => {
        market.sendDeploy(req.body).then((response) => {
            res.status(200).json(response);
        }).catch((error) => {
            console.log(error);
            res.send(error)
        })
    })

    .get("/getDeploy", (req, res) => {
        market.getDeploy(req.query.hash).then((response) => {
            res.send(response);
        }).catch((error) => {
            res.send(error);
        })
    })

    .get("/getMintId", async (req, res) => {
        const next = await market.getMintId();
        res.status(200).json(next);
    })

    .get('/getAccountBalance', async (req, res) => {
        market.getAccountBalance(req.query.publicKeyHash).then(response => {
            res.status(200).json(response);
        }).catch((error) => {
            res.send(error);
        })
    })

    .get("/getItem", async (req, res) => {
        search.getItem(req.query.contract, req.query.token_id).then((response) => {
            res.send(response);
        }).catch((error) => {
            res.send(error);
        })
    })

    .post("/search", async (req, res) => {
        search.search(req.body).then((response) => {
            res.send(response);
        }).catch((error) => {
            res.send(error);
        })
    })

    .listen(PORT, () => console.log(`Listening on ${ PORT }`))