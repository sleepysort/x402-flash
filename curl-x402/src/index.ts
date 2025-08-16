import readline from 'readline';
import commandLineArgs from 'command-line-args'
import { privateKeyToAccount } from "viem/accounts";
import { wrapFetchWithPayment, decodeXPaymentResponse } from "x402-fetch";

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const args = commandLineArgs([
  { name: 'key', alias: 'k', type: String },
  { name: 'url', type: String },
]);

const account = privateKeyToAccount(args.key);
const fetchWithPayment = wrapFetchWithPayment(fetch, account);

const response = await fetchWithPayment(args.url, { method: "GET" })
const body = await response.text();
console.log(body);

const paymentResponse = decodeXPaymentResponse(response.headers.get("x-payment-response")!);
console.log(paymentResponse);

await new Promise(resolve => rl.question("Press any key to exit...", ans => {
  rl.close();
  resolve(ans);
}));