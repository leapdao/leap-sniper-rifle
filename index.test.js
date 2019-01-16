import chai, { expect, assert } from 'chai';
import sinonChai from 'sinon-chai';
import sinon from 'sinon';
import { it, describe, afterEach } from 'mocha';
import ExitManager from './src/index';
import Db from './src/db';
const leap = require('leap-core');

chai.use(sinonChai);
const alice = "0x83B3525e17F9eAA92dAE3f9924cc333c94C7E98a";
const alicePriv = "0xbd54b17c48ac1fc91d5ef2ef02e9911337f8758e93c801b619e5d178094486cc";
const exitHandler = "0x791186143a8fe5f0287f0DC35df3A71354f607b6";


describe('Exit Manager', () => {

  it('allow to get response', async () => {

    const deposit = leap.Tx.deposit(0, 100, alice);
    let transfer = leap.Tx.transfer(
      [new leap.Input(new leap.Outpoint(deposit.hash(), 0))],
      [new leap.Output(50, exitHandler), new leap.Output(50, alice)]
    );
    transfer = transfer.sign([alicePriv]);

    const block = new leap.Block(33);
    block.addTx(deposit).addTx(transfer);

    const prevPeriodRoot = "0x32C220482C68413FBF8290E3B1E49B0A85901CFCD62AB0738761568A2A6E8A57";
    const period = new leap.Period(prevPeriodRoot, [block]);

    const transferProof = period.proof(transfer);
    const depositProof = period.proof(deposit);

    const outputIndex = 0;
    const inputIndex = 0;

    const sellPrice = 49;
    const utxoId = (new leap.Outpoint(transfer.hash(), 0)).getUtxoId();

    const signedData = leap.Exit.signOverExit(utxoId, sellPrice, alicePriv);
    const signedDataBytes32 = leap.Exit.bufferToBytes32Array(signedData);

    const manager = new ExitManager();
    const rsp = await manager.sellExit(depositProof, transferProof, inputIndex, outputIndex, signedDataBytes32);
  });
});

const sdb = {
  getAttributes() {},
  putAttributes() {},
};

const web3 = {
  eth: {
    getBlockNumber() {},
    sendRawTransaction() {},
  },
  plasma: {
    getUnspent() {},
}};

describe('Sniper Rifle', () => {

  it('handle chain progressed', async () => {
    const heightBefore = 100;
    sinon.stub(sdb, 'getAttributes').yields(null, { Attributes: [
      { Name: 'lastBlock', Value: heightBefore.toString() },
    ] });
    sinon.stub(sdb, 'putAttributes').yields(null, {});

    const heightAfter = 110;
    sinon.stub(web3.eth, 'getBlockNumber').yields(null, heightAfter);

    const manager = new ExitManager(null, new Db(sdb), 'testnet', web3);
    await manager.sniperRifle();

    expect(sdb.putAttributes).calledWith({
      Attributes: [{ Name: 'lastBlock', Replace: true, Value: heightAfter.toString() }],
      DomainName: sinon.match.any,
      ItemName: 'testnet',
    });
  });

  it('handle chain didn\'t progress', async () => {
    const heightBefore = 100;
    sinon.stub(sdb, 'getAttributes').yields(null, { Attributes: [
      { Name: 'lastBlock', Value: heightBefore.toString() },
    ] });
    sinon.stub(sdb, 'putAttributes').yields(null, {});

    const heightAfter = 100;
    sinon.stub(web3.eth, 'getBlockNumber').yields(null, heightAfter);

    const unspent = {
      outpoint: new leap.Outpoint('0x0098c4777c8897fad3ad2ec3cf89b2d8b8aeab1052b857348f9861e1a97bf9ad', 0),
      output: {
        address:'0x6cb117a635dc7633b42089c607fdfc5c60b7d679',
        value: 1000000000000000000,
        'color': 0
      }
    };

    const txHash = '0x1234';
    sinon.stub(web3.plasma, 'getUnspent').yields(null, [unspent]);
    sinon.stub(web3.eth, 'sendRawTransaction').yields(null, txHash);

    const priv = '0xbd54b17c48ac1fc91d5ef2ef02e9911337f8758e93c801b619e5d178094486cc';
    const manager = new ExitManager(priv, new Db(sdb), 'testnet', web3);
    const rsp = await manager.sniperRifle();
    assert.equal(rsp, txHash);
    sinon.assert.called(web3.eth.sendRawTransaction);
  });

  afterEach(() => {
    if (sdb.getAttributes.restore) sdb.getAttributes.restore();
    if (sdb.putAttributes.restore) sdb.putAttributes.restore();    
    if (web3.eth.getBlockNumber.restore) web3.eth.getBlockNumber.restore();
  });
});