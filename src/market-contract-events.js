const admin = require("firebase-admin");
const db = admin.database();
const { Contracts, EventStream, EventName } = require('casper-js-sdk');
const EventParser = require('./utils/events.js');
const { fromMotes, sleep, constructFBId } = require('./utils/index.js');

const ListingCreated = "market_listing_created";
const ListingCanceled = "market_listing_canceled";
const ListingPurchased = "market_listing_purchased";
const OfferCreated = "market_offer_created";
const OfferWithdraw = "market_offer_withdraw";
const OfferAccepted = "market_offer_accepted";

class MarketContractEvents {

    constructor(opts = {}) {
        this.contract = opts.contract;

        this.nftContractPackageHash = opts.nftContractPackageHash.replace('hash-','');
        this.nftContractHash = opts.nftContractHash;

        this.eventParser = new EventParser({
            eventStreamAddress: opts.eventStreamAddress,
            contractPackageHash: opts.contractPackageHash,
            eventNames: [
                ListingCreated,
                ListingPurchased,
                ListingCanceled,
                OfferCreated,
                OfferWithdraw,
                OfferAccepted
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
            token_contract: this.getNFTPackageHash(eventData.get('token_contract')),
            token_id: eventData.get('token_id'),
            price: fromMotes(eventData.get('price')),
            seller: eventData.get('seller')?.replace("Key::Account(", '').replace(')', ''),
            buyer: eventData.get('buyer')?.replace("Key::Account(", '').replace(')', '')
        };

        switch (event.name) {
            case ListingCreated: this.listingCreated(item);
            break;
            case ListingPurchased: this.listingPurchased(item);
            break;
            case ListingCanceled: this.listingCanceled(item);
            break;
            case OfferCreated: this.offerCreated(item);
            break;
            case OfferWithdraw: this.offerWithdraw(item);
            break;
            case OfferAccepted: this.offerAccepted(item);
            break;
            default: break;
        }
    }

    async listingCreated(event) {
        try {
            const fbId = this.constructFBId(event);

            await db.ref('nfts').child(fbId).update({
                listing: {
                    price: event.price,
                    timestamp: event.timestamp
                }
            });
            this.updateActivity(event);
        } catch (e) {
            console.log(e);
        }
    }

    async listingCanceled(event) {
        try {
            const fbId = this.constructFBId(event);

            await db.ref('nfts').child(fbId).update({
                listing: null
            });
            // modify deploy hash to avoid being overwritten by transfer event (happens on offerAccepted)
            this.updateActivity({...event, ...{deploy_hash: `${event.deploy_hash}_listing_canceled`}});
        } catch (e) {
            console.log(e);
        }
    }

    async listingPurchased(event) {
        try {
            const fbId = this.constructFBId(event);

            await db.ref('nfts').child(fbId).update({
                owner: event.buyer,
                listing: null
            });
            // modify deploy hash to avoid being overwritten by transfer event
            this.updateActivity({...event, ...{deploy_hash: `${event.deploy_hash}_purchase`}});
        } catch (e) {
            console.log(e);
        }
    }

    async offerCreated(event) {
        try {
            const fbId = this.constructFBId(event);

            await db.ref('nfts').child(fbId).child('offers').child(event.buyer).update({
                price: event.price,
                timestamp: event.timestamp
            });
            this.updateActivity(event);
        } catch (e) {
            console.log(e);
        }
    }

    async offerWithdraw(event) {
        try {
            const fbId = this.constructFBId(event);

            await db.ref('nfts').child(fbId).child('offers').child(event.buyer).remove();
            this.updateActivity(event);
        } catch (e) {
            console.log(e);
        }
    }

    async offerAccepted(event) {
        try {
            const fbId = this.constructFBId(event);

            await db.ref('nfts').child(fbId).update({
                owner: event.buyer,
                offers: null,
                listing: null
            });
            // modify deploy hash to avoid being overwritten by transfer event
            this.updateActivity({...event, ...{deploy_hash: `${event.deploy_hash}_offer_accepted`}});
        } catch (e) {
            console.log(e);
        }
    }

    async updateActivity(event) {
        const fbId = this.constructFBId(event);

        // should only allow writing new events, never updating - set in firebase rules (not urgent since data is "static")
        await db.ref('nfts').child(fbId).child('activity').child(event.deploy_hash).set({
            event_type: event.event_type,
            deploy_hash: event.deploy_hash,
            timestamp: event.timestamp,
            seller: event.seller || null,
            buyer: event.buyer || null,
            price: event.price || null
        });
    }

    constructFBId(event) {
        return constructFBId(event.token_contract, event.token_id);
    }

    // NFT contract events only provide the package hash which we use as part of their index in our DB
    getNFTPackageHash(contractHash) {
        // TODO: query network for contract's package hash, requires custom implementation though
        return (this.nftContractHash === contractHash.replace('contract','hash')) ? this.nftContractPackageHash : '???';
    }

}

module.exports = MarketContractEvents