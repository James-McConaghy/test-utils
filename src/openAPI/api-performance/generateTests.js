const yaml = require("js-yaml");
const fs = require("fs");
const { exit } = require("process");
const { readArgs } = require("../../utils/readArgs");

const args = readArgs();

if (!args.apiDocPath || !fs.existsSync(args.apiDocPath)) {
    console.log(`Please supply a valid path parameter for the openAPI document yaml`);
    console.log(` -> invalid path: ${args.apiDocPath}`);
    exit(1);
}
const doc = yaml.load(fs.readFileSync(args.apiDocPath, "utf8"));
const desiredMethods = (args.method) ?  [args.method] : ["get", "post", "put", "delete"]
const host = doc.servers[0].url;

for (const path in doc.paths) {

    const operations = doc.paths[path];
    for (const method in operations) {
        
        if (!desiredMethods.includes(method)) {
            continue;
        }

        const operation = operations[method];
        const operationId = operation.operationId || "";
        const tags = operation.tags || [];
        const parameters = operation.parameters || [];
        const requestBody = operation.requestBody || {};
        const responses = operation.responses || {};

        fs.readFile(`${__dirname}/templates/discretePerformanceTest.js`, "utf-8", function (err, contents) {
            if (err) {
              console.log(err);
              return;
            }

            const statusCodes = Object.keys(responses).filter(r => parseInt(r))
            const trends = statusCodes.map(status => {
                return `const http_req_duration_${status} = new Trend("http_req_duration_${status}", true)`
            })
            const thresholds = statusCodes.map(status => {
                return `"http_req_duration_${status}": ["p(90)<1000", "p(95)<2000", "p(100)<3000"],`
            })      
            const cases = statusCodes.map(status => {
                return `case ${status}:\n\t\thttp_req_duration_${status}.add(result.timings.duration)\n\t\tbreak;`
            })
            const pathParams = parameters.filter(p => p.in === "path").map(p => { return p.name })

            const discreteData = pathParams.map(p => {
                return `const ${p} = randomItem(["${p}_1", "${p}_2"]);`
            })
            const diverseData = pathParams.map(p => {
                return `const ${p} = randomItem(["${p}_1", "${p}_2", null, undefined, "invalid", 4]);`
            })

            const replaced = contents
                .replace(/\$THRESHOLDS/g, thresholds.join("\n\t\t"))
                .replace(/\$RESPONSES/g, statusCodes.toString())
                .replace(/\$TRENDS/g, trends.join("\n"))
                .replace(/\$PATH/g, path.replace(/{/g, "${"))
                .replace(/\$DISCRETE_DATA/g, discreteData.join(","))
                .replace(/\$DIVERSE_DATA/g, diverseData.join(","))
                .replace(/\$PARAMS/g, pathParams.join(","))
                .replace(/\$METHOD/g, method)
                .replace(/\$CASE/g, cases.join("\n\t"))
                .replace(/\$HOST/g, host)
                .replace(/\n\n\n/g, "\n");

            fs.writeFile(`./${operationId}.js`, replaced, "utf-8", function (err) {
                if (err) {
                    console.log(err);
                    return;
                }
            });

        })
    }
}
