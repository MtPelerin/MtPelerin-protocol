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
const RatesProvider = artifacts.require('RatesProvider.sol');

contract('RatesProvider', function (accounts) {
  let provider;

  const aWEICHFSample = 4825789016504;
  const aETHCHFSample = 207220;
  const dayPlusOneTime = Math.floor((new Date()).getTime() / 1000) + 3600 * 24;
  const dayMinusOneTime = Math.floor((new Date()).getTime() / 1000) - 3600 * 24;

  beforeEach(async function () {
    provider = await RatesProvider.new();
    await provider.defineAuthority('OPERATOR', accounts[0]);
  });

  it('should convert rate from ETHCHF', async function () {
    const rateWEICHFCent = await provider.convertRateFromETHCHF(aETHCHFSample, 2);
    assert.equal(rateWEICHFCent.toNumber(), aWEICHFSample, 'rate from ETHCHF');
  });

  it('should convert rate to ETHCHF', async function () {
    const rateETHCHF = await provider.convertRateToETHCHF(aWEICHFSample, 2);
    assert.equal(rateETHCHF.toNumber(), aETHCHFSample, 'rate to ETHCHF');
  });

  it('should convert CHF Cent to 0', async function () {
    const amountWEI = await provider.convertCHFCentToWEI(1000);
    assert.equal(amountWEI.toNumber(), 0, 'WEICHFCents');
  });

  it('should convert WEI to CHFCent to 0', async function () {
    const amountCHFCent = await provider.convertWEIToCHFCent(10 ** 18);
    assert.equal(amountCHFCent.toNumber(), 0, 'no rates');
  });

  it('should have 0 rate WEICHFCent', async function () {
    const rateWEICHFCent = await provider.rateWEIPerCHFCent();
    assert.equal(rateWEICHFCent.toNumber(), 0, 'WEICHFCents');
  });

  it('should have 0 rate ETHCHF', async function () {
    const rateETHCHF = await provider.rateETHCHF(2);
    assert.equal(rateETHCHF.toNumber(), 0, 'no rates');
  });

  it('should let authority define a rate', async function () {
    const tx = await provider.defineRate(aWEICHFSample);
    assert.equal(parseInt(tx.receipt.status), 1, 'Status');
    assert.equal(tx.logs.length, 1);
    assert.equal(tx.logs[0].event, 'Rate', 'event');
    assert.ok(tx.logs[0].args.at > dayMinusOneTime, 'before');
    assert.ok(tx.logs[0].args.at < dayPlusOneTime, 'after');
    assert.ok(tx.logs[0].args.rateWEIPerCHFCent.toNumber(), aWEICHFSample, 'rate');
  });

  it('should prevent anyone from defining a rate', async function () {
    await assertRevert(provider.defineRate(aWEICHFSample, { from: accounts[1] }));
  });

  it('should let authority define an ETHCHF rate', async function () {
    const tx = await provider.defineETHCHFRate(aETHCHFSample, 2);
    assert.equal(parseInt(tx.receipt.status), 1, 'Status');
    assert.equal(tx.logs.length, 1);
    assert.equal(tx.logs[0].event, 'Rate', 'event');
    assert.ok(tx.logs[0].args.at > dayMinusOneTime, 'before');
    assert.ok(tx.logs[0].args.at < dayPlusOneTime, 'after');
    assert.ok(tx.logs[0].args.rateWEIPerCHFCent.toNumber(), aWEICHFSample, 'rate');
  });

  it('should prevent anyone from defining an ETHCHF rate', async function () {
    await assertRevert(provider.defineETHCHFRate(aETHCHFSample, 2, { from: accounts[1] }));
  });

  describe('With a rate defined', async function () {
    beforeEach(async function () {
      await provider.defineRate(aWEICHFSample);
    });

    it('should convert CHF Cent to 0', async function () {
      const amountWEI = await provider.convertCHFCentToWEI(1000);
      assert.equal(amountWEI.toNumber(), 1000 * aWEICHFSample, 'WEICHFCents');
    });

    it('should convert WEI to CHFCent to 0', async function () {
      const amountCHFCent = await provider.convertWEIToCHFCent(10 ** 18);
      assert.equal(amountCHFCent.toNumber(), aETHCHFSample, 'no rates');
    });
  });
});
