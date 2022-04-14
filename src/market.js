const admin = require("firebase-admin");
const db = admin.database();
const fetch = require('node-fetch');
const { RuntimeArgs, CLValueBuilder, Contracts, CasperClient, DeployUtil, CLPublicKey } = require('casper-js-sdk')

const NFTContractEvents = require('./nft-contract-events.js');
const MarketContractEvents = require('./market-contract-events.js');

class Market {

    constructor(opts = {}) {
    	this.nodeAddress = opts.nodeAddress;
    	this.client = new CasperClient(opts.nodeAddress);

    	this.nftContract = new Contracts.Contract(this.client);
    	this.nftContract.setContractHash(opts.nftContractHash, opts.nftContractPackageHash);

    	this.marketContract = new Contracts.Contract(this.client);
    	this.marketContract.setContractHash(opts.marketContractHash, opts.marketContractPackageHash);

		this.nftContractEvents = new NFTContractEvents({
		    contractPackageHash: opts.nftContractPackageHash,
		    eventStreamAddress: opts.eventStreamAddress,
		    contract: this.nftContract
		});

		this.marketContractEvents = new MarketContractEvents({
		    contractPackageHash: opts.marketContractPackageHash,
		    nftContractPackageHash: opts.nftContractPackageHash,
		    nftContractHash: opts.nftContractHash,
		    eventStreamAddress: opts.eventStreamAddress,
		    contract: this.marketContract
		});
    };

    async sendDeploy(signedJSON) {
        let signedDeploy = DeployUtil.deployFromJson(signedJSON).unwrap(); //Unwrap from JSON to Deploy object
        const response = await signedDeploy.send(this.nodeAddress).catch((error) => {
        	throw Error(error);
        });
        return response;
    };

    async getDeploy(hash) {
    	const response = await this.client.getDeploy(hash).catch((error) => {
            throw(error);
        });
        return response;
    }

	//TODO: ensure unique ids
    async getMintId() {
		const supply = await this.nftContract.queryContractData(['total_supply']);
		return parseInt(supply) + 1;
    }

    async getAccountBalance(publicKeyHash) {
        const publicKey = CLPublicKey.fromHex(publicKeyHash);
        const response = await this.client.balanceOfByPublicKey(publicKey).catch((error) => {
            throw(error);
        })
        return response.toNumber();
    }

}

module.exports = Market