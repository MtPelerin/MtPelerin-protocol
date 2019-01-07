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
const StandardTokenMock = artifacts.require('mock/StandardTokenMock.sol');
const UserRegistry = artifacts.require('UserRegistry.sol');
const Tokensale = artifacts.require('tokensale/Tokensale.sol');
const RatesProvider = artifacts.require('RatesProvider.sol');

contract('Tokensale', function (accounts) {
  let sale, token, userRegistry, ratesProvider;

  const KYC_LEVEL_KEY = 1;
  const vaultERC20 = accounts[1];
  const vaultETH = accounts[0];

  const sharePurchaseAgreementHash = web3.sha3('SharePurchaseAgreement');
  const dayMinusOneTime = Math.floor((new Date()).getTime() / 1000) - 3600 * 24;
  const dayPlusOneTime = Math.floor((new Date()).getTime() / 1000) + 3600 * 24;

  before(async function () {
    userRegistry = await UserRegistry.new(
      [ accounts[1], accounts[2], accounts[3], accounts[4], accounts[5], accounts[6] ], dayPlusOneTime);
    await userRegistry.defineAuthority('OPERATOR', accounts[0]);
    await userRegistry.updateUserExtended(1, KYC_LEVEL_KEY, 0);
    await userRegistry.updateUserExtended(2, KYC_LEVEL_KEY, 1);
    await userRegistry.updateUserExtended(3, KYC_LEVEL_KEY, 2);
    await userRegistry.updateUserExtended(4, KYC_LEVEL_KEY, 3);
    await userRegistry.updateUserExtended(5, KYC_LEVEL_KEY, 4);
    await userRegistry.updateUserExtended(6, KYC_LEVEL_KEY, 5);
    ratesProvider = await RatesProvider.new();
    await ratesProvider.defineAuthority('OPERATOR', accounts[0]);
  });

  beforeEach(async function () {
    token = await StandardTokenMock.new(accounts[1], 1000000);
    sale = await Tokensale.new(token.address, userRegistry.address, ratesProvider.address, vaultERC20, vaultETH);
    await sale.defineAuthority('OPERATOR1', accounts[0]);
    await token.approve(sale.address, 1000000, { from: accounts[1] });
  });

  function formatETH (value) {
    return Math.floor(1000 * web3.fromWei(value, 'ether').toNumber()) / 1000;
  }

  it('should have a minimalAutoWithdraw', async function () {
    const minimalAutoWithdraw = await sale.minimalAutoWithdraw();
    assert.equal(minimalAutoWithdraw.toNumber(), web3.toWei(0.5, 'ether'), 'minimalAutoWithdraw');
  });

  it('should have a minimalBalance', async function () {
    const minimalBalance = await sale.minimalBalance();
    assert.equal(minimalBalance.toNumber(), web3.toWei(0.5, 'ether'), 'minimalBalance');
  });

  it('should update minimalBalance', async function () {
    const tx = await sale.updateMinimalBalance(web3.toWei(5, 'ether'));
    assert.equal(parseInt(tx.receipt.status), 1, 'Status');
    const minimalBalance = await sale.minimalBalance();
    assert.equal(minimalBalance.toNumber(), web3.toWei(5, 'ether'), 'minimalBalance');
  });

  it('should have a basePriceCHFCent', async function () {
    const basePriceCHFCent = await sale.basePriceCHFCent();
    assert.equal(basePriceCHFCent.toNumber(), 500, 'basePriceCHFCent');
  });

  it('should have a contribution limit Lvl0', async function () {
    const contributionLimitLvl0 = await sale.contributionLimit(1);
    assert.equal(contributionLimitLvl0.toNumber(), 0, 'contributionLimit lvl0');
  });

  it('should have a contribution limit Lvl1', async function () {
    const contributionLimitLvl1 = await sale.contributionLimit(2);
    assert.equal(contributionLimitLvl1.toNumber(), 500000, 'contributionLimit lvl1');
  });

  it('should have a contribution limit Lvl2', async function () {
    const contributionLimitLvl2 = await sale.contributionLimit(3);
    assert.equal(contributionLimitLvl2.toNumber(), 1500000, 'contributionLimit lvl2');
  });

  it('should have a contribution limit Lvl3', async function () {
    const contributionLimitLvl3 = await sale.contributionLimit(4);
    assert.equal(contributionLimitLvl3.toNumber(), 10000000, 'contributionLimit lvl3');
  });

  it('should have a contribution limit Lvl4', async function () {
    const contributionLimitLvl4 = await sale.contributionLimit(5);
    assert.equal(contributionLimitLvl4.toNumber(), 25000000, 'contributionLimit lvl4');
  });

  it('should have no allowedTokenInvestment Lvl0', async function () {
    const allowedTokenInvestmentLvl0 = await sale.allowedTokenInvestment(1, 50000);
    assert.equal(allowedTokenInvestmentLvl0.toNumber(), 0, 'allowedTokenInvestment lvl0');
  });

  it('should have allowedTokenInvestment Lvl1 with low amount', async function () {
    const allowedTokenInvestmentLvl1 = await sale.allowedTokenInvestment(2, 50000);
    assert.equal(allowedTokenInvestmentLvl1.toNumber(), 100, 'allowedTokenInvestment lvl1');
  });

  it('should have allowedTokenInvestment Lvl2 with low amount', async function () {
    const allowedTokenInvestmentLvl2 = await sale.allowedTokenInvestment(3, 50000);
    assert.equal(allowedTokenInvestmentLvl2.toNumber(), 100, 'allowedTokenInvestment lvl2');
  });

  it('should have allowedTokenInvestment Lvl3 with low amount', async function () {
    const allowedTokenInvestmentLvl3 = await sale.allowedTokenInvestment(4, 50000);
    assert.equal(allowedTokenInvestmentLvl3.toNumber(), 100, 'allowedTokenInvestment lvl3');
  });

  it('should have allowedTokenInvestment Lvl4 with low amount', async function () {
    const allowedTokenInvestmentLvl4 = await sale.allowedTokenInvestment(5, 50000);
    assert.equal(allowedTokenInvestmentLvl4.toNumber(), 100, 'allowedTokenInvestment lvl4');
  });

  it('should have allowedTokenInvestment Lvl1 with too big amount', async function () {
    const allowedTokenInvestmentLvl1 = await sale.allowedTokenInvestment(2, 100000000);
    assert.equal(allowedTokenInvestmentLvl1.toNumber(), 1000, 'allowedTokenInvestment lvl1');
  });

  it('should have allowedTokenInvestment Lvl2 with too big amount', async function () {
    const allowedTokenInvestmentLvl2 = await sale.allowedTokenInvestment(3, 100000000);
    assert.equal(allowedTokenInvestmentLvl2.toNumber(), 3000, 'allowedTokenInvestment lvl2');
  });

  it('should have allowedTokenInvestment Lvl3 with too big amount', async function () {
    const allowedTokenInvestmentLvl3 = await sale.allowedTokenInvestment(4, 100000000);
    assert.equal(allowedTokenInvestmentLvl3.toNumber(), 20000, 'allowedTokenInvestment lvl3');
  });

  it('should have allowedTokenInvestment Lvl4 with too big amount', async function () {
    const allowedTokenInvestmentLvl4 = await sale.allowedTokenInvestment(5, 100000000);
    assert.equal(allowedTokenInvestmentLvl4.toNumber(), 50000, 'allowedTokenInvestment lvl4');
  });

  it('should have a token', async function () {
    const saleTokenAddress = await sale.token();
    assert.equal(saleTokenAddress, token.address, 'token');
  });

  it('should have a vaultERC20', async function () {
    const saleVaultERC20 = await sale.vaultERC20();
    assert.equal(saleVaultERC20, vaultERC20, 'vaulrERC20');
  });

  it('should have a vaultETH', async function () {
    const saleVaultETH = await sale.vaultETH();
    assert.equal(saleVaultETH, vaultETH, 'vaulrETH');
  });

  it('should have a user registry', async function () {
    const saleUserRegistryAddress = await sale.userRegistry();
    assert.equal(saleUserRegistryAddress, userRegistry.address, 'userRegistry');
  });

  it('should have a rate provider', async function () {
    const ratesProviderAddress = await sale.ratesProvider();
    assert.equal(ratesProviderAddress, ratesProvider.address, 'ratesProvider');
  });

  it('should have a share purchase agreement hash non defini', async function () {
    const saleSharePurchaseAgreement = await sale.sharePurchaseAgreementHash();
    assert.equal(saleSharePurchaseAgreement, 0, 'sharePurchaseAgreementHash');
  });

  it('should have a start date', async function () {
    const startAt = await sale.startAt();
    assert.ok(startAt.toNumber() > dayPlusOneTime, 'startAt');
  });

  it('should have a end date', async function () {
    const endAt = await sale.endAt();
    assert.ok(endAt.toNumber() > dayPlusOneTime, 'endAt');
  });

  it('should have raised 0 ETH', async function () {
    const raisedETH = await sale.raisedETH();
    assert.equal(raisedETH.toNumber(), 0, 'raisedETH');
  });

  it('should have raised 0 CHF', async function () {
    const raisedCHF = await sale.raisedCHF();
    assert.equal(raisedCHF.toNumber(), 0, 'raisedCHF');
  });

  it('should have total raised CHF', async function () {
    const totalRaisedCHF = await sale.totalRaisedCHF();
    assert.equal(totalRaisedCHF.toNumber(), 0, 'totalRaisedCHF');
  });

  it('should have unspentETH 0 ETH', async function () {
    const unspentETH = await sale.totalUnspentETH();
    assert.equal(unspentETH.toNumber(), 0, 'unspentETH');
  });

  it('should have refunded 0 ETH', async function () {
    const refundedETH = await sale.totalRefundedETH();
    assert.equal(refundedETH.toNumber(), 0, 'totalRefundedETH');
  });

  it('should have availableSupply', async function () {
    const availableSupply = await sale.availableSupply();
    assert.equal(availableSupply.toNumber(), 1000000, 'availableSupply');
  });

  it('should fund the sale with ETH', async function () {
    const tx = await sale.fundETH({ value: web3.toWei(0.01, 'ether') });
    assert.equal(parseInt(tx.receipt.status), 1, 'Status');
    assert.equal(tx.logs[0].event, 'FundETH', 'event');
    assert.equal(tx.logs[0].args.amount, web3.toWei(0.01, 'ether'), 'amount');
  });

  it('should let operator update investor limits', async function () {
    const tx = await sale.updateInvestorLimits([ 6 ], 80000000);
    assert.equal(parseInt(tx.receipt.status), 1, 'Status');
  });

  it('should not be possible to update schedule startAt > endAt', async function () {
    await assertRevert(sale.updateSchedule(1000, 0));
  });

  describe('before the sale start', async function () {
    beforeEach(async function () {
      await sale.updateInvestorLimits([ 6 ], 80000000);
    });

    it('should have investorLimit for account6', async function () {
      const investorLimit = await sale.investorLimit(6);
      assert.equal(investorLimit.toNumber(), 80000000, 'limit 6');
    });
 
    it('should have a contribution limit for lvl5 investors', async function () {
      const contributionLimitLvl5 = await sale.contributionLimit(6);
      assert.equal(contributionLimitLvl5.toNumber(), 80000000, 'contributionLimit lvl5');
    });

    it('should have allowedTokenInvestment Lvl5', async function () {
      const allowedTokenInvestmentLvl5 = await sale.allowedTokenInvestment(6, 100000000);
      assert.equal(allowedTokenInvestmentLvl5.toNumber(), 160000, 'allowedTokenInvestment lvl5');
    });

    it('should let owner define SPA', async function () {
      const tx = await sale.defineSPA(sharePurchaseAgreementHash);

      assert.equal(parseInt(tx.receipt.status), 1, 'Status');
      assert.equal(tx.logs.length, 1);
      assert.equal(tx.logs[0].event, 'SalePurchaseAgreementHash', 'event');
      assert.equal(
        tx.logs[0].args.sharePurchaseAgreement,
        sharePurchaseAgreementHash,
        'sharePurchaseAgreementHash');
    });

    it('should prevent non owner to define SPA', async function () {
      await assertRevert(sale.defineSPA(sharePurchaseAgreementHash, { from: accounts[2] }));
    });

    it('should let operator allocate tokens', async function () {
      const tx = await sale.allocateTokens(accounts[2], 1000);
      assert.equal(parseInt(tx.receipt.status), 1, 'Status');
      assert.equal(tx.logs.length, 1);
      assert.equal(tx.logs[0].event, 'Allocation', 'event');
      assert.equal(tx.logs[0].args.investorId.toNumber(), 2, 'investorId');
      assert.equal(tx.logs[0].args.tokens.toNumber(), 1000, 'tokens');
    });

    it('should not let operator allocate tokens to non existing user', async function () {
      await assertRevert(sale.allocateTokens(accounts[9], 1000));
    });

    it('should not let operator allocate more tokens than available', async function () {
      await assertRevert(sale.allocateTokens(accounts[2], 1000001));
    });

    it('should not let operator allocate many tokens if lists length does not match', async function () {
      await assertRevert(sale.allocateManyTokens([ accounts[2] ], [ 20000, 1000 ]));
    });
 
    it('should let operator allocate many tokens', async function () {
      const tx = await sale.allocateManyTokens([ accounts[2], accounts[3], accounts[2] ], [ 2000, 1000, 500 ]);
      assert.equal(parseInt(tx.receipt.status), 1, 'Status');
      assert.equal(tx.logs.length, 3);
      assert.equal(tx.logs[0].event, 'Allocation', 'event');
      assert.equal(tx.logs[0].args.investorId.toNumber(), 2, 'investorId');
      assert.equal(tx.logs[0].args.tokens.toNumber(), 2000, 'tokens');
      assert.equal(tx.logs[1].event, 'Allocation', 'event');
      assert.equal(tx.logs[1].args.investorId.toNumber(), 3, 'investorId');
      assert.equal(tx.logs[1].args.tokens.toNumber(), 1000, 'tokens');
      assert.equal(tx.logs[2].event, 'Allocation', 'event');
      assert.equal(tx.logs[2].args.investorId.toNumber(), 2, 'investorId');
      assert.equal(tx.logs[2].args.tokens.toNumber(), 500, 'tokens');
    });

    it('should reject value transfer if data is send along', async function () {
      const wei = web3.toWei(1, 'ether');
      await web3.eth.sendTransaction({
        from: accounts[0],
        to: sale.address,
        value: wei,
        data: '0x1',
      }, (error, data) => {
        const revertFound = error.message.search('revert') >= 0;
        assert(revertFound, `Expected "revert", got ${error} instead`);
      });
    });

    it('should reject value transfer outside of sale', async function () {
      const wei = web3.toWei(1, 'ether');
      await web3.eth.sendTransaction({
        from: accounts[1],
        to: sale.address,
        value: wei,
      }, (error, data) => {
        const revertFound = error.message.search('revert') >= 0;
        assert(revertFound, `Expected "revert", got ${error} instead`);
      });
    });

    it('should not let user invest', async function () {
      await assertRevert(sale.investETH({ from: accounts[1], value: web3.toWei(1, 'ether') }));
    });
 
    describe('with SPA defined', async function () {
      beforeEach(async function () {
        await sale.defineSPA(sharePurchaseAgreementHash);
      });

      it('should let user accept SPA', async function () {
        const tx = await sale.acceptSPA(sharePurchaseAgreementHash, { from: accounts[2] });
        assert.equal(parseInt(tx.receipt.status), 1, 'Status');
      });

      it('should let user accept with a wrong SPA', async function () {
        await assertRevert(sale.acceptSPA(web3.sha3('wrong spa'), { from: accounts[2] }));
      });

      it('should not let a non user accept SPA', async function () {
        await assertRevert(sale.acceptSPA(sharePurchaseAgreementHash, { from: accounts[0] }));
      });

      it('should not let user invest while accepting SPA', async function () {
        await assertRevert(
          sale.acceptSPA(
            sharePurchaseAgreementHash,
            { from: accounts[0], value: web3.toWei(1, 'ether') }
          )
        );
      });
    });
  });

  describe('during the sale', async function () {
    beforeEach(async function () {
      await sale.updateInvestorLimits([ 6 ], 80000000);
      await sale.updateSchedule(dayMinusOneTime, dayPlusOneTime);
    });

    it('should have a start date', async function () {
      const startAt = await sale.startAt();
      assert.ok(startAt.toNumber(), dayMinusOneTime, 'startAt');
    });

    it('should have a end date', async function () {
      const endAt = await sale.endAt();
      assert.ok(endAt.toNumber(), dayPlusOneTime, 'endAt');
    });

    describe('with SPA Defined, allocations defined, rate defined', async function () {
      beforeEach(async function () {
        await ratesProvider.defineETHCHFRate(2072333, 2);
        await sale.defineSPA(sharePurchaseAgreementHash);
        await sale.allocateManyTokens([ accounts[2], accounts[3] ], [ 500, 4000 ]);
      });

      it('should not allow 0 off chain investment', async function () {
        await assertRevert(sale.addOffChainInvestment(accounts[2], 0));
      });

      it('should not allow small off chain investment below minimal investment', async function () {
        await assertRevert(sale.addOffChainInvestment(accounts[2], 24999));
      });

      it('should allow small off chain investment over allocations', async function () {
        const tx = await sale.addOffChainInvestment(accounts[2], 25000);
        assert.equal(parseInt(tx.receipt.status), 1, 'Status');
        assert.equal(tx.logs.length, 1, 'events');
        assert.equal(tx.logs[0].event, 'Investment', 'event');
        assert.equal(tx.logs[0].args.investorId.toNumber(), 2, 'investorId');
        assert.equal(tx.logs[0].args.spentCHF.toNumber(), 25000, 'tokens');
      });

      it('should allow off chain investment over allocations', async function () {
        const tx = await sale.addOffChainInvestment(accounts[6], 10000000);
        assert.equal(parseInt(tx.receipt.status), 1, 'Status');
        assert.equal(tx.logs.length, 1, 'events');
        assert.equal(tx.logs[0].event, 'Investment', 'event');
        assert.equal(tx.logs[0].args.investorId.toNumber(), 6, 'investorId');
        assert.equal(tx.logs[0].args.spentCHF.toNumber(), 10000000, 'tokens');
      });

      it('should allow accept SPA with value and above allocations', async function () {
        const tx = await sale.acceptSPA(sharePurchaseAgreementHash,
          { from: accounts[2], value: web3.toWei(0.1, 'ether') });
        assert.equal(parseInt(tx.receipt.status), 1, 'Status');
        assert.equal(tx.logs.length, 2);
        assert.equal(tx.logs[0].event, 'ChangeETHCHF', 'event');
        assert.equal(tx.logs[0].args.investor, accounts[2], 'investor');
        assert.equal(formatETH(tx.logs[0].args.amount), 0.099, 'amount change');
        assert.equal(tx.logs[0].args.converted.toNumber(), 207000, 'converted');
        assert.equal(tx.logs[0].args.rate.toNumber(), 482547930279, 'rate');
        assert.equal(tx.logs[1].event, 'Investment', 'event');
        assert.equal(tx.logs[1].args.investorId.toNumber(), 2, 'investorId');
        assert.equal(tx.logs[1].args.spentCHF.toNumber(), 207000, 'spentCHF');
      });

      it('should allow accept SPA with value and below allocations', async function () {
        const tx = await sale.acceptSPA(sharePurchaseAgreementHash,
          { from: accounts[2], value: web3.toWei(0.1, 'ether') });
        assert.equal(parseInt(tx.receipt.status), 1, 'Status');
        assert.equal(tx.logs.length, 2);
        assert.equal(tx.logs[0].event, 'ChangeETHCHF', 'event');
        assert.equal(tx.logs[0].args.investor, accounts[2], 'investor');
        assert.equal(formatETH(tx.logs[0].args.amount), 0.099, 'amount change');
        assert.equal(tx.logs[0].args.converted.toNumber(), 207000, 'converted');
        assert.equal(tx.logs[0].args.rate.toNumber(), 482547930279, 'rate');
        assert.equal(tx.logs[1].event, 'Investment', 'event');
        assert.equal(tx.logs[1].args.investorId.toNumber(), 2, 'investorId');
        assert.equal(tx.logs[1].args.spentCHF.toNumber(), 207000, 'spentCHF');
      });

      it('should allow accept SPA with value and no allocations', async function () {
        const tx = await sale.acceptSPA(sharePurchaseAgreementHash,
          { from: accounts[3], value: web3.toWei(0.1, 'ether') });

        assert.equal(parseInt(tx.receipt.status), 1, 'Status');
        assert.equal(tx.logs.length, 2);
        assert.equal(tx.logs[0].event, 'ChangeETHCHF', 'event');
        assert.equal(tx.logs[0].args.investor, accounts[3], 'investor');
        assert.equal(formatETH(tx.logs[0].args.amount), 0.099, 'amount change');
        assert.equal(tx.logs[0].args.converted.toNumber(), 207000, 'converted');
        assert.equal(tx.logs[0].args.rate.toNumber(), 482547930279, 'rate');
        assert.equal(tx.logs[1].event, 'Investment', 'event');
        assert.equal(tx.logs[1].args.investorId.toNumber(), 3, 'investorId');
        assert.equal(tx.logs[1].args.spentCHF.toNumber(), 207000, 'spentCHF');
      });
 
      describe('and some investment already done', async function () {
        beforeEach(async function () {
          await sale.addOffChainInvestment(accounts[4], 9500000);
          await sale.acceptSPA(sharePurchaseAgreementHash,
            { from: accounts[4], value: web3.toWei(0.1, 'ether') });
          await sale.acceptSPA(sharePurchaseAgreementHash,
            { from: accounts[3], value: web3.toWei(0.2, 'ether') });
        });

        it('should transfer value', async function () {
          const wei = web3.toWei(0.1, 'ether');
          await new Promise((resolve, reject) => web3.eth.sendTransaction({
            from: accounts[3],
            to: sale.address,
            value: wei,
            gas: 400000,
          }, (err, data) => {
            if (err) {
              reject(err);
            } else {
              resolve();
            }
          }));
        });

        it('should have availableSupply', async function () {
          const availableSupply = await sale.availableSupply();
          assert.equal(availableSupply.toNumber(), 979758, 'availableSupply');
        });

        it('should have allocatedTokens', async function () {
          const allocatedTokens = await sale.allocatedTokens();
          assert.equal(allocatedTokens.toNumber(), 3672, 'allocatedTokens');
        });

        it('should have raised ETH', async function () {
          const raisedETH = await sale.raisedETH();
          assert.equal(formatETH(raisedETH), 0.299, 'raisedETH');
        });

        it('should have raised CHF', async function () {
          const raisedCHF = await sale.raisedCHF();
          assert.equal(raisedCHF.toNumber(), 9500000, 'raisedCHF');
        });

        it('should have total unspentETH', async function () {
          const unspentETH = await sale.totalUnspentETH();
          assert.equal(
            Math.round(Number(web3.fromWei(unspentETH, 'milli'))),
            0, 'total unspentETH');
        });

        it('should have total raised CHF', async function () {
          const totalRaisedCHF = await sale.totalRaisedCHF();
          assert.equal(totalRaisedCHF.toNumber(), 10121000, 'totalRaisedCHF');
        });

        it('should have refunded ETH', async function () {
          const refundedETH = await sale.totalRefundedETH();
          assert.equal(formatETH(refundedETH), 0, 'totalRefundedETH');
        });

        it('should have investor unspentETH for accounts2', async function () {
          const unspentETH = await sale.investorUnspentETH(4);
          assert.equal(formatETH(unspentETH, 'ether'), 0, 'unspentETH 4');
        });

        it('should have investor investedCHF for accounts2', async function () {
          const investedCHF = await sale.investorInvestedCHF(4);
          assert.equal(investedCHF.toNumber(), 9707000, 'invested CHF 4');
        });

        it('should have investor acceptedSPA for accounts2', async function () {
          const acceptedSPA = await sale.investorAcceptedSPA(4);
          assert.ok(acceptedSPA, 'acceptedSPA 4');
        });

        it('should have investorAllocations for accounts2', async function () {
          const allocations = await sale.investorAllocations(4);
          assert.equal(allocations.toNumber(), 0, 'allocations');
        });

        it('should have investorTokens for account4', async function () {
          const tokens = await sale.investorTokens(4);
          assert.equal(tokens.toNumber(), 19414, 'tokens 4');
        });

        it('should have investorLimit for account4', async function () {
          const investorLimit = await sale.investorLimit(4);
          assert.equal(investorLimit.toNumber(), 0, 'limit 4');
        });

        it('should have investor unspentETH for accounts3', async function () {
          const unspentETH = await sale.investorUnspentETH(3);
          assert.equal(formatETH(unspentETH), 0, 'unspentETH 3');
        });

        it('should have investor investedCHF for accounts3', async function () {
          const investedCHF = await sale.investorInvestedCHF(3);
          assert.equal(investedCHF.toNumber(), 414000, 'invested CHF 3');
        });

        it('should have investor acceptedSPA for accounts3', async function () {
          const acceptedSPA = await sale.investorAcceptedSPA(3);
          assert.ok(acceptedSPA, 'acceptedSPA 3');
        });

        it('should have investorAllocations for accounts3', async function () {
          const allocations = await sale.investorAllocations(3);
          assert.equal(allocations.toNumber(), 3172, 'allocations');
        });

        it('should have investorTokens for account3', async function () {
          const tokens = await sale.investorTokens(3);
          assert.equal(tokens.toNumber(), 828, 'tokens 3');
        });

        it('should have investorLimit for account3', async function () {
          const investorLimit = await sale.investorLimit(3);
          assert.equal(investorLimit.toNumber(), 0, 'investorLimit 3');
        });

        it('should have investor count', async function () {
          const count = await sale.investorCount();
          assert.equal(count.toNumber(), 2, 'count');
        });

        it('should let operator refund investor2 ETH', async function () {
          const tx = await sale.refundUnspentETH(accounts[2]);
          assert.equal(parseInt(tx.receipt.status), 1, 'Status');
          assert.equal(tx.logs.length, 0);
        });

        it('should let operator refund investor3 ETH', async function () {
          const tx = await sale.refundUnspentETH(accounts[3]);
          assert.equal(parseInt(tx.receipt.status), 1, 'Status');
          assert.equal(tx.logs.length, 1);
          assert.equal(tx.logs[0].event, 'WithdrawETH', 'event');
          assert.equal(tx.logs[0].args.receiver, accounts[3], 'accounts3');
          assert.equal(formatETH(tx.logs[0].args.amount), 0.000, 'amount withdraw');
        });

        it('should let operator refund investor2 and investor3 ETH', async function () {
          const tx = await sale.refundManyUnspentETH([ accounts[2], accounts[3] ]);
          assert.equal(parseInt(tx.receipt.status), 1, 'Status');
          assert.equal(tx.logs.length, 1);
          assert.equal(tx.logs[0].event, 'WithdrawETH', 'event');
          assert.equal(tx.logs[0].args.receiver, accounts[3], 'accounts3');
          assert.equal(formatETH(tx.logs[0].args.amount), 0, 'amount withdraw');
        });

        it('should allow withdraw ETH funds', async function () {
          const tx = await sale.withdrawETHFunds();
          assert.equal(parseInt(tx.receipt.status), 1, 'Status');
          assert.equal(tx.logs.length, 0);
        });
      });

      describe('and many investments already done', async function () {
        beforeEach(async function () {
          await sale.addOffChainInvestment(accounts[4], 7000000);
          await sale.addOffChainInvestment(accounts[3], 1200000);
          await sale.addOffChainInvestment(accounts[4], 2799999);
          await sale.acceptSPA(sharePurchaseAgreementHash,
            { from: accounts[3], value: web3.toWei(0.2, 'ether') });
          await sale.acceptSPA(sharePurchaseAgreementHash,
            { from: accounts[4], value: web3.toWei(0.1, 'ether') });
        });

        it('should throw if too much CHF investment is passed', async function () {
          await assertRevert(sale.addOffChainInvestment(accounts[3], 5000000));
        });

        it('should have availableSupply', async function () {
          const availableSupply = await sale.availableSupply();
          assert.equal(availableSupply.toNumber(), 977000, 'availableSupply');
        });

        it('should have allocatedTokens', async function () {
          const allocatedTokens = await sale.allocatedTokens();
          assert.equal(allocatedTokens.toNumber(), 1500, 'allocatedTokens');
        });

        it('should have raised ETH', async function () {
          const raisedETH = await sale.raisedETH();
          assert.equal(formatETH(raisedETH), 0.241, 'raisedETH');
        });

        it('should have raised CHF', async function () {
          const raisedCHF = await sale.raisedCHF();
          assert.equal(raisedCHF.toNumber(), 10999999, 'raisedCHF');
        });

        it('should have total raised CHF', async function () {
          const totalRaisedCHF = await sale.totalRaisedCHF();
          assert.equal(totalRaisedCHF.toNumber(), 11500000, 'totalRaisedCHF');
        });

        it('should have total unspentETH', async function () {
          const unspentETH = await sale.totalUnspentETH();
          assert.equal(
            Math.round(Number(web3.fromWei(unspentETH, 'milli'))),
            59, 'total unspentETH');
        });

        it('should have refunded ETH', async function () {
          const refundedETH = await sale.totalRefundedETH();
          assert.equal(formatETH(refundedETH), 0, 'totalRefundedETH');
        });

        it('should have investor unspentETH for accounts4', async function () {
          const unspentETH = await sale.investorUnspentETH(4);
          assert.equal(formatETH(unspentETH), 0.003, 'unspentETH 4');
        });

        it('should have investor investedCHF for accounts4', async function () {
          const investedCHF = await sale.investorInvestedCHF(4);
          assert.equal(investedCHF.toNumber(), 10000000, 'invested CHF 4');
        });

        it('should have investor acceptedSPA for accounts4', async function () {
          const acceptedSPA = await sale.investorAcceptedSPA(4);
          assert.ok(acceptedSPA, 'acceptedSPA 4');
        });

        it('should have investorAllocations for accounts4', async function () {
          const allocations = await sale.investorAllocations(4);
          assert.equal(allocations.toNumber(), 0, 'allocations');
        });

        it('should have investorTokens for account4', async function () {
          const tokens = await sale.investorTokens(4);
          assert.equal(tokens.toNumber(), 20000, 'tokens 4');
        });

        it('should have investorLimit for account4', async function () {
          const investorLimit = await sale.investorLimit(4);
          assert.equal(investorLimit.toNumber(), 0, 'limit 4');
        });

        it('should have investor unspentETH for accounts3', async function () {
          const unspentETH = await sale.investorUnspentETH(3);
          assert.equal(formatETH(unspentETH), 0.055, 'unspentETH 3');
        });

        it('should have investor investedCHF for accounts3', async function () {
          const investedCHF = await sale.investorInvestedCHF(3);
          assert.equal(investedCHF.toNumber(), 1500000, 'invested CHF 3');
        });

        it('should have investor acceptedSPA for accounts3', async function () {
          const acceptedSPA = await sale.investorAcceptedSPA(3);
          assert.ok(acceptedSPA, 'acceptedSPA 3');
        });

        it('should have investorAllocations for accounts3', async function () {
          const allocations = await sale.investorAllocations(3);
          assert.equal(allocations.toNumber(), 1000, 'allocations 3');
        });

        it('should have investorTokens for account3', async function () {
          const tokens = await sale.investorTokens(3);
          assert.equal(tokens.toNumber(), 3000, 'tokens 3');
        });

        it('should have investorLimit for account3', async function () {
          const investorLimit = await sale.investorLimit(3);
          assert.equal(investorLimit.toNumber(), 0, 'limit 3');
        });

        it('should have investor count', async function () {
          const count = await sale.investorCount();
          assert.equal(count.toNumber(), 2, 'count');
        });

        it('should let investor2 refund his ETH', async function () {
          const tx = await sale.refundUnspentETH(accounts[4]);
          assert.equal(parseInt(tx.receipt.status), 1, 'Status');
          assert.equal(tx.logs.length, 1);
          assert.equal(tx.logs[0].event, 'WithdrawETH', 'event');
          assert.equal(tx.logs[0].args.receiver, accounts[4], 'accounts2');
          assert.equal(formatETH(tx.logs[0].args.amount), 0.003, 'amount withdraw');
        });

        it('should let investor3 refund his ETH', async function () {
          const tx = await sale.refundUnspentETH(accounts[3]);
          assert.equal(parseInt(tx.receipt.status), 1, 'Status');
          assert.equal(tx.logs.length, 1);
          assert.equal(tx.logs[0].event, 'WithdrawETH', 'event');
          assert.equal(tx.logs[0].args.receiver, accounts[3], 'accounts3');
          assert.equal(formatETH(tx.logs[0].args.amount), 0.055, 'amount withdraw3');
        });

        it('should let investors refund his ETH', async function () {
          const tx = await sale.refundManyUnspentETH([ accounts[4], accounts[3] ]);
          assert.equal(parseInt(tx.receipt.status), 1, 'Status');
          assert.equal(tx.logs.length, 2);
          assert.equal(tx.logs[0].event, 'WithdrawETH', 'event');
          assert.equal(tx.logs[0].args.receiver, accounts[4], 'accounts4');
          assert.equal(formatETH(tx.logs[0].args.amount), 0.003, 'amount withdraw4');
          assert.equal(tx.logs[1].event, 'WithdrawETH', 'event');
          assert.equal(tx.logs[1].args.receiver, accounts[3], 'accounts3');
          assert.equal(formatETH(tx.logs[1].args.amount), 0.055, 'amount withdrawi3');
        });

        it('should allow withdraw ETH funds', async function () {
          const tx = await sale.withdrawETHFunds();
          assert.equal(parseInt(tx.receipt.status), 1, 'Status');
          assert.equal(tx.logs.length, 0);
        });

        describe('with some ETH in the vault', function () {
          beforeEach(async function () {
            await sale.fundETH({ value: web3.toWei(2, 'ether') });
          });

          it('should invest and auto withdraw', async function () {
            const tx = await sale.investETH({ from: accounts[5], value: web3.toWei(5, 'ether') });
            assert.equal(parseInt(tx.receipt.status), 1, 'Status');
            assert.equal(tx.logs.length, 3);
            assert.equal(tx.logs[0].event, 'ChangeETHCHF', 'event');
            assert.equal(tx.logs[0].args.investor, accounts[5], 'investor');
            assert.equal(formatETH(tx.logs[0].args.amount), 4.999, 'amount change');
            assert.equal(tx.logs[0].args.converted.toNumber(), 10361500, 'converted');
            assert.equal(tx.logs[0].args.rate.toNumber(), 482547930279, 'rate');
            assert.equal(tx.logs[1].event, 'Investment', 'event');
            assert.equal(tx.logs[1].args.investorId.toNumber(), 5, 'investorId');
            assert.equal(tx.logs[1].args.spentCHF.toNumber(), 10361500, 'spentCHF');
            assert.equal(tx.logs[2].event, 'WithdrawETH', 'event');
            assert.equal(tx.logs[2].args.receiver, vaultETH, 'vaultETH');
            assert.equal(formatETH(tx.logs[2].args.amount), 6.8, 'amount withdraw');
          });

          it('should let sale contract with a low ETH balance', async function () {
            const balanceETH = await web3.eth.getBalance(sale.address);
            assert.equal(web3.fromWei(balanceETH, 'ether').toNumber(), 2.3, 'balanceETH');
          });
        });
      });
    });
  });

  describe('after the sale', async function () {
    beforeEach(async function () {
      await sale.fundETH({ value: web3.toWei(1, 'ether') });
    });

    it('should allow withdraw ETH funds', async function () {
      const tx = await sale.withdrawETHFunds();
      assert.equal(parseInt(tx.receipt.status), 1, 'Status');
      assert.equal(tx.logs.length, 1);
    });
 
    it('should allow withdraw All ETH funds', async function () {
      const tx = await sale.withdrawAllETHFunds();
      assert.equal(parseInt(tx.receipt.status), 1, 'Status');
      assert.equal(tx.logs.length, 1);
      assert.equal(tx.logs[0].event, 'WithdrawETH', 'event');
      assert.equal(tx.logs[0].args.receiver, vaultETH, 'vaultETH');
      assert.equal(formatETH(tx.logs[0].args.amount), 1, 'amount withdraw');
    });
  });

  describe('scenario 1: CHF investor Kyc Lvl5', async function () {
    beforeEach(async function () {
      await sale.updateInvestorLimits([ 6 ], 80000000);
      await sale.updateSchedule(dayMinusOneTime, dayPlusOneTime);
      await ratesProvider.defineETHCHFRate(2072333, 2);
    });

    describe('invest some CHF', async function () {
      beforeEach(async function () {
        await sale.addOffChainInvestment(accounts[6], 40000000);
      });

      describe('some more CHF and too much ETH for his KYC', async function () {
        beforeEach(async function () {
          await sale.addOffChainInvestment(accounts[6], 39900000);
          await sale.investETH({ from: accounts[6], value: web3.toWei(0.1, 'ether') });
        });

        it('should have unspentETH', async function () {
          const unspentETH = await sale.investorUnspentETH(6);
          assert.equal(formatETH(unspentETH), 0.051, 'unspentETH');
        });

        it('should have investor investedCHF for accounts3', async function () {
          const investedCHF = await sale.investorInvestedCHF(6);
          assert.equal(investedCHF.toNumber(), 80000000, 'invested CHF');
        });

        it('should have total unspentETH', async function () {
          const unspentETH = await sale.totalUnspentETH();
          assert.equal(
            Math.round(Number(web3.fromWei(unspentETH, 'milli'))),
            52, 'total unspentETH');
        });

        it('should let operator withdraw his ETH', async function () {
          await sale.refundUnspentETH(accounts[6]);
        });
      });

      describe('some more ETH for his KYC', async function () {
        beforeEach(async function () {
          await sale.investETH({ from: accounts[6], value: web3.toWei(0.1, 'ether') });
        });

        it('should throw if more CHF overflow', async function () {
          await assertRevert(sale.addOffChainInvestment(accounts[6], 39900000));
        });

        it('should have unspentETH', async function () {
          const unspentETH = await sale.investorUnspentETH(6);
          assert.equal(formatETH(unspentETH), 0, 'unspentETH');
        });

        it('should have investor investedCHF for accounts3', async function () {
          const investedCHF = await sale.investorInvestedCHF(6);
          assert.equal(investedCHF.toNumber(), 40207000, 'invested CHF');
        });

        it('should have total unspentETH', async function () {
          const unspentETH = await sale.totalUnspentETH();
          assert.equal(
            Math.round(Number(web3.fromWei(unspentETH, 'milli'))),
            0, 'total unspentETH');
        });

        it('should let operator withdraw his ETH', async function () {
          await sale.refundUnspentETH(accounts[6]);
        });
      });
    });
  });
});
