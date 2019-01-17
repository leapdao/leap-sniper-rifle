import AWS from 'aws-sdk';
import Web3 from 'web3';
import { helpers } from 'leap-core';
import Db from './src/db';
import ExitManager from './src/index';

const simpledb = new AWS.SimpleDB();

exports.handler = function handler(event, context, callback) {
  context.callbackWaitsForEmptyEventLoop = true;

  const riflePriv = process.env.RIFLE_PRIV;
  const tableName = process.env.SDB_DOMAIN;
  console.log('providerUrl: ', event.providerUrl);
  console.log('networkName: ', event.networkName);

  const web3 = helpers.extendWeb3(new Web3(new Web3.providers.HttpProvider(event.providerUrl)));
  const sdb = new Db(simpledb, tableName);

  const manager = new ExitManager(riflePriv, sdb, event.networkName, web3);

  try {
    manager.sniperRifle().then(data => {
        callback(null, data);
      }).catch(err => {
        callback(err);
      });
  } catch (err) {
    callback(err);
  }
};
