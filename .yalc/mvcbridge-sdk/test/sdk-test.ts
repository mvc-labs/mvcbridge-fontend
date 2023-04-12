import {OrderApi, OrderRegisterRequest} from "../api";
import {BASE_PATH} from "../base";
import {SignatureHelper} from "../signature";

describe('mvcbridge-sdk-test', () => {
    it('should success', () => {
        // change this for prod env
        const basePath = BASE_PATH;
        // read wif from env
        const wif = process.env.WIF;

        console.assert(wif, "WIF is not set in env")

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
        console.log(registerRequest);

        // call the api
        orderApi.orderRegisterPost(registerRequest).then((response) => {
            console.log(response);
        }).catch(() => {
            // ignore
        });

    });
});