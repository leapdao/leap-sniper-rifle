import { Tx } from 'leap-core';
import ethUtil from 'ethereumjs-util';

const handleResponse = (fulfill, reject) => (err, value) => {
  if (err) {
    reject(`Error: ${err.toString()}`);
    return;
  }
  fulfill(value);
};

const getBlockNumber = web3 =>
  new Promise((fulfill, reject) =>
    web3.eth.getBlockNumber(handleResponse(fulfill, reject)));

const sendTx = (web3, tx) =>
  new Promise((fulfill, reject) =>
    web3.eth.sendRawTransaction(tx, handleResponse(fulfill, reject)));

const getUnspent = (web3, rifleAddr) =>
  new Promise((fulfill, reject) =>
    web3.getUnspent(rifleAddr, handleResponse(fulfill, reject)));

function makeTransferUxto(utxos, privKey) {
  const fromAddr = utxos[0].output.address.toLowerCase();
  const value = utxos.reduce((sum, unspent) => sum + unspent.output.value, 0);
  const color = utxos[0].output.color;

  return Tx.transferFromUtxos(utxos, fromAddr, fromAddr, value, color).signAll(privKey);
}


class SniperRifle {
  constructor(riflePriv, db, networkName, web3) {
    this.db = db;
    this.networkName = networkName;
    this.web3 = web3;
    if (riflePriv) {
      this.riflePriv = riflePriv;
      const priv = ethUtil.toBuffer(riflePriv);
      this.rifleAddr = ethUtil.bufferToHex(ethUtil.privateToAddress(priv));
    }
  }

  async sniperRifle() {
    // read block height from DB
    const lastHeight = await this.db.getHeight(this.networkName);
    // read block height from Plasma chain
    const chainHeight = await getBlockNumber(this.web3);
    // if nothing happened, spend a UTXO
    let rv;
    if (lastHeight.lastBlock === chainHeight) {
      // fire the rifle:
        // get utxo from rifleAddr
      const unspent = await getUnspent(this.web3, this.rifleAddr);
        // create tx spending utxo to same address, and sign it
      const tx = makeTransferUxto([unspent[0]], this.riflePriv);
        // send that shit
      rv = await sendTx(this.web3, tx.toRaw());
    } else {
      // update db height
      await this.db.updateHeight(this.networkName, chainHeight);
    }
    return rv;
  }

}

export default SniperRifle;
