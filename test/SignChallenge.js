'user strict';

/**
 * @author Cyril Lapinte - <cyril.lapinte@mtpelerin.com>
 *
 * Copyright © 2016 - 2019 Mt Pelerin Group SA - All Rights Reserved
 * This content cannot be used, copied or reproduced in part or in whole
 * without the express and written permission of Mt Pelerin Group SA.
 * Written by *Mt Pelerin Group SA*, <info@mtpelerin.com>
 * All matters regarding the intellectual property of this code or software
 * are subjects to Swiss Law without reference to its conflicts of law rules.
 *
 */

const assertRevert = require('./helpers/assertRevert');
const SignChallenge = artifacts.require('../contracts/SignChallenge.sol');
const ContractMock = artifacts.require('../contracts/mock/ContractMock.sol');

contract('SignChallenge', function (accounts) {
  let signChallenge;
  let contractMock;

  beforeEach(async function () {
    contractMock = await ContractMock.new();
    signChallenge = await SignChallenge.new();
  });

  it('should be active', async function () {
    const active = await signChallenge.active();
    assert.ok(active, 'active');
  });

  it('should have 2 as default challenge bytes', async function () {
    const bytes = await signChallenge.challengeBytes();
    assert.equal(bytes, 2, 'challenge bytes');
  });

  it('should let owner update the challenge', async function () {
    const tx = await signChallenge.updateChallenge(true, 3, '0x123456');
    assert.equal(parseInt(tx.receipt.status), 1, 'status');
    assert.equal(tx.logs.length, 2);
    assert.equal(tx.logs[0].event, 'ChallengeUpdated');
    assert.ok(tx.logs[0].args.active);
    assert.equal(tx.logs[0].args.length, 3);
    assert.equal(tx.logs[1].event, 'Challenge');
    assert.equal(tx.logs[1].args.code, '0x123456');
  });

  it('should let owner update the challenge with active=false', async function () {
    const tx = await signChallenge.updateChallenge(false, 3, '0x123456');
    assert.equal(parseInt(tx.receipt.status), 1, 'status');
    assert.equal(tx.logs.length, 1);
    assert.equal(tx.logs[0].event, 'ChallengeUpdated');
    assert.ok(!tx.logs[0].args.active);
    assert.equal(tx.logs[0].args.length, 3);
  });

  it('should not let owner update the challenge with a wrong test', async function () {
    await assertRevert(signChallenge.updateChallenge(
      true,
      3,
      '0x12345678',
      { from: web3.eth.accounts[1] }));
  });

  it('should not let non owner update the challenge', async function () {
    await assertRevert(signChallenge.updateChallenge(
      true,
      3,
      '0x123456',
      { from: web3.eth.accounts[1] }));
  });

  it('should not accept a value transfer by default', async function () {
    const wei = web3.toWei(1, 'ether');
    await web3.eth.sendTransaction({
      from: accounts[0],
      to: signChallenge.address,
      value: wei,
    }, (error, data) => {
      const revertFound = error.message.search('revert') >= 0;
      assert(revertFound, `Expected "revert", got ${error} instead`);
    });
  });

  it('should not accept a challenge too long', async function () {
    const validCode = '0x100000000';
    await web3.eth.sendTransaction({
      from: accounts[0],
      to: signChallenge.address,
      data: validCode,
      value: 0,
    }, (error, data) => {
      const revertFound = error.message.search('revert') >= 0;
      assert(revertFound, `Expected "revert", got ${error} instead`);
    });
  });

  it('should not accept a challenge too short', async function () {
    const validCode = '0x01';
    await web3.eth.sendTransaction({
      from: accounts[0],
      to: signChallenge.address,
      data: validCode,
      value: 0,
    }, (error, data) => {
      const revertFound = error.message.search('revert') >= 0;
      assert(revertFound, `Expected "revert", got ${error} instead`);
    });
  });

  it('should submit a challenge', async function () {
    const validCode = '0x1234';
    const txHash = await web3.eth.sendTransaction({
      from: accounts[0],
      to: signChallenge.address,
      data: validCode,
      value: 0,
    });
    const receipt = await web3.eth.getTransactionReceipt(txHash);
    assert.equal(parseInt(receipt.status), 1, 'status');
    assert.equal(receipt.logs[0].topics[0], web3.sha3('Challenge(address,bytes)'));
  });

  it('should let owner execute transfer', async function () {
    const request = contractMock.testMe.request();
    const tx = await signChallenge.execute(
      contractMock.address,
      request.params[0].data, { value: web3.toWei(0.1, 'ether') });

    assert.equal(parseInt(tx.receipt.status), 1, 'status');
    assert.equal(tx.logs.length, 0);
  });

  it('should not let non owner execute transfer', async function () {
    const request = contractMock.testMe.request();
    await assertRevert(signChallenge.execute(
      contractMock.address,
      request.params[0].data, {
        from: web3.eth.accounts[1],
        value: web3.toWei(0.1, 'ether'),
      }));
  });

  it('should not execute but challenge with starting challenge executable', async function () {
    const initTx = await signChallenge.updateChallenge(true, 4, '0x12345678');
    assert.equal(parseInt(initTx.receipt.status), 1, 'status');

    // request length should be 266. Higher than a uint8
    await assertRevert(signChallenge.execute('0x0', ''));
  });

  it('should challenge with an execute code', async function () {
    const initTx = await signChallenge.updateChallenge(true, 4, '0x12345678');
    assert.equal(parseInt(initTx.receipt.status), 1, 'status');

    const validCode = web3.sha3('execute(address,bytes)').substring(0, 10);
    const txHash = await web3.eth.sendTransaction({
      from: accounts[0],
      to: signChallenge.address,
      data: validCode,
      value: 0,
    });
    const receipt = await web3.eth.getTransactionReceipt(txHash);
    assert.equal(receipt.logs.length, 1);
    assert.equal(receipt.logs[0].topics[0], web3.sha3('Challenge(address,bytes)'));
  });
});
