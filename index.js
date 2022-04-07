const express = require('express')
const path = require('path')
const PORT = process.env.PORT || 5000
const bodyParser = require('body-parser')
const cors = require('cors')
const admin = require("firebase-admin");
const { RuntimeArgs, CLValueBuilder, Contracts, CasperClient, DeployUtil, CLPublicKey } = require('casper-js-sdk')

const serviceAccount = (process.env.ENV && JSON.parse(process.env.ENV['FIREBASE_PRIVATE_KEY']))
                        || require("./firebase-private-key.json");
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://nft-market-7ba58-default-rtdb.firebaseio.com"
});

// TODO: move to environment variables?
// casper-test
const NODE_ADDRESS = 'http://162.55.6.177:7777/rpc';
const CHAIN_NAME = 'casper-test';
const CONTRACT_HASH = 'hash-9de2e5785c920c139d66bf6db7198b48019ddb6973dc3d13e61b9c12a76d45a1';
const CONTRACT_PACKAGE_HASH = 'hash-e38adbdaca505cbe435ede201f64771350d6f5a282510bd49df56c8424e946f3';
const EVENT_STREAM_ADDRESS = 'http://95.216.67.162:9999/events/main'; //check this

// NCTL
// const NODE_ADDRESS = 'http://localhost:11101/rpc';
// const CHAIN_NAME = 'casper-net-1';
// const CONTRACT_HASH = 'hash-bdcb74ace671c417f08ef3685a462d63e74a10acf678305ecb3821a9812a4f48';
// const CONTRACT_PACKAGE_HASH = 'hash-db054e92e3125a3ce38ac1790994c8ec25b39b07193b0e64107ddc69b4613d3c';
// const EVENT_STREAM_ADDRESS = 'http://localhost:18101/events/main';

const client = new CasperClient(NODE_ADDRESS);
const contract = new Contracts.Contract(client);
contract.setContractHash(CONTRACT_HASH);

const ContractEvents = require('./src/contract-events.js');
const contractEvents = new ContractEvents({
    contractPackageHash: CONTRACT_PACKAGE_HASH,
    eventStreamAddress: EVENT_STREAM_ADDRESS,
    contract: contract
});

const Search = require('./src/search.js');
const search = new Search({});

express()
    .use(cors())
    .use(bodyParser.json())
    .use(bodyParser({ limit: '5mb' }))
    .use(bodyParser.urlencoded({
        extended: true
    }))

    .use(express.static(path.join(__dirname, 'public')))
    .set('views', path.join(__dirname, 'views'))
    .set('view engine', 'ejs')
    .get('/', (req, res) => res.render('pages/index'))

    .post('/sendDeploy', async (req, res) => {
        const signedJSON = req.body;
        let signedDeploy = DeployUtil.deployFromJson(signedJSON).unwrap(); //Unwrap from JSON to Deploy object
        signedDeploy.send(NODE_ADDRESS).then((response) => {
            res.status(200).json(response);
            return;
        }).catch((error) => {
            console.log(error);
            return;
        });
    })

    .get("/getDeploy", (req, res) => {
        const hash = req.query.hash;
        client.getDeploy(hash).then((response) => {
            res.send(response);
            return;
        }).catch((error) => {
            res.send(error);
            return;
        })
    })

    .get("/getMintId", async (req, res) => {
        //TODO: ensure unique ids
        const supply = await contract.queryContractData(['total_supply']);
        res.status(200).json(parseInt(supply) + 1);
    })

    .post('/storeMetaData', async (req, res) => {
        const metadata = req.body;
        //TODO: store metadata on decentralized storage (maybe not necessary for hackathon) & return url.
        //      May be possible/better to do this client side? Not sure about security though.
        //QUESTION: What format to store - some store as ipfs://QmZKxj2f51gptdnTmhzPHvB1qpoi5U4QazXaBBvUDeQzKB

        const response = 'https://ipfs.io/ipfs/QmeSjSinHpPnmXmspMjwiXyN6zS4E9zccariGR3jxcaWtq/4671';
        res.status(200).json(['token_uri', response]);
    })


    .get('/getAccountBalance', async (req, res) => {
        const publicKey = CLPublicKey.fromHex(req.query.publicKey)
        client.balanceOfByPublicKey(publicKey).then(response => {
            res.status(200).json(response.toNumber());
        }).catch((error) => {
            res.send(error);
            return;
        })
    })

    .listen(PORT, () => console.log(`Listening on ${ PORT }`))