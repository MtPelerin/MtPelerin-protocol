'user strict';

const assertRevert = require('../../helpers/assertRevert');

var MultiSig = artifacts.require('../contracts/multisig/private/MultiSig.sol');
var StandardTokenMock = artifacts.require('mock/StandardTokenMock.sol');

contract('MultiSig', function (accounts) {
  let multiSig, token, request;

  let sign = async function (address) {
    const hash = await multiSig.replayProtection();
    const signedHash = web3.eth.sign(address, hash);

    return {
      r: '0x' + signedHash.slice(2).slice(0, 64),
      s: '0x' + signedHash.slice(2).slice(64, 128),
      v: web3.toDecimal(signedHash.slice(2).slice(128, 130)),
    };
  };

  before(async function () {
    token = await StandardTokenMock.new(accounts[0], 10000);
    request = await token.transfer.request(accounts[1], 100);
  });

  describe('with one address and threshold of 1', function () {
    beforeEach(async function () {
      multiSig = await MultiSig.new([ accounts[1] ], 1);
    });

    it('should not read empty selector', async function () {
      const selector = await multiSig.readSelector('');
      assert.equal(selector, '0x00000000', 'selector');
    });

    it('should read selector for a token call', async function () {
      const data = request.params[0].data;
      const selector = await multiSig.readSelector(data);
      assert.equal(selector, data.substring(0, 10), 'selector');
    });

    it('should have 1 addresses', async function () {
      const addresses = await multiSig.signers();
      assert.equal(addresses.length, 1, 'length');
      assert.equal(addresses[0], accounts[1], 'account 1');
    });

    it('should have a threshold of 1', async function () {
      const threshold = await multiSig.threshold();
      assert.equal(threshold, 1);
    });

    it('should have a replay protection', async function () {
      const replayProtection = await multiSig.replayProtection();
      assert.ok(replayProtection.startsWith('0x'), 34, 'replay proection');
      assert.ok(replayProtection.length, 34, 'replay proection');
    });

    it('should have a nonce', async function () {
      const nonce = await multiSig.nonce();
      assert.equal(nonce, 1);
    });

    it('should review signatures', async function () {
      const rsv = await sign(accounts[1]);
      const review = await multiSig.reviewSignatures(
        [ rsv.r ], [ rsv.s ], [ rsv.v ]);
      assert.equal(review.toNumber(), 1);
    });

    it('should review with wrong signatures', async function () {
      const rsv = await sign(accounts[2]);
      const review = await multiSig.reviewSignatures(
        [ rsv.r ], [ rsv.s ], [ rsv.v ]);
      assert.equal(review.toNumber(), 0);
    });

    it('should recover the address', async function () {
      const address = accounts[1];
      const hash = await multiSig.replayProtection();
      const sign = web3.eth.sign(address, hash);

      const r = `0x${sign.slice(2).slice(0, 64)}`;
      const s = `0x${sign.slice(2).slice(64, 128)}`;
      const v = web3.toDecimal(sign.slice(2).slice(128, 130)) + 27;

      const recover = await multiSig.recoverAddress(r, s, v);
      assert.equal(recover, address, 'recovered address');
    });

    it('should receive ETH', async function () {
      await new Promise((resolve, reject) => web3.eth.sendTransaction({
        from: accounts[0],
        to: multiSig.address,
        value: web3.toWei(1, 'milli'),
      }, (err, data) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      }));

      const balanceETH = await web3.eth.getBalance(multiSig.address);
      assert.equal(balanceETH, web3.toWei(1, 'milli'), 'balance multiSig');
    });

    describe('with ETH in the contract', function () {
      beforeEach(async function () {
        await new Promise((resolve, reject) => web3.eth.sendTransaction({
          from: accounts[0],
          to: multiSig.address,
          value: web3.toWei(1, 'milli'),
        }, (err, data) => {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        }));
      });

      it('should reject ETH transfer with too few signatures', async function () {
        await assertRevert(multiSig.execute([ ], [ ], [ ],
          accounts[0], web3.toWei(1, 'milli'), ''));
      });

      it('should reject ETH transfer with too many signatures', async function () {
        const rsv1 = await sign(accounts[1]);
        const rsv2 = await sign(accounts[2]);
        await assertRevert(multiSig.execute(
          [ rsv1.r, rsv2.r ], [ rsv1.s, rsv2.s ], [ rsv1.v, rsv2.v ],
          accounts[0], web3.toWei(1, 'milli'), ''));
      });

      it('should reject ETH transfer with wrong signature', async function () {
        const rsv = await sign(accounts[2]);
        await assertRevert(multiSig.execute([ rsv.r ], [ rsv.s ], [ rsv.v ],
          accounts[0], web3.toWei(1, 'milli'), ''));
      });

      it('should allow ETH transfer and withdraw all ETH', async function () {
        const rsv = await sign(accounts[1]);
        const tx = await multiSig.execute([ rsv.r ], [ rsv.s ], [ rsv.v ],
          accounts[0], web3.toWei(1, 'milli'), '');
        assert.equal(tx.receipt.status, '0x01', 'status');

        const balanceETH = await web3.eth.getBalance(multiSig.address);
        assert.equal(balanceETH, web3.toWei(0, 'milli'), 'balance multiSig');
      });
    });

    describe('with some ERC20', function () {
      beforeEach(async function () {
        token.transfer(multiSig.address, 100);
      });

      it('should not execute ERC20 transfer with missing signatures', async function () {
        await assertRevert(multiSig.execute([], [ ], [ ],
          request.params[0].to, 0, request.params[0].data));
      });

      it('should not execute ERC20 transfer with too many signatures', async function () {
        const rsv1 = await sign(accounts[1]);
        const rsv2 = await sign(accounts[2]);
        await assertRevert(
          multiSig.execute(
            [ rsv1.r, rsv2.r ], [ rsv1.s, rsv2.s ], [ rsv1.v, rsv2.v ],
            request.params[0].to, 0, request.params[0].data));
      });

      it('should not execute ERC20 transfer with wrong signature', async function () {
        const rsv = await sign(accounts[2]);
        await assertRevert(multiSig.execute(
          [ rsv.r ], [ rsv.s ], [ rsv.v ], request.params[0].to, 0, request.params[0].data));
      });

      it('should execute ERC20 transfer', async function () {
        const balance1 = await token.balanceOf(accounts[1]);
        const rsv = await sign(accounts[1]);
        const tx = await multiSig.execute(
          [ rsv.r ], [ rsv.s ], [ rsv.v ],
          request.params[0].to, 0, request.params[0].data);
        assert.equal(tx.receipt.status, '0x01', 'status');

        const balance = await token.balanceOf(multiSig.address);
        assert.equal(balance.toNumber(), 0, 'balance multisig');
        const balance1After = await token.balanceOf(accounts[1]);
        assert.equal(balance1After.sub(balance1).toNumber(), 100, 'balance account 1');
      });
    });
  });

  describe('with three addresses and threshold of 2', function () {
    beforeEach(async function () {
      multiSig = await MultiSig.new([ accounts[1], accounts[2], accounts[3] ], 2);
    });

    it('should have 3 addresses', async function () {
      const addresses = await multiSig.signers();
      assert.equal(addresses.length, 3, 'length');
      assert.equal(addresses[0], accounts[1], 'account 1');
      assert.equal(addresses[1], accounts[2], 'account 2');
      assert.equal(addresses[2], accounts[3], 'account 3');
    });

    it('should have a threshold of 2', async function () {
      const threshold = await multiSig.threshold();
      assert.equal(threshold, 2);
    });

    it('should review correct signatures for account 1 and 2', async function () {
      const rsv1 = await sign(accounts[1]);
      const rsv2 = await sign(accounts[2]);
      const review = await multiSig.reviewSignatures(
        [ rsv1.r, rsv2.r ], [ rsv1.s, rsv2.s ], [ rsv1.v, rsv2.v ]);
      assert.equal(review.toNumber(), 2);
    });

    it('should review correct signatures for account 2 and 3', async function () {
      const rsv2 = await sign(accounts[2]);
      const rsv3 = await sign(accounts[3]);
      const review = await multiSig.reviewSignatures(
        [ rsv2.r, rsv3.r ], [ rsv2.s, rsv3.s ], [ rsv2.v, rsv3.v ]);
      assert.equal(review.toNumber(), 2);
    });

    it('should review correct signature for account 1', async function () {
      const rsv = await sign(accounts[1]);
      const review = await multiSig.reviewSignatures(
        [ rsv.r ], [ rsv.s ], [ rsv.v ]);
      assert.equal(review.toNumber(), 1);
    });

    it('should review correct signature for account 3', async function () {
      const rsv = await sign(accounts[3]);
      const review = await multiSig.reviewSignatures(
        [ rsv.r ], [ rsv.s ], [ rsv.v ]);
      assert.equal(review.toNumber(), 1);
    });

    it('should review incorrect signatures (wrong order)', async function () {
      const rsv1 = await sign(accounts[2]);
      const rsv2 = await sign(accounts[1]);
      const review = await multiSig.reviewSignatures(
        [ rsv1.r, rsv2.r ], [ rsv1.s, rsv2.s ], [ rsv1.v, rsv2.v ]);
      assert.equal(review.toNumber(), 0);
    });

    it('should review incorrect signatures (twice same addresse)', async function () {
      const rsv1 = await sign(accounts[1]);
      const rsv2 = await sign(accounts[1]);
      const review = await multiSig.reviewSignatures(
        [ rsv1.r, rsv2.r ], [ rsv1.s, rsv2.s ], [ rsv1.v, rsv2.v ]);
      assert.equal(review.toNumber(), 0);
    });

    it('should review incorrect signatures (wrong participant)', async function () {
      const rsv1 = await sign(accounts[1]);
      const rsv4 = await sign(accounts[4]);
      const review = await multiSig.reviewSignatures(
        [ rsv1.r, rsv4.r ], [ rsv1.s, rsv4.s ], [ rsv1.v, rsv4.v ]);
      assert.equal(review.toNumber(), 0);
    });

    it('should review incorrect signatures (no participants)', async function () {
      const review = await multiSig.reviewSignatures(
        [ ], [ ], [ ]);
      assert.equal(review.toNumber(), 0);
    });

    it('should review incorrect signatures (too many participants)', async function () {
      const rsv1 = await sign(accounts[1]);
      const rsv2 = await sign(accounts[2]);
      const rsv3 = await sign(accounts[3]);
      const rsv4 = await sign(accounts[4]);
      const review = await multiSig.reviewSignatures(
        [ rsv1.r, rsv2.r, rsv3.r, rsv4.r ],
        [ rsv1.s, rsv2.s, rsv3.s, rsv4.s ],
        [ rsv1.v, rsv2.v, rsv3.v, rsv4.v ]);
      assert.equal(review.toNumber(), 0);
    });

    describe('with ETH in the contract', function () {
      beforeEach(async function () {
        await new Promise((resolve, reject) => web3.eth.sendTransaction({
          from: accounts[0],
          to: multiSig.address,
          value: web3.toWei(1, 'milli'),
        }, (err, data) => {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        }));
      });

      it('should reject ETH transfer with few signatures', async function () {
        const rsv1 = await sign(accounts[1]);
        await assertRevert(multiSig.execute(
          [ rsv1.r ], [ rsv1.s ], [ rsv1.v ],
          accounts[0], web3.toWei(1, 'milli'), ''));
      });

      it('should reject ETH transfer with too many signatures', async function () {
        const rsv1 = await sign(accounts[1]);
        const rsv2 = await sign(accounts[2]);
        const rsv3 = await sign(accounts[3]);
        const rsv4 = await sign(accounts[4]);
        await assertRevert(multiSig.execute(
          [ rsv1.r, rsv2.r, rsv3.r, rsv4.r ],
          [ rsv1.s, rsv2.s, rsv3.s, rsv4.s ],
          [ rsv1.v, rsv2.v, rsv3.v, rsv4.v ],
          accounts[0], web3.toWei(1, 'milli'), ''));
      });

      it('should reject ETH transfer with wrong signature', async function () {
        const rsv1 = await sign(accounts[1]);
        const rsv4 = await sign(accounts[4]);
        await assertRevert(multiSig.execute(
          [ rsv1.r, rsv4.r ], [ rsv1.s, rsv4.s ], [ rsv1.v, rsv4.v ],
          accounts[0], web3.toWei(1, 'milli'), ''));
      });

      it('should allow ETH transfer and withdraw all ETH with threshold', async function () {
        const rsv1 = await sign(accounts[1]);
        const rsv2 = await sign(accounts[2]);
        const tx = await multiSig.execute(
          [ rsv1.r, rsv2.r ], [ rsv1.s, rsv2.s ], [ rsv1.v, rsv2.v ],
          accounts[0], web3.toWei(1, 'milli'), '');
        assert.equal(tx.receipt.status, '0x01', 'status');

        const balanceETH = await web3.eth.getBalance(multiSig.address);
        assert.equal(balanceETH, web3.toWei(0, 'milli'), 'balance multiSig');
      });

      it('should allow ETH transfer and withdraw all ETH with all signatures', async function () {
        const rsv1 = await sign(accounts[1]);
        const rsv2 = await sign(accounts[2]);
        const rsv3 = await sign(accounts[3]);
        const tx = await multiSig.execute(
          [ rsv1.r, rsv2.r, rsv3.r ], [ rsv1.s, rsv2.s, rsv3.s ], [ rsv1.v, rsv2.v, rsv3.v ],
          accounts[0], web3.toWei(1, 'milli'), '');
        assert.equal(tx.receipt.status, '0x01', 'status');

        const balanceETH = await web3.eth.getBalance(multiSig.address);
        assert.equal(balanceETH, web3.toWei(0, 'milli'), 'balance multiSig');
      });
    });

    describe('with some ERC20', function () {
      beforeEach(async function () {
        token.transfer(multiSig.address, 100);
      });

      it('should reject ETH transfer with few signatures', async function () {
        const rsv1 = await sign(accounts[1]);
        await assertRevert(multiSig.execute(
          [ rsv1.r ], [ rsv1.s ], [ rsv1.v ],
          request.params[0].to, 0, request.params[0].data));
      });

      it('should reject ETH transfer with too many signatures', async function () {
        const rsv1 = await sign(accounts[1]);
        const rsv2 = await sign(accounts[2]);
        const rsv3 = await sign(accounts[3]);
        const rsv4 = await sign(accounts[4]);
        await assertRevert(multiSig.execute(
          [ rsv1.r, rsv2.r, rsv3.r, rsv4.r ],
          [ rsv1.s, rsv2.s, rsv3.s, rsv4.s ],
          [ rsv1.v, rsv2.v, rsv3.v, rsv4.v ],
          request.params[0].to, 0, request.params[0].data));
      });

      it('should reject ERC20 transfer with wrong signatures', async function () {
        const rsv1 = await sign(accounts[1]);
        const rsv4 = await sign(accounts[4]);
        await assertRevert(multiSig.execute(
          [ rsv1.r, rsv4.r ],
          [ rsv1.s, rsv4.s ],
          [ rsv1.v, rsv4.v ],
          request.params[0].to, 0, request.params[0].data));
      });

      it('should execute ERC20 transfer with threshold', async function () {
        const balance1 = await token.balanceOf(accounts[1]);
        const rsv1 = await sign(accounts[1]);
        const rsv3 = await sign(accounts[3]);
        const tx = await multiSig.execute(
          [ rsv1.r, rsv3.r ], [ rsv1.s, rsv3.s ], [ rsv1.v, rsv3.v ],
          request.params[0].to, 0, request.params[0].data);
        assert.equal(tx.receipt.status, '0x01', 'status');

        const balance = await token.balanceOf(multiSig.address);
        assert.equal(balance.toNumber(), 0, 'balance multisig');
        const balance1After = await token.balanceOf(accounts[1]);
        assert.equal(balance1After.sub(balance1).toNumber(), 100, 'balance account 1');
      });

      it('should execute ERC20 transfer with all signatures', async function () {
        const balance1 = await token.balanceOf(accounts[1]);
        const rsv1 = await sign(accounts[1]);
        const rsv2 = await sign(accounts[2]);
        const rsv3 = await sign(accounts[3]);
        const tx = await multiSig.execute(
          [ rsv1.r, rsv2.r, rsv3.r ],
          [ rsv1.s, rsv2.s, rsv3.s ],
          [ rsv1.v, rsv2.v, rsv3.v ],
          request.params[0].to, 0, request.params[0].data);
        assert.equal(tx.receipt.status, '0x01', 'status');

        const balance = await token.balanceOf(multiSig.address);
        assert.equal(balance.toNumber(), 0, 'balance multisig');
        const balance1After = await token.balanceOf(accounts[1]);
        assert.equal(balance1After.sub(balance1).toNumber(), 100, 'balance account 1');
      });
    });
  });
});
