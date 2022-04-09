const { CLTypeTag, CLValueBuilder, CLValueParsers } = require('casper-js-sdk');

class EventParser {

    constructor(opts = {}) {
        this.contractPackageHash = opts.contractPackageHash;
        this.eventNames = opts.eventNames;
    }

    parse(value) {
        if (value.body.DeployProcessed.execution_result.Success) {
            const { transforms } =
            value.body.DeployProcessed.execution_result.Success.effect;

            const events = transforms.reduce((acc, val) => {
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
                            hash.value() === this.contractPackageHash.slice(5).toLowerCase() &&
                            event &&
                            this.eventNames.includes(event.value())
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

            return { error: null, success: !!events.length, data: events };
        }

        return null;
    };
};


module.exports = EventParser