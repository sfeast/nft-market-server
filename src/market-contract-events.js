const admin = require("firebase-admin");
const db = admin.database();
const { Contracts, EventStream, EventName } = require('casper-js-sdk');
const EventParser = require('./utils/events.js');
const { sleep } = require('./utils/index.js');

const ListingCreated = "market_listing_created";
const ListingPurchased = "market_listing_purchased";
const ListingCanceled = "market_listing_canceled";

class MarketContractEvents {

    constructor(opts = {}) {
        this.contract = opts.contract;

        this.eventParser = new EventParser({
            eventStreamAddress: opts.eventStreamAddress,
            contractPackageHash: opts.contractPackageHash,
            eventNames: [
                ListingCreated,
                ListingPurchased,
                ListingCanceled
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
            token_contract: eventData.get('token_contract'),
            token_id: eventData.get('token_id'),
            price: eventData.get('price'),
            seller: eventData.get('seller')?.replace("Key::Account(", '').replace(')', ''),
            buyer: eventData.get('buyer')?.replace("Key::Account(", '').replace(')', '')
        };

        switch (event.name) {
            case ListingCreated: this.listingCreated(item);
            break;
            case ListingPurchased: //update owner in FB (I think transfer can handle)
            break;
            case ListingCanceled:
            break;
            default: break;
        }
    }

    async listingCreated(event) {
        // try {
        //     const fbId = this.constructFBId(event);

        //     await db.ref('nfts').child(fbId).update({
        //     });
        //     this.updateActivity(event);
        // } catch (e) {
        //     console.log(e);
        // }
    }

    async updateActivity(event) {
        // const fbId = this.constructFBId(event);

        // should only allow writing new events, never updating - set in firebase rules (not urgent since data is static)
        // await db.ref('nfts').child(fbId).child('activity').child(event.deploy_hash).set({
        //     event_type: event.event_type,
        //     deploy_hash: event.deploy_hash,
        //     timestamp: event.timestamp,
        // });
    }

    constructFBId(event) {
        // event.token_contract is the nft contract hash
        // return `${event.token_contract}?id=${event.token_id}`;
    }

}

module.exports = MarketContractEvents