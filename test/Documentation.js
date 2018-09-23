'user strict';

/**
 * @author Cyril Lapinte - <cyril.lapinte@mtpelerin.com>
 *
 * Copyright © 2016 - 2018 Mt Pelerin Group SA - All Rights Reserved
 * This content cannot be used, copied or reproduced in part or in whole
 * without the express and written permission of Mt Pelerin Group SA.
 * Written by *Mt Pelerin Group SA*, <info@mtpelerin.com>
 * All matters regarding the intellectual property of this code or software
 * are subjects to Swiss Law without reference to its conflicts of law rules.
 *
 */

const assertRevert = require('./helpers/assertRevert');
const Documentation = artifacts.require('../contracts/Documentation.sol');

contract('Documentation', function (accounts) {
  let documentation;

  beforeEach(async function () {
    documentation = await Documentation.new('http://repo.url');
  });

  it('should have a repositoryURL', async function () {
    const repositoryURL = await documentation.repositoryURL();
    assert.equal(repositoryURL, 'http://repo.url', 'repositoryURL');
  });

  it('should let update repositoryURL', async function () {
    const tx = await documentation.updateRepositoryURL('http://repo2.url');
    assert.equal(tx.receipt.status, '0x1', 'success');

    const repositoryURL = await documentation.repositoryURL();
    assert.equal(repositoryURL, 'http://repo2.url', 'repositoryURL');
  });

  it('should prevent update of repositoryURL from non owner', async function () {
    await assertRevert(documentation.updateRepositoryURL('toto', { from: accounts[1] }));
  });

  it('should have 0 documents for itself', async function () {
    const documentsCount = await documentation.documentsCount(documentation.address);
    assert.equal(documentsCount, 0, '0 documents');
  });

  it('should have no name for itself', async function () {
    const name = await documentation.documentName(documentation.address, 0);
    assert.equal(name, '', 'no name');
  });

  it('should have no hash for itself', async function () {
    const hash = await documentation.documentHash(documentation.address, 0);
    assert.equal(hash, '0x0000000000000000000000000000000000000000000000000000000000000000', 'no hash');
  });

  it('should have no version for document 0 and itself', async function () {
    const version = await documentation.documentVersion(documentation.address, 0);
    assert.equal(version, 0, 'no version');
  });

  it('should have no last update for document 0 and itself', async function () {
    const lastUpdate = await documentation.documentLastUpdate(documentation.address, 0);
    assert.equal(lastUpdate, 0, 'no last update');
  });

  it('should not be active for document 0 and itself', async function () {
    const active = await documentation.documentIsValid(documentation.address, 0);
    assert.ok(!active, 'not active');
  });

  it('should allow to add a document on itself', async function () {
    const tx = await documentation.addDocument(documentation.address, 'aName', '0x001');
    assert.equal(tx.receipt.status, '0x1', 'success');
    assert.equal(tx.logs.length, 1, '1 event');
    assert.equal(tx.logs[0].event, 'DocumentAdded');
    assert.equal(tx.logs[0].args._address, documentation.address, 'contract address');
    assert.equal(tx.logs[0].args.id, 0, 'id');
    assert.equal(tx.logs[0].args.name, 'aName', 'name');
    assert.equal(tx.logs[0].args.hash, '0x0010000000000000000000000000000000000000000000000000000000000000', 'hash');
  });

  it('should not allow to add a document on addresss 0', async function () {
    await assertRevert(documentation.addDocument(
      '0x0000000000000000000000000000000000000000000000000000000000000000',
      'aName',
      '0x001'));
  });

  it('should not allow to add a document with no names', async function () {
    await assertRevert(documentation.addDocument(
      documentation.address,
      '',
      '0x001'));
  });

  it('should not allow too add a document with no hashes', async function () {
    await assertRevert(documentation.addDocument(
      documentation.address,
      'aName',
      ''));
  });

  it('should not allow to add a document on itself by not owner', async function () {
    await assertRevert(documentation.addDocument(documentation.address, 'aName', 'aHash', { from: accounts[1] }));
  });

  it('should not let updating non existing document', async function () {
    await assertRevert(documentation.updateDocument(documentation.address, 0, 'aName', 'aHash'));
  });

  it('should not allow to invalidate non existing document', async function () {
    await assertRevert(documentation.invalidateDocument(documentation.address, 0));
  });

  describe('with three documents defined for two contracts', function () {
    let beforeAddDocuments, beforeUpdateDocument;

    beforeEach(async function () {
      beforeAddDocuments = Math.floor(new Date().getTime() / 1000);
      await documentation.addDocument(accounts[8], 'aName0', '0x00001');
      await documentation.addDocument(accounts[8], 'aName1', '0x00002');
      await documentation.addDocument(accounts[9], 'aName2', '0x00003');

      beforeUpdateDocument = Math.floor(new Date().getTime() / 1000);
      await documentation.updateDocument(accounts[8], 0, 'aName0Updated', '0x99990');
    });

    it('should have documents count for the two contracts', async function () {
      const countAccount8 = await documentation.documentsCount(accounts[8]);
      assert.equal(countAccount8, 2);
      const countAccount9 = await documentation.documentsCount(accounts[9]);
      assert.equal(countAccount9, 1);
    });

    it('should have a name for a new document', async function () {
      const name = await documentation.documentName(accounts[8], 1);
      assert.equal(name, 'aName1', 'name');
    });

    it('should have a name for a document updated', async function () {
      const name = await documentation.documentName(accounts[8], 0);
      assert.equal(name, 'aName0Updated', 'name');
    });

    it('should have a hash for a new document', async function () {
      const hash = await documentation.documentHash(accounts[8], 1);
      assert.equal(hash, '0x0000200000000000000000000000000000000000000000000000000000000000', 'hash');
    });

    it('should have a hash for a document updated', async function () {
      const hash = await documentation.documentHash(accounts[8], 0);
      assert.equal(hash, '0x9999000000000000000000000000000000000000000000000000000000000000', 'hash');
    });

    it('should have a version for a new document', async function () {
      const version = await documentation.documentVersion(accounts[8], 1);
      assert.equal(version, 0, 'version');
    });

    it('should have a version for a document updated', async function () {
      const version = await documentation.documentVersion(accounts[8], 0);
      assert.equal(version, 1, 'version');
    });

    it('should have last update for a new document', async function () {
      const lastUpdate = await documentation.documentLastUpdate(accounts[8], 1);
      assert.ok(lastUpdate >= beforeAddDocuments, 'last update');
    });

    it('should have last update for a document updated', async function () {
      const lastUpdate = await documentation.documentLastUpdate(accounts[8], 0);
      assert.ok(lastUpdate >= beforeUpdateDocument, 'last update');
    });

    it('should have new document valid', async function () {
      const valid = await documentation.documentIsValid(accounts[9], 0);
      assert.ok(valid, 'valid');
    });

    it('should allow update a document', async function () {
      const tx = await documentation.updateDocument(accounts[8], 1, 'aNameUpdated', '0x000001234');
      assert.equal(tx.receipt.status, '0x1', 'success');
      assert.equal(tx.logs.length, 1, '1 event');
      assert.equal(tx.logs[0].event, 'DocumentUpdated');
      assert.equal(tx.logs[0].args._address, accounts[8], 'contract address');
      assert.equal(tx.logs[0].args.id, 1, 'id');
      assert.equal(tx.logs[0].args.name, 'aNameUpdated', 'name');
      assert.equal(tx.logs[0].args.hash, '0x0000012340000000000000000000000000000000000000000000000000000000', 'hash');
      assert.equal(tx.logs[0].args.version, 1, 'version');
    });

    it('should prevent update a document from non owner', async function () {
      await assertRevert(documentation.updateDocument(accounts[8], 1, '', '', { from: accounts[1] }));
    });

    it('should allow invalidate a document', async function () {
      const tx = await documentation.invalidateDocument(accounts[9], 0);
      assert.equal(tx.receipt.status, '0x1', 'success');
      assert.equal(tx.logs.length, 1, '1 event');
      assert.equal(tx.logs[0].event, 'DocumentInvalidated');
      assert.equal(tx.logs[0].args._address, accounts[9], 'contract address');
      assert.equal(tx.logs[0].args.id, 0, 'id');
    });

    it('should prevent invalidate a document from a non owner', async function () {
      await assertRevert(documentation.invalidateDocument(accounts[9], 1, { from: accounts[1] }));
    });

    describe('and one document invalid', function () {
      let beforeInvalidate;

      beforeEach(async function () {
        beforeInvalidate = Math.floor(new Date().getTime() / 1000);
        await documentation.invalidateDocument(accounts[8], 0);
      });

      it('document should be invalid', async function () {
        const valid = await documentation.documentIsValid(accounts[8], 0);
        assert.ok(!valid, 'invalid');
      });

      it('should have last update updated', async function () {
        const lastUpdate = await documentation.documentLastUpdate(accounts[8], 1);
        assert.ok(lastUpdate >= beforeInvalidate, 'last update');
      });

      it('document should become valid after update', async function () {
        await documentation.updateDocument(accounts[8], 0, 'aName', '0x0001');
        const valid = await documentation.documentIsValid(accounts[8], 0);
        assert.ok(valid, 'valid');
      });
    });
  });
});
