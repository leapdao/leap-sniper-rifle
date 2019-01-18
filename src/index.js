import { Tx } from 'leap-core';
import ethUtil from 'ethereumjs-util';


function getBlockNumber(web3) {
  return new Promise((fulfill, reject) => {
    web3.eth.getBlockNumber((err, number) => {
      if (err) {
        reject(`Error: ${err.toString()}`);
        return;
      }
      fulfill(number);
    });
  });
}

function sendTx(web3, tx) {
  return new Promise((fulfill, reject) => {
    web3.eth.sendRawTransaction(tx, (err, txHash) => {
      if (err) {
        reject(`Error: ${err.toString()}`);
        return;
      }
      fulfill(txHash);
    });
  });
}

function getUnspent(web3, rifleAddr) {
  return new Promise((fulfill, reject) => {
    web3.getUnspent(rifleAddr, (err, unspent) => {
      if (err) {
        reject(`Error: ${err.toString()}`);
        return;
      }
      fulfill(unspent);
    });
  });
}

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
