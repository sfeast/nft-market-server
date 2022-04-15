const express = require('express')
const path = require('path')
const PORT = process.env.PORT || 5000
const cors = require('cors')
const admin = require("firebase-admin");

const serviceAccount = (process.env.FIREBASE_SERVICE_ACCOUNT_KEY && JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY))
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
const NFT_CONTRACT_HASH = 'hash-b82baff7badcbd0066aaf84006a5b5c6159a81ca2f0daf937f5894739a3d6863';
const NFT_CONTRACT_PACKAGE_HASH = 'hash-fb1b716196827c6f6ffe76e1dd4d11dee2595436ae443ef6bf889f7c2c27d8ca';
const MARKET_CONTRACT_HASH = 'hash-02067ab5ddf5d5cace04fb622994ff562343bc27eb5d03c9ae3a951c018a55ed';
const MARKET_CONTRACT_PACKAGE_HASH = 'hash-d0f060ce28fde52b867ed75700bd500de5396a4578e82aa324c16290ca1c6522';

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