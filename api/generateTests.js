const yaml = require("js-yaml");
const fs = require("fs");
const { exit } = require("process");

const apiDocPath = process.argv[2];

if (!apiDocPath || !fs.existsSync(apiDocPath)) {
    console.log(`Please supply a valid path parameter for the openAPI document yaml`);
    console.log(` -> invalid path: ${apiDocPath}`);
    exit(1);
}

const doc = yaml.load(fs.readFileSync(apiDocPath, "utf8"));
const host = doc.servers[0].url;

for (const path in doc.paths) {

    const operations = doc.paths[path];
    for (const method in operations) {
        const operation = operations[method];
        const operationId = operation.operationId || "";
        const tags = operation.tags || [];
        const parameters = operation.parameters || [];
        const requestBody = operation.requestBody || {};
        const responses = operation.responses || {};

        // Create a write stream to the output file
        const stream = fs.createWriteStream(`${operationId}.spec.ts`, { flags: "a" });

        writeToFile(stream, `import { APIGatewayProxyResult } from "aws-lambda";`);
        writeToFile(stream, `import jestOpenAPI from "jest-openapi";`);
        writeToFile(stream, `import request from "supertest";`);
        writeToFile(stream, `import path from "path";`);
        writeToFile(stream, ``);
        writeToFile(stream, `const openApiDocs = path.resolve(__dirname, "${apiDocPath}");`);
        writeToFile(stream, `jestOpenAPI(openApiDocs);`);

        writeToFile(stream, ``);
        writeToFile(stream, `describe("${method.toUpperCase()} ${path} - ${operationId}", () => {`);
        writeToFile(stream, ``);

        console.log(`Generating requests for ${method} ${path}`);
        for (const responseCode in responses) {
            if (responseCode === "default") {
                continue;
            }
            console.log(` -> ${responseCode}`);
            const response = responses[responseCode];
            const responseDescription = ` - ${response.description}` || "";
            const schema = determineSchema(response);
            writeToFile(stream, ` describe("${responseCode}${responseDescription}", () => {`);
            writeToFile(stream, ``);
            writeToFile(stream, ` let result: APIGatewayProxyResult;`);
            writeToFile(stream, ` const expectedResponse = { };`);
            writeToFile(stream, ``);
            writeToFile(stream, ` beforeAll(async () => {`);
            writeToFile(stream, ` result = await request("${host}")`);
            writeToFile(stream, ` .${method}("${path}")`);
            writeToFile(stream, ` });`);
            writeToFile(stream, ``);
            writeToFile(stream, ` it("returns with status code ${responseCode}", () => {`);
            writeToFile(stream, ` expect(result.statusCode).toEqual(${responseCode});`);
            writeToFile(stream, ` });`);
            writeToFile(stream, ``);
            writeToFile(stream, ` it("returns the expected body", () => {`);
            writeToFile(stream, ` expect(result.body).toEqual(expectedResponse);`);
            writeToFile(stream, ` });`);
            writeToFile(stream, ``);
            writeToFile(stream, ` it("matches OpenAPI spec", () => {`);
            writeToFile(stream, ` expect(result).toSatisfyApiSpec();`);
            if (schema[0] == "array") {
                writeToFile(stream, ` for (const object of result.body) {`);
                writeToFile(stream, ` expect(object).toSatisfySchemaInApiSpec("${schema[1]}");`);
                writeToFile(stream, ` }`);
            } else {
                writeToFile(stream, ` expect(result.body).toSatisfySchemaInApiSpec("${schema[1]}");`);
            }
            writeToFile(stream, ` });`);
            writeToFile(stream, ``);
            writeToFile(stream, ` });`);
            writeToFile(stream, ``);
        }
        writeToFile(stream, `});`);

        console.log(` -> Successfully created tests ${operationId}.spec.ts`);
    }
}

function determineSchema(response) {
    try {
        // is schema object
        if (response.content) {
            const ref = Object.entries(response.content)[0][1].schema["$ref"];
            return ref.split("/").pop();
        }
        // is response object
        if (response["$ref"]) {
            const ref = response["$ref"];
            const responseName = ref.split("/").pop();
            const responseContent = Object.entries(doc.components.responses[responseName].content)[0][1];

            if (responseContent.schema["$ref"]) {
                return ["ref", responseContent.schema["$ref"].split("/").pop()];
            }
            if (responseContent.schema["type"] == "array") {
                return ["array", responseContent.schema["items"]["$ref"].split("/").pop()];
            }
            if (responseContent.schema["type"] == "object") {
                console.log(" └-> Found object response type; doing the best I can to determine the appropriate schema");
                return ["object", JSON.stringify(responseContent.schema["properties"]).split("schemas/").pop().split("\"")[0]];
            }
        }
        throw new Error(` └-> Unable to determine schema from ${JSON.stringify(response)}; setting unknown`);
    }
    catch (e) {
        console.log(e.message.toString());
        return ["unknown", "unknown"];
    }
}

function writeToFile(stream, line) {
    stream.write(line + "\n");
}