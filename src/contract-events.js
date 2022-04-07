const admin = require("firebase-admin");
const db = admin.database();
const fetch = require('node-fetch');
const { Contracts, EventStream, EventName, CLValueBuilder, CLValueParsers, CLTypeTag } = require('casper-js-sdk');
const { CEP47Events, CEP47EventParser } = require('casper-cep47-js-client');

class ContractEvents {

    constructor(opts = {}) {
        this.contractPackageHash = opts.contractPackageHash;
        this.eventStreamAddress = opts.eventStreamAddress;
        this.contract = opts.contract;

        this.parseEvents(this.contractPackageHash);
    }

    parseEvents(contractPackageHash) {
        const es = new EventStream(this.eventStreamAddress);

        es.subscribe(EventName.DeployProcessed, (event) => {

            const parsedEvents = /*CEP47EventParser*/ this.eventParser({
                contractPackageHash,
                eventNames: [
                    CEP47Events.MintOne,
                    CEP47Events.TransferToken,
                    CEP47Events.BurnOne,
                    CEP47Events.MetadataUpdate,
                    CEP47Events.ApproveToken
                ]
            }, event);

            if (parsedEvents && parsedEvents.success) {
                const event = parsedEvents.data[0];
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
                    case CEP47Events.TransferToken: //update owner in FB
                    break;
                    default: break;
                }
            }
        });

        es.start();
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

        await db.ref('nfts').child(fbId).child('activity').child(event.deploy_hash).update({
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

    eventParser({
            contractPackageHash,
            /* string */
            eventNames,
            /* CEP47Events[] */
        },
        value
    ) {
        if (value.body.DeployProcessed.execution_result.Success) {
            const { transforms } =
            value.body.DeployProcessed.execution_result.Success.effect;

            const cep47Events = transforms.reduce((acc, val) => {
                if (
                    val.transform.hasOwnProperty("WriteCLValue") &&
                    typeof val.transform.WriteCLValue.parsed === "object" &&
                    val.transform.WriteCLValue.parsed !== null
                ) {
                    const maybeCLValue = CLValueParsers.fromJSON(
                        val.transform.WriteCLValue
                    );
                    const clValue = maybeCLValue.unwrap();
                    if (clValue && clValue.clType().tag === CLTypeTag.Map) {
                        const hash = clValue.get(CLValueBuilder.string("contract_package_hash"));
                        const event = clValue.get(CLValueBuilder.string("event_type"));
                        if (
                            hash &&
                            // NOTE: Calling toLowerCase() because current JS-SDK doesn't support checksumed hashes and returns all lower case value
                            // Remove it after updating SDK
                            hash.value() === contractPackageHash.slice(5).toLowerCase() &&
                            event &&
                            eventNames.includes(event.value())
                        ) {
                            acc = [...acc, {
                                name: event.value(),
                                timestamp: value.body.DeployProcessed.timestamp,
                                deploy_hash: value.body.DeployProcessed.deploy_hash,
                                clValue 
                            }];
                        }
                    }
                }
                return acc;
            }, []);

            return { error: null, success: !!cep47Events.length, data: cep47Events };
        }

        return null;
    };


}

module.exports = ContractEvents