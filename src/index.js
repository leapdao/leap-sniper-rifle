import { Tx } from 'leap-core';
import ethUtil from 'ethereumjs-util';
import { BadRequest, Unauthorized, Conflict, ServerError } from './errors';

function formatHostname(hostname, port) {
  return 'http://'+hostname+':'+port;
}

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
};

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
};

function getUnspent(web3, rifleAddr) {
  return new Promise((fulfill, reject) => {
    console.log('getUspent: ', rifleAddr);
    web3.getUnspent(rifleAddr, (err, unspent) => {
      if (err) {
        reject(`Error: ${err.toString()}`);
        return;
      }
      fulfill(unspent);
    });
  });
};

function unspentForAddress(unspent, address, color) {
  return Object.keys(unspent)
    .filter(
      k =>
        unspent[k] &&
        unspent[k].address.toLowerCase() === address.toLowerCase() &&
        (color !== undefined ? unspent[k].color === color : true)
    )
    .map(k => ({
      outpoint: k,
      output: unspent[k],
    }))
    .sort((a, b) => {
      return a.output.value - b.output.value;
    });
};

function makeTransferUxto(utxos, privKey) {
  console.log('utxos: ', utxos);
  let fromAddr = utxos[0].output.address.toLowerCase();
  const value = utxos.reduce((sum, unspent) => sum + unspent.output.value, 0);
  const color = utxos[0].output.color;
  console.log('utxos2: ', utxos);
  return Tx.transferFromUtxos(utxos, fromAddr, fromAddr, value, color).signAll(privKey);
}


class ExitManager {
  constructor(riflePriv, db, networkName, web3) {
    this.db = db;
    this.networkName = networkName;
    this.web3 = web3;
    if (riflePriv) {
      this.riflePriv = riflePriv;
      const priv = Buffer.from(riflePriv.replace('0x', ''), 'hex');
      this.rifleAddr = `0x${ethUtil.privateToAddress(priv).toString('hex')}`;
    }
  }

  async sellExit(inputProof, 
    transferProof,
    outputIndex,
    inputIndex,
    signedData) {

    return JSON.stringify({here: 'tex'});
  }

  async sniperRifle() {
    // read block height from DB
    const lastHeight = await this.db.getHeight(this.networkName);
    // read block height from Plasma chain
    const chainHeight = await getBlockNumber(this.web3);
    // if nothing happened, spend a UTXO   
    let rv;
    if (lastHeight.lastBlock == chainHeight) {
      // fire the rifle:
        // get utxo from rifleAddr
        const unspent = await getUnspent(this.web3, this.rifleAddr);
        console.log(unspent);
        // create tx spending utxo to same address, and sign it
        const tx = makeTransferUxto([unspent[0]], this.riflePriv);
        // send that shit
        rv = await sendTx(this.web3, tx.toRaw());
        console.log(rv);
    } else {
      // update db height
      await this.db.updateHeight(this.networkName, chainHeight);
    }
    return rv;
  }

}

export default ExitManager;
