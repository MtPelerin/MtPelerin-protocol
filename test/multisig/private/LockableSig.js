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

const assertRevert = require('../../helpers/assertRevert');
const LockableSig = artifacts.require('../contracts/multisig/private/LockableSig.sol');
const StandardTokenMock = artifacts.require('mock/StandardTokenMock.sol');

contract('LockableSig', function (accounts) {
  let lockableSig;

  let sign = async function (address) {
    const hash = await lockableSig.replayProtection();
    const signedHash = web3.eth.sign(address, hash);

    return {
      r: '0x' + signedHash.slice(2).slice(0, 64),
      s: '0x' + signedHash.slice(2).slice(64, 128),
      v: web3.toDecimal(signedHash.slice(2).slice(128, 130)),
    };
  };

  describe('with one address and threshold of 1', function () {
    beforeEach(async function () {
      lockableSig = await LockableSig.new([ accounts[1] ], 1);
    });

    it('should be unlocked', async function () {
      const locked = await lockableSig.isLocked();
      assert.ok(!locked, 'locked');
    });

    it('should lock', async function () {
      const rsv = await sign(accounts[1]);
      const tx = await lockableSig.lock([ rsv.r ], [ rsv.s ], [ rsv.v ]);
      assert.equal(tx.receipt.status, '0x01', 'status');

      const locked = await lockableSig.isLocked();
      assert.ok(locked, 'locked');
    });

    it('should execute ERC20 transfer', async function () {
      const token = await StandardTokenMock.new(lockableSig.address, 1000);
      const request = token.transfer.request(accounts[0], 100);
      const rsv = await sign(accounts[1]);

      const tx = await lockableSig.execute([ rsv.r ], [ rsv.s ], [ rsv.v ],
        request.params[0].to, 0, request.params[0].data);
      assert.equal(tx.receipt.status, '0x01', 'status');

      const balance = await token.balanceOf(lockableSig.address);
      assert.equal(balance, 900, 'balance multisig');
      const balance0 = await token.balanceOf(accounts[0]);
      assert.equal(balance0, 100, 'balance account 0');
    });

    describe('when locked', function () {
      beforeEach(async function () {
        const rsv = await sign(accounts[1]);
        await lockableSig.lock([ rsv.r ], [ rsv.s ], [ rsv.v ]);
      });

      it('should prevent ERC20 transfer', async function () {
        const token = await StandardTokenMock.new(lockableSig.address, 1000);
        const request = token.transfer.request(accounts[0], 100);
        const rsv = await sign(accounts[1]);

        await assertRevert(
          lockableSig.execute([ rsv.r ], [ rsv.s ], [ rsv.v ],
            request.params[0].to, 0, request.params[0].data));
      });

      it('should unlock', async function () {
        const rsv = await sign(accounts[1]);
        const tx = await lockableSig.unlock([ rsv.r ], [ rsv.s ], [ rsv.v ]);
        assert.equal(tx.receipt.status, '0x01', 'status');

        const locked = await lockableSig.isLocked();
        assert.ok(!locked, 'locked');
      });

      describe('when unlocked', function () {
        beforeEach(async function () {
          const rsv = await sign(accounts[1]);
          await lockableSig.unlock([ rsv.r ], [ rsv.s ], [ rsv.v ]);
        });

        it('should execute ERC20 transfer', async function () {
          const token = await StandardTokenMock.new(lockableSig.address, 1000);
          const request = token.transfer.request(accounts[0], 100);
          const rsv = await sign(accounts[1]);

          const tx = await lockableSig.execute([ rsv.r ], [ rsv.s ], [ rsv.v ],
            request.params[0].to, 0, request.params[0].data);
          assert.equal(tx.receipt.status, '0x01', 'status');

          const balance = await token.balanceOf(lockableSig.address);
          assert.equal(balance, 900, 'balance multisig');
          const balance0 = await token.balanceOf(accounts[0]);
          assert.equal(balance0, 100, 'balance account 0');
        });
      });
    });
  });
});
