function readArgs() {
    return process.argv
        .slice(2)
        .filter(arg => arg.startsWith("--"))
        .map(arg => arg.split('='))
        .reduce((args, [value, key]) => {
            args[value.substring(2)] = key;
            return args;
        }, {});
}

module.exports = { readArgs }