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
const MARKET_CONTRACT_HASH = 'hash-bc113a82c4afc00627c95518cdd584f144719d7906271ed8f8889611d1dc4312';
const MARKET_CONTRACT_PACKAGE_HASH = 'hash-25700d96b1de45ab359736db3a3bfe84f442a67be1956d3d9e85428c70aa621e';

// /* NCTL */
// const NODE_ADDRESS = 'http://localhost:11101/rpc';
// const CHAIN_NAME = 'casper-net-1';
// const NFT_CONTRACT_HASH = 'hash-186cb857d6c9ce4d70cec17c4b4b750a8eeecd12975e48cd6767bacdffc36c37';
// const NFT_CONTRACT_PACKAGE_HASH = 'hash-a20b78c921753fec3dcc74c07bf7e61f63bab31c86a1cc6fc3975d7ebf3b6d77';
// const MARKET_CONTRACT_HASH = 'hash-8a58d027f071ca99446fd20ec97d75047315c245164401353127d52a457778ae';
// const MARKET_CONTRACT_PACKAGE_HASH = 'hash-b93d5f2d2b1ab029cebb451810c8f6ac99a70ee5ce6ae11b3755cedc01ef2606';
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
const search = new Search({});

express()
    .use(cors())
    .use(express.json({ limit: '50mb'}))
    // .use(express.static(path.join(__dirname, 'public')))
    // .set('views', path.join(__dirname, 'views'))
    // .set('view engine', 'ejs')
    // .get('/', (req, res) => res.render('pages/index'))

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

    .post('/storeMetaData', async (req, res) => {
        const response = await market.storeMetaData(req.body);
        res.status(200).json(response);
    })


    .get('/getAccountBalance', async (req, res) => {
        market.getAccountBalance(req.query.publicKeyHash).then(response => {
            res.status(200).json(response);
        }).catch((error) => {
            res.send(error);
        })
    })

    .listen(PORT, () => console.log(`Listening on ${ PORT }`))