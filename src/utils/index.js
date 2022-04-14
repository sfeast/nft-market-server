const sleep = (ms) => {
    return new Promise((resolve) => setTimeout(resolve, ms));
};

const fromMotes = amt => {
    return amt / 1000000000;
};

const toMotes = amt => {
    return amt * 1000000000;
};

const constructFBId = (collection, id) => {
    // TODO: create a hash
    return `${collection}?id=${id}`;
}

exports.sleep = sleep;
exports.fromMotes = fromMotes;
exports.toMotes = toMotes;
exports.constructFBId = constructFBId;