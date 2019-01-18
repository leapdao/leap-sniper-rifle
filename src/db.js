/**
 * Copyright (c) 2018-present, Leap DAO (leapdao.org)
 *
 * This source code is licensed under the GNU Affero General Public License,
 * version 3, found in the LICENSE file in the root directory of this source
 * tree.
 */

function Db(sdb, tableName) {
  this.sdb = sdb;
  this.domain = tableName;
}

Db.prototype.getHeight = function getHeight(networkName) {
  return new Promise((fulfill, reject) => {
    this.sdb.getAttributes({
      DomainName: this.domain,
      ItemName: networkName,
    }, (err, data) => {
      if (err) {
        reject(`Error: ${err.toString()}`);
        return;
      }
      if (!data || !data.Attributes) {
        reject(`Error: entry ${networkName} not found.`);
        return;
      }
      const rv = {
        lastBlock: 0,
      };
      data.Attributes.forEach((aPair) => {
        if (aPair.Name === 'lastBlock') {
          rv.lastBlock = parseInt(aPair.Value, 10);
        }
      });
      fulfill(rv);
    });
  });
};

Db.prototype.updateHeight = function updateHeight(networkName, blockNumber) {
  return new Promise((fulfill, reject) => {
    this.sdb.putAttributes({
      DomainName: this.domain,
      ItemName: networkName,
      Attributes: [{
        Name: 'lastBlock',
        Replace: true,
        Value: blockNumber.toString(),
      }],
    }, (err, data) => {
      if (err) {
        reject(`Error: ${err.toString}`);
        return;
      }
      fulfill(data);
    });
  });
};

module.exports = Db;
