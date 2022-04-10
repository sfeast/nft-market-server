const admin = require("firebase-admin");
const db = admin.database();
const fetch = require('node-fetch');
const { Contracts } = require('casper-js-sdk');
const { CEP47Events } = require('casper-cep47-js-client');
const EventParser = require('./utils/events.js');

class NFTContractEvents {

    constructor(opts = {}) {
        this.contract = opts.contract;

        this.eventParser = new EventParser({
            eventStreamAddress: opts.eventStreamAddress,
            contractPackageHash: opts.contractPackageHash,
            eventNames: [
                CEP47Events.MintOne,
                CEP47Events.TransferToken,
                CEP47Events.BurnOne,
                CEP47Events.MetadataUpdate,
                CEP47Events.ApproveToken
            ],
            eventHandler: this.eventReceived.bind(this)
        });
    }

    eventReceived(event) {
        const eventData = Contracts.fromCLMap(event.clValue.data);
        const item = {
            event_type: eventData.get('event_type'),
            deploy_hash: event.deploy_hash,
            timestamp: event.timestamp,
            contract_package_hash: eventData.get('contract_package_hash'),
            token_id: eventData.get('token_id'),
            recipient: eventData.get('recipient')?.replace("Key::Account(", '').replace(')', '')
        };
        
        switch (event.name) {
            case CEP47Events.MintOne: this.minted(item);
            break;
            case CEP47Events.TransferToken:
            /*
                - update owner in FB
                - remove listing one is there (will do in market but if user transfers user -> user
                  then market won't know about it. Contract token alloawance is revoked by cep47 contract
                  but still don't wnat listing showing)
            */
            break;
            default: break;
        }

    }

    async minted(event) {
        try {
            const fbId = this.constructFBId(event);
            const metadataUri = (await this.getMetadataURI(event.token_id))?.get('token_uri');
            const metadata = await this.fetchIPFSData(metadataUri);

            await db.ref('nfts').child(fbId).update({
                contract_package_hash: event.contract_package_hash || null,
                token_id: event.token_id || null,
                owner: event.recipient || null, //TODO: check if this field will be different on transfer event & others (on burn event it's owner)
                token_uri: metadataUri,
                metadata
            });
            this.updateActivity(event);
        } catch (e) {
            console.log(e);
        }
    }

    async updateActivity(event) {
        const fbId = this.constructFBId(event);

        // should only allow writing new events, never updating - set in firebase rules (not urgent since data is static)
        await db.ref('nfts').child(fbId).child('activity').child(event.deploy_hash).set({
            event_type: event.event_type,
            deploy_hash: event.deploy_hash,
            timestamp: event.timestamp,
            owner: event.recipient || null, //TODO: check if this field will be different on transfer event.
        });
    }

    async getMetadataURI(token_id) {
        const result = await this.contract
            .queryContractDictionary('metadata', token_id);

        const maybeValue = result.value().unwrap().value();

        return Contracts.fromCLMap(maybeValue);
    }

    async fetchIPFSData(uri) {
        const response = await fetch(uri, {
            headers: {
                'Content-Type': 'application/json'
            }
        });
        return response.json()
    }

    constructFBId(event) {
        return `${event.contract_package_hash}?id=${event.token_id}`;
    }

}

module.exports = NFTContractEvents