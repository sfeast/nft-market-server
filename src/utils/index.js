const sleep = (ms) => {
    return new Promise((resolve) => setTimeout(resolve, ms));
};

const fromMotes = amt => {
    return amt / 1000000000;
};

const toMotes = amt => {
    return amt * 1000000000;
};

exports.sleep = sleep;
exports.fromMotes = fromMotes;
exports.toMotes = toMotes;