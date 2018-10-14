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
const signer = require('../helpers/signer');

const BridgeTokenMock = artifacts.require('MintableBridgeTokenMock.sol');
const BoardSig = artifacts.require('../contracts/governance/BoardSig.sol');

contract('BoardSig', function (accounts) {
  const TOKENIZE_CODE_TO_SIGN = web3.sha3('TOKENIZE');
  const nextYear = Math.floor((new Date()).getTime() / 1000) + 3600 * 24 * 365;

  let token, boardSig;

  it('should create the BoardSig', async function () {
    boardSig = await BoardSig.new([ accounts[1], accounts[2], accounts[3] ], 2);
    signer.multiSig = boardSig;
  });

  describe('with three addresses and threshold of 2', function () {
    let tokenizeToSign;

    beforeEach(async function () {
      boardSig = await BoardSig.new([ accounts[1], accounts[2], accounts[3] ], 2);
      token = await BridgeTokenMock.new('Test', 'TST');
      signer.multiSig = boardSig;
      tokenizeToSign = await boardSig.tokenizeHash(token.address);
    });

    it('should provide code to sign', async function () {
      const tokenizeToSignFound = await boardSig.TOKENIZE();
      assert.equal(tokenizeToSignFound, TOKENIZE_CODE_TO_SIGN, 'TOKENIZE code');
    });

    it('should provide tokenize hash', async function () {
      const tokenizeToSignFound = await boardSig.tokenizeHash(token.address);
      let tokenizeToSignExpected = web3.sha3(
        signer.encodeParams(
          ['bytes32', 'address'],
          [ TOKENIZE_CODE_TO_SIGN, token.address ]
        ), { encoding: 'hex' }
      );
      assert.equal(tokenizeToSignFound, tokenizeToSignExpected, 'data to sign');
    });

    it('should not tokenize shares with 1 signatures', async function () {
      const rsv1 = await signer.sign(boardSig.address, 0, tokenizeToSign, 0, accounts[1]);
      await assertRevert(boardSig.tokenizeShares(
        token.address,
        [ rsv1.r ], [ rsv1.s ], [ rsv1.v ]
      ));
    });
 
    it('should tokenize shares with 2 signatures', async function () {
      const rsv1 = await signer.sign(boardSig.address, 0, tokenizeToSign, 0, accounts[1]);
      const rsv2 = await signer.sign(boardSig.address, 0, tokenizeToSign, 0, accounts[2]);

      const tx = await boardSig.tokenizeShares(
        token.address,
        [ rsv1.r, rsv2.r ], [ rsv1.s, rsv2.s ], [ rsv1.v, rsv2.v ]
      );
      assert.equal(parseInt(tx.receipt.status), 1, 'status');
      assert.equal(tx.logs.length, 1);
      assert.equal(tx.logs[0].event, 'ShareTokenization');
      assert.equal(tx.logs[0].args.token, token.address);
    });

    describe('when tokenized', function () {
      beforeEach(async function () {
        const rsv1 = await signer.sign(boardSig.address, 0, tokenizeToSign, 0, accounts[1]);
        const rsv2 = await signer.sign(boardSig.address, 0, tokenizeToSign, 0, accounts[2]);

        await boardSig.tokenizeShares(
          token.address,
          [ rsv1.r, rsv2.r ], [ rsv1.s, rsv2.s ], [ rsv1.v, rsv2.v ]
        );
      });
    });
  });
});
