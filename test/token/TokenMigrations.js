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

const assertRevert = require('../helpers/assertRevert');
const StandardTokenMock = artifacts.require('mocks/StandardTokenMock.sol');
const TokenMigrations = artifacts.require('mocks/TokenMigrations.sol');

contract('TokenMigrations', function (accounts) {
  const supply = 1000000;
  const account1Supply = 0.1 * supply;

  let migrations, token, badToken;

  beforeEach(async function () {
    badToken = await StandardTokenMock.new(accounts[0], 666);
    token = await StandardTokenMock.new(accounts[0], supply);
    token.transfer(accounts[1], account1Supply);
    migrations = await TokenMigrations.new(token.address);
  });

  it('should not have account 0 migrated', async function () {
    const migrated =
      await migrations.isAccountMigrated(0, accounts[0]);
    assert.ok(!migrated, 'not migrated');
  });

  it('should have 0 total migrated for address 0', async function () {
    const totalMigrated = await migrations.totalMigrated(0);
    assert.equal(totalMigrated, 0, 'total migrated');
  });

  it('should have no accounts migrated for address 0', async function () {
    const accountsMigrated = await migrations.accountsMigrated(0);
    assert.equal(accountsMigrated, 0, 'accounts migrated');
  });

  it('should have token as latestToken', async function () {
    const latestToken = await migrations.latestToken();
    assert.equal(latestToken, token.address, 'latest token');
  });

  it('should have version as 0', async function () {
    const version = await migrations.version();
    assert.equal(version.toNumber(), 0, 'version');
  });

  it('should upgrade the initial token', async function () {
    const newToken = await StandardTokenMock.new(migrations.address, supply);
    const tx = await migrations.upgrade(newToken.address);
    assert.equal(tx.receipt.status, '0x01', 'status');
    assert.equal(tx.logs.length, 1);
    assert.equal(tx.logs[0].event, 'NewMigration');
    assert.equal(tx.logs[0].args.oldToken, token.address, 'old token');
  });

  it('should not allow upgrade of non migrated token', async function () {
    await assertRevert(migrations.upgrade(badToken.address));
  });

  it('should fail upgrade with insufficient tokens', async function () {
    const newToken = await StandardTokenMock.new(migrations.address, supply - 1);
    await assertRevert(migrations.upgrade(newToken.address));
  });

  it('should fail upgrade with too many tokens', async function () {
    const newToken = await StandardTokenMock.new(migrations.address, supply + 1);
    await assertRevert(migrations.upgrade(newToken.address));
  });

  it('should fail upgrade with address 0', async function () {
    await assertRevert(migrations.upgrade('0x0000000000000000000000000000000000000000'));
  });

  it('should not let user accept migration for token 0', async function () {
    await assertRevert(migrations.acceptMigration(0));
  });

  describe('with an initial token upgrade', async function () {
    let newToken;

    beforeEach(async function () {
      newToken = await StandardTokenMock.new(migrations.address, supply);
      await migrations.upgrade(newToken.address);
    });

    it('should have token as latestToken', async function () {
      const latestToken = await migrations.latestToken();
      assert.equal(latestToken, newToken.address, 'latest token');
    });

    it('should have account 0 not migrated', async function () {
      const migrated =
        await migrations.isAccountMigrated(token.address, accounts[0]);
      assert.ok(!migrated, 'not migrated');
    });

    it('should have 0 total migrated for token', async function () {
      const totalMigrated = await migrations.totalMigrated(token.address);
      assert.equal(totalMigrated, 0, 'total migrated');
    });

    it('should have no accounts migrated for token', async function () {
      const accountsMigrated = await migrations.accountsMigrated(token.address);
      assert.equal(accountsMigrated, 0, 'accounts migrated');
    });

    it('should have new token as latestToken', async function () {
      const latestToken = await migrations.latestToken();
      assert.equal(latestToken, newToken.address, 'latest token');
    });

    it('should have 1 as version', async function () {
      const version = await migrations.version();
      assert.equal(version.toNumber(), 1, 'version');
    });

    it('should upgrade the token again', async function () {
      const newToken2 = await StandardTokenMock.new(migrations.address, supply);
      const tx = await migrations.upgrade(newToken2.address);
      assert.equal(tx.receipt.status, '0x01', 'status');
    });

    it('should let account1 accept migration for token', async function () {
      const tx1 = await token.approve(migrations.address, account1Supply, { from: accounts[1] });
      assert.equal(tx1.receipt.status, '0x01', 'approve status');
      const tx2 = await migrations.acceptMigration(token.address, { from: accounts[1] });
      assert.equal(tx2.receipt.status, '0x01', 'accept status');
    });

    it('should not let account1 accept migration for token without approval', async function () {
      await assertRevert(migrations.acceptMigration(token.address, { from: accounts[1] }));
    });

    it('should not let account2 accept migration for token', async function () {
      await assertRevert(migrations.acceptMigration(token.address, { from: accounts[2] }));
    });

    describe('With migration accepted for account1', function () {
      beforeEach(async function () {
        await token.approve(migrations.address, account1Supply, { from: accounts[1] });
        await migrations.acceptMigration(token.address, { from: accounts[1] });
      });

      it('should have account 1 migrated', async function () {
        const migrated = await migrations.isAccountMigrated(token.address, accounts[1]);
        assert.ok(migrated, 'migrated');
      });

      it('should have 1 account migrated', async function () {
        const migrated = await migrations.accountsMigrated(token.address);
        assert.equal(migrated.toNumber(), 1, 'migrated');
      });

      it('should exists new tokens for account 1', async function () {
        const newTokens1 = await newToken.balanceOf(accounts[1]);
        assert.equal(newTokens1.toNumber(), account1Supply, 'supply account1');
      });

      it('should have 100000 total migrated for new token', async function () {
        const totalMigrated = await migrations.totalMigrated(token.address);
        assert.equal(totalMigrated.toNumber(), account1Supply, 'total migrated');
      });

      it('should not accept migration for account 1', async function () {
        await token.approve(migrations.address, account1Supply, { from: accounts[1] });
        await assertRevert(migrations.acceptMigration(token.address, { from: accounts[1] }));
      });

      it('should accept migration for account 0', async function () {
        await token.approve(migrations.address, supply - account1Supply);
        const tx = await migrations.acceptMigration(token.address);
        assert.equal(tx.receipt.status, '0x01', 'status');
        const newTokens0 = await newToken.balanceOf(accounts[0]);
        assert.equal(newTokens0.toNumber(), supply - account1Supply, 'supply account0');
      });
    });
  });
});
