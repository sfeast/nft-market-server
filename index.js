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
// const NFT_CONTRACT_HASH = 'hash-893df41fc9643fa47be74102f9b285b6b887dfeec39116fa83a66d1e51b822ec';
// const NFT_CONTRACT_PACKAGE_HASH = 'hash-b56724868f78444699972ea0ec88a220909af2bc460af7916d0f1aed72d012e2';
// const MARKET_CONTRACT_HASH = 'hash-e9ddf68fcf551da741d37cf3e5d229f4f48db8303d282278bcdf82d2469786cb';
// const MARKET_CONTRACT_PACKAGE_HASH = 'hash-7ead7247e05f3f3922147c6545968c1ab1b48fd8e28a704e45ad8af0bc63d5fe';
// const EVENT_STREAM_ADDRESS = 'http://localhost:18101/events/main';

const Market = require('./src/market.js');
const market = new Market({
    nodeAddress: NODE_ADDRESS,
    eventStreamAddress: EVENT_STREAM_ADDRESS,
    chainName: CHAIN_NAME,
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

    .get('/getAllowance', async (req, res) => {
        market.getAllowance(req.query.publicKeyHash, req.query.token_id).then(response => {
            res.status(200).json(response);
        }).catch((error) => {
            res.send(error);
        })
    })

    .get('/getOwner', async (req, res) => {
        market.getOwner(req.query.token_id).then(response => {
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