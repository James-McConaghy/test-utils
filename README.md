# openAPI Tools

A suite of scripts to help generate tests from your openAPI docs.

- Generate api contract tests for `jest` & `supertest` based on your openAPI docs
- Generate api performance tests for `k6` based on your openAPI docs

*There are ofcourse some [limitations](#Limitations)*


## generateTests.js

This script will allow you to quickly generate tests for each path, method and response documented in your openAPI yaml file.

1. Execute the following from the project you wish to generate the tests for; ensuring to replace the paths to this repository and your openAPI document.

```bash
  npm install --save-dev 'jest-openapi'
  node <path-to-test-utils>/test-utils/src/openAPI/api-contract/generateTests.js --apiDocPath=<myproject>/docs/openAPI.yaml
  node <path-to-test-utils>/test-utils/src/openAPI/api-performance/generateTests.js --apiDocPath=<myproject>/docs/openAPI.yaml
```

2. Tests will get generated in the folder where the commands were executed.


## api-contract

#### Example Output

```javascript
describe("GET /packages/features/{instance_name} - Get a client's features", () => {

  describe("200 - successfully returned client's features", () => {

    let result: APIGatewayProxyResult;
    const expectedResponse = { };

    beforeAll(async () => {
      result = await request("https://packages.qa.bazaarvoice.com/v1")
        .get("/packages/features/{instance_name}")
    });

    it("returns with status code 200", () => {
      expect(result.statusCode).toEqual(200);
    });

    it("returns the expected body", () => {
      expect(result.body).toEqual(expectedResponse);
    });

    it("matches OpenAPI spec", () => {
      expect(result).toSatisfyApiSpec();
      for (const object of result.body) {
        expect(object).toSatisfySchemaInApiSpec("ClientFeature");
      }
    });

  });

});

```

## api-performance

#### Example Output

```javascript
import http from "k6/http";
import { Trend } from "k6/metrics";
import { randomItem } from "https://jslib.k6.io/k6-utils/1.1.0/index.js";

const http_req_duration_200 = new Trend("http_req_duration_200", true)
const http_req_duration_403 = new Trend("http_req_duration_403", true)
const http_req_duration_404 = new Trend("http_req_duration_404", true)
const http_req_duration_429 = new Trend("http_req_duration_429", true)

http.setResponseCallback(http.expectedStatuses(200,403,404,429));

export let options = {
    scenarios: {
        discrete: {
            exec: "discrete",
            executor: "ramping-arrival-rate",
            timeUnit: "1s",
            startRate: 0,
            preAllocatedVUs: 10,
            maxVUs: 60,
            stages: [
                { target: 0, duration: "0s" },
                { target: 20, duration: "20s" },
            ],
        },
        diverse: {
            exec: "diverse",
            executor: "ramping-arrival-rate",
            timeUnit: "1s",
            startRate: 0,
            preAllocatedVUs: 10,
            maxVUs: 60,
            stages: [
                { target: 0, duration: "0s" },
                { target: 20, duration: "20s" },
            ],
        },
    },
    discardResponseBodies: true,
    thresholds: {
        "http_req_failed": ["rate<=0"], // no unexpected response codes should occur ouside of expectedStatuses(200, 404).
        "http_req_duration": ["p(90)<1000", "p(95)<2000", "p(100)<3000"], // 90% of requests should be below 1000ms; 95% below 2000ms; ..
        "http_req_duration_200": ["p(90)<1000", "p(95)<2000", "p(100)<3000"],
        "http_req_duration_403": ["p(90)<1000", "p(95)<2000", "p(100)<3000"],
        "http_req_duration_404": ["p(90)<1000", "p(95)<2000", "p(100)<3000"],
        "http_req_duration_429": ["p(90)<1000", "p(95)<2000", "p(100)<3000"],
    },
};

export function discrete() {
    // ensure to only use data that results in successful requests
    const instanceName = randomItem(["instanceName_1", "instanceName_2"]);
    request(instanceName);
}
    
export function diverse() {
    // a variety of data should be used here
    const instanceName = randomItem(["instanceName_1", "instanceName_2", null, undefined, "invalid", 4]);
    request(instanceName);
}

const headers = {
    headers: {
        "x-api-key": `${__ENV.API_SECRET}`,
    },
};

export function request(instanceName) {
    const result = http.get(
        `https://accounts.qa.bazaarvoice.com/v1/accounts/${instanceName}/contacts`,
        headers
    );

    switch(result.status) {
    case 200:
		http_req_duration_200.add(result.timings.duration)
		break;
	case 403:
		http_req_duration_403.add(result.timings.duration)
		break;
	case 404:
		http_req_duration_404.add(result.timings.duration)
		break;
	case 429:
		http_req_duration_429.add(result.timings.duration)
		break;
    }
}
```

## Limitations

#### api-contract
* If no schema exists or it cannot be resolved, UKNOWN will be used
* It does not generate request body data

#### api-performance
* It does not generate request body data
* It does not care about response body, just response code
