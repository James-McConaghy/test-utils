import http from "k6/http";
import { Trend } from "k6/metrics";
import { randomItem } from "https://jslib.k6.io/k6-utils/1.1.0/index.js";

$TRENDS

http.setResponseCallback(http.expectedStatuses($RESPONSES));

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
        "http_req_failed": ["rate<=0"], // no unexpected response codes should occur outside of expectedStatuses(200, 404).
        "http_req_duration": ["p(90)<1000", "p(95)<2000", "p(100)<3000"], // 90% of requests should be below 1000ms; 95% below 2000ms; ..
        $THRESHOLDS
    },
};

export function discrete() {
    // ensure to only use data that results in successful responses
    $DISCRETE_DATA
    request($PARAMS);
}
    
export function diverse() {
    // a variety of data should be used here that will result in diverse responses
    $DIVERSE_DATA
    request($PARAMS);
}

const headers = {
    headers: {
        "x-api-key": `${__ENV.API_SECRET}`,
    },
};

export function request($PARAMS) {
    const result = http.$METHOD(
        `$HOST$PATH`,
        headers
    );

    switch(result.status) {
    $CASE
    }
}
