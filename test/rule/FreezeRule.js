'user strict';

const assertRevert = require('../helpers/assertRevert');

var FreezeRule = artifacts.require('../../contracts/rule/FreezeRule.sol');

contract('FreezeRule', function (accounts) {
  let rule;
  
  const authority = accounts[1];
  const dayPlusOneTime = Math.floor((new Date()).getTime() / 1000) + 3600 * 24;
  const dayMinusOneTime = Math.floor((new Date()).getTime() / 1000) - 3600 * 24;

  beforeEach(async function () {
    rule = await FreezeRule.new();
    await rule.defineAuthority('REGULATOR', authority);
    await rule.freezeManyAddresses([ accounts[2], accounts[3] ], dayPlusOneTime, { from: authority });
    await rule.freezeManyAddresses([ accounts[4], accounts[5] ], dayMinusOneTime, { from: authority });
  });

  async function isAddressValid (address, expected) {
    const isAddressValid = await rule.isAddressValid(address);
    assert.ok(isAddressValid === expected, 'valid');
  };

  async function isTransferValid (sender, receiver, expected) {
    const isTransferValid = await rule.isTransferValid(sender, receiver, 100);
    assert.ok(isTransferValid === expected, 'valid');
  };

  it('should let authority freeze an address', async function () {
    const tx = await rule.freezeAddress(accounts[6], dayPlusOneTime, { from: authority });
    assert.equal(tx.receipt.status, '0x01', 'status');
    assert.equal(tx.logs.length, 1);
    assert.equal(tx.logs[0].event, 'Freeze');
    assert.equal(tx.logs[0].args._address, accounts[6]);
    assert.equal(tx.logs[0].args.until, dayPlusOneTime);
  });

  it('should not let owner freeze an address', async function () {
    await assertRevert(rule.freezeAddress(accounts[6], dayPlusOneTime));
  });

  it('should not let non owner, non authority freeze an address', async function () {
    await assertRevert(rule.freezeAddress(accounts[6], dayPlusOneTime, { from: accounts[6] }));
  });

  it('should let authority freeze several addresses', async function () {
    const tx = await rule.freezeManyAddresses([ accounts[6], accounts[7] ], dayPlusOneTime, { from: authority });
    assert.equal(tx.receipt.status, '0x01', 'status');
    assert.equal(tx.logs.length, 2);
    assert.equal(tx.logs[0].event, 'Freeze');
    assert.equal(tx.logs[0].args._address, accounts[6]);
    assert.equal(tx.logs[0].args.until, dayPlusOneTime);
    assert.equal(tx.logs[1].event, 'Freeze');
    assert.equal(tx.logs[1].args._address, accounts[7]);
    assert.equal(tx.logs[1].args.until, dayPlusOneTime);
  });

  it('should not let owner freeze many addresses', async function () {
    await assertRevert(rule.freezeManyAddresses([ accounts[6], accounts[7] ], dayPlusOneTime));
  });

  it('should not let non owner, non authority freeze many addresses', async function () {
    await assertRevert(rule.freezeManyAddresses(
      [ accounts[6], accounts[7] ], dayPlusOneTime, { from: accounts[6] }));
  });

  it('should be valid for the address of a valid user', async function () {
    await isAddressValid(accounts[0], true);
  });

  it('should be invalid for the address of a lock user', async function () {
    await isAddressValid(accounts[3], false);
  });

  it('should be valid for the address of a user no more frozen', async function () {
    await isAddressValid(accounts[5], true);
  });

  it('should be valid for transfer with both valid user', async function () {
    await isTransferValid(accounts[0], accounts[1], true);
  });

  it('should be invalid for transfer with receiver frozen', async function () {
    await isTransferValid(accounts[0], accounts[2], false);
  });

  it('should be invalid for transfer with sender frozen', async function () {
    await isTransferValid(accounts[2], accounts[0], false);
  });

  it('should be invalid for transfer with sender and receiver frozen', async function () {
    await isTransferValid(accounts[2], accounts[3], false);
  });

  it('should be valid for transfer with receiver no more invalid', async function () {
    await isTransferValid(accounts[0], accounts[4], true);
  });

  it('should be valid for transfer with sender no more invalid', async function () {
    await isTransferValid(accounts[4], accounts[0], true);
  });

  it('should be valid for transfer with sender and receiver no more invalid', async function () {
    await isTransferValid(accounts[4], accounts[5], true);
  });
});
