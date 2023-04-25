import http from "k6/http";
import { Trend } from "k6/metrics";
import { randomItem } from "https://jslib.k6.io/k6-utils/1.1.0/index.js";

$TRENDS

http.setResponseCallback(http.expectedStatuses($RESPONSES));

export let options = {
    scenarios: {
        requests: {
            exec: "request",
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
        http_req_failed: ["rate<=0"], // no unexpected response codes should occur ouside of expectedStatuses(200, 404).
        http_req_duration: ["p(90)<1000", "p(95)<2000", "p(100)<3000"], // 90% of requests should be below 1000ms; 95% below 2000ms; ..
        $THRESHOLDS
    },
};



const headers = {
    headers: {
        "x-api-key": `${__ENV.API_SECRET}`,
    },
};

export function request() {
    const param = randomItem(["1", "a"]);
    const result = http.get(
        `$HOST$PATH`,
        headers
    );

    switch(result.status) {
    $CASE
    }
}