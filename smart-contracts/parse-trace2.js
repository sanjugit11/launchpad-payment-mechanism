const fs = require('fs');
const execSync = require('child_process').execSync;

const out = execSync(`curl -s -X POST -H "Content-Type: application/json" -d '{"jsonrpc":"2.0","method":"debug_traceTransaction","params":["0x2c328523ccec942dd120264266299bd49e575ebc7dceaa0d60358a61d70b7cee", {"tracer": "callTracer", "tracerConfig": {"withLog": true}}],"id":1}' https://rpc.hoodi.ethpandaops.io`).toString();

const json = JSON.parse(out);

function printCall(call, indent = "") {
    let revertInfo = call.error ? ` -> REVERT: ${call.error}` : "";
    console.log(`${indent}${call.type} ${call.to} (gas: ${call.gas}, value: ${call.value})${revertInfo}`);
    if (call.error && call.output && call.output !== "0x") {
        console.log(`${indent}  Revert Data: ${call.output}`);
    }
    if (call.calls) {
        for (const sub of call.calls) {
            printCall(sub, indent + "  ");
        }
    }
}

printCall(json.result);
