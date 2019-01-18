## Dev

```
yarn
yarn test
```

## Deploy

**1)** run this:
  ```
  yarn package
  ```

**2)** Upload the generated `lambda.zip` to [AWS Lambda](https://eu-west-1.console.aws.amazon.com/lambda/home?region=eu-west-1#/functions/sniperRifle). The lambda functon should have the following parameters:
  - `RIFLE_PRIV - private key to sign rifle transactions, the address also needs funds`
  - `SDB_DOMAIN - name of SimpleDB table, currently leap_rifle`

**3)** Set up an [AWS cloudfront rule](https://eu-west-1.console.aws.amazon.com/cloudwatch/home?region=eu-west-1#rules:name=sniperRifleTestnet) for each network with the following parameters:
  - `networkName - unique string to be used in SimpleDB to store block height`
  - `providerUrl - Leap node RPC URL`

  Example Input `Constant: { "networkName": "testnet", "providerUrl": "http://node1.testnet.leapdao.org:8645" }`

**4)** Send some funds to address of `RIFLE_PRIV` on Plasma. These will be spent once the network has no activity between function invocations.