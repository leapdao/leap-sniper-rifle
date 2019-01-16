import AWS from 'aws-sdk';
import Web3 from 'web3';
import { helpers } from 'leap-core';
import Db from './src/db';
import ExitManager from './src/index';

const simpledb = new AWS.SimpleDB();

exports.handler = function handler(event, context, callback) {
  context.callbackWaitsForEmptyEventLoop = true;
  const path = event.context['resource-path'];
  const method = event.context['http-method'];

  const providerUrl = process.env.PROVIDER_URL;
  const riflePriv = process.env.RIFLE_PRIV;
  const tableName = process.env.SDB_DOMAIN;
  const networkName = process.env.NETWORK_NAME;

  const web3 = helpers.extendWeb3(new Web3(new Web3.providers.HttpProvider(providerUrl)));
  const sdb = new Db(simpledb, tableName);

  const manager = new ExitManager(riflePriv, sdb, networkName, web3);
  const requestHandler = () => {
    if (path.indexOf('sellExit') > -1) {
      return manager.sellExit(
        event.inputProof, 
        event.transferProof,
        event.outputIndex,
        event.inputIndex,
        event.signedData,
      );
    } else if (path.indexOf('test') > -1) {
      if (method === 'GET') {
        return Promise.resolve(`called path: ${path}`);
      }
    } else if (path.indexOf('rifle') > -1) {
      if (method === 'GET') {
        return manager.sniperRifle();
      }
    }

    return Promise.reject(`Not Found: unexpected path: ${path}`);
  };

  try {
    requestHandler().then(data => {
        callback(null, data);
      }).catch(err => {
        callback(err);
      });
  } catch (err) {
    callback(err);
  }
};
