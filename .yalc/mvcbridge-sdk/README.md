## mvcbridge-sdk@1.0.8

### Usage

This is the sdk for sending request to mvcbridge, follow these steps to transform your asset through mvcbridge.

1. Build and send on-chain transaction using your own wallet client instance(ie. metalet, metamask). Save the transaction hash.
2. Use this sdk to generate a transfer request and sign the request content.
3. Send the signed request to mvcbridge server.

### Example

you can refer to test/sdk-test.ts for a demo.

```typescript
import {MvcBridgeSdk} from 'mvcbridge-sdk';
import {OrderApi} from "./api";

// 1. Build and send on-chain transaction using your own wallet client instance(ie. metalet, metamask). Save the transaction hash.
// todo: build and send on-chain transaction(ie. metalet, metamask)

// 2. Use this sdk to generate a transfer request and sign the request content.
// change this for prod env
const basePath = BASE_PATH;
// read wif from env
const wif = process.env.WIF;

const orderApi = new OrderApi(undefined, basePath);
// leaving signature empty for now
const registerRequest: OrderRegisterRequest = {
    // token amount
    amount: "100000",
    // your source address
    fromAddress: "0x0e7d22a52bab804d8509b06e2d982cddff7d5e8f",
    fromChain: "eth",
    fromTokenName: "usdt",
    // this is your target address
    toAddress: "mvMPwt1318WxF8gRFT3wGQ7XJuENF97dyF",
    toChain: "mvc",
    toTokenName: "usdt",
    // the txid from previous transaction
    txid: "0xdca3acde1db3254789493e4e5341471b32cb3407b3ca30daa3c634e87d1518f5"
}
// assemble the message
const message = SignatureHelper.getSigningMessageFromOrder(registerRequest);
console.log(message)
// sign the message
// if your source chain is eth (ie using metamask), please sign the message using personal_sign
// don't forget the prefix
// const signature = SIGNATURE_FROM_ETH_WALLET;
// https://docs.metamask.io/guide/signing-data.html
// if your source chain is mvc (ie using metalet), you can use this sdk to sign the message
// set the signature
const signature = SignatureHelper.signMessageBitcoin(message, wif, "testnet");
console.log(signature);
registerRequest.signature = signature;

// call the api
orderApi.orderRegisterPost(registerRequest).then((response) => {
    console.log(response);
}).catch((error) => {
    // ignore
});
```


### Openapi generator
This generator creates TypeScript/JavaScript client that utilizes [axios](https://github.com/axios/axios). The generated Node module can be used in the following environments:

Environment
* Node.js
* Webpack
* Browserify

Language level
* ES5 - you must have a Promises/A+ library installed
* ES6

Module system
* CommonJS
* ES6 module system

It can be used in both TypeScript and JavaScript. In TypeScript, the definition should be automatically resolved via `package.json`. ([Reference](http://www.typescriptlang.org/docs/handbook/typings-for-npm-packages.html))

### Building

To build and compile the typescript sources to javascript use:
```
npm install
npm run build
```

### Publishing

First build the package then run ```npm publish```

### Consuming

navigate to the folder of your consuming project and run one of the following commands.

_published:_

```
npm install mvcbridge-sdk@1.0.0 --save
```

_unPublished (not recommended):_

```
npm install PATH_TO_GENERATED_PACKAGE --save
