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

const assertJump = require('../../helpers/assertJump');
const assertRevert = require('../../helpers/assertRevert');
const PublicMultiSigWithRBAC = artifacts.require('../../contracts/multisig/public/PublicMultiSigWithRBAC.sol');

contract('PublicMultiSigWithRBAC', function (accounts) {
  let multiSig;
  let request;

  beforeEach(async function () {
    multiSig = await PublicMultiSigWithRBAC.new(100, 3600 * 24,
      [ accounts[0], accounts[1], accounts[2] ], // participants
      [ 100, 100, 200 ], // weights
      [ true, false, false], [ false, true, false ], [ false, false, true ]);
    request = multiSig.updateConfiguration.request(50, 3600 * 24 * 7);
  });

  describe('after initialization', function () {
    it('should return account 0 is suggester', async function () {
      const isSuggester = await multiSig.isSuggester(accounts[0]);
      assert.ok(isSuggester, 'account 0 is suggester');
    });

    it('should return account 1 is not suggester', async function () {
      const isSuggester = await multiSig.isSuggester(accounts[1]);
      assert.ok(!isSuggester, 'account 1 is not suggester');
    });

    it('should return account 0 is not approver', async function () {
      const isApprover = await multiSig.isApprover(accounts[0]);
      assert.ok(!isApprover, 'account 0 is not approver');
    });

    it('should return account 1 is approver', async function () {
      const isApprover = await multiSig.isApprover(accounts[1]);
      assert.ok(isApprover, 'account 1 is approver');
    });

    it('should return account 0 is not executor', async function () {
      const isExecutor = await multiSig.isExecuter(accounts[0]);
      assert.ok(!isExecutor, 'account 0 is not executor');
    });

    it('should return account 2 is executor', async function () {
      const isExecutor = await multiSig.isExecuter(accounts[2]);
      assert.ok(isExecutor, 'account 2 is not executor');
    });

    it('should allow suggester to suggest', async function () {
      const txReceipt = await multiSig.suggest(
        request.params[0].to, 0, request.params[0].data, { from: accounts[0] });
      assert.equal(parseInt(txReceipt.receipt.status), 1, 'success');
      assert.equal(txReceipt.logs.length, 1);
      assert.equal(txReceipt.logs[0].event, 'TransactionAdded');
    });

    it('should prevent non suggester to suggest', async function () {
      await assertRevert(multiSig.suggest(
        request.params[0].to, 0, request.params[0].data, { from: accounts[1] }));
    });

    describe('with a transaction (UpdateConfiguration) suggested', function () {
      beforeEach(async function () {
        const txReceipt = await multiSig.suggest(
          request.params[0].to, 0, request.params[0].data, { from: accounts[0] });
      });

      it('should allow approver to approve', async function () {
        const confirmationReceipt = await multiSig.approve(0, { from: accounts[1] });
        assert.equal(confirmationReceipt.logs.length, 1);
        assert.equal(confirmationReceipt.logs[0].event, 'TransactionConfirmed');
        assert.equal(confirmationReceipt.logs[0].args.transactionId, 0);
      });

      it('should prevent non approver to approve', async function () {
        await assertRevert(multiSig.approve(0, { from: accounts[0] }));
      });

      describe('and approved', function () {
        beforeEach(async function () {
          await multiSig.approve(0, { from: accounts[1] });
        });

        it('should let approver to revoke approval', async function () {
          const revokeReceipt = await multiSig.revokeApproval(0, { from: accounts[1] });
          assert.equal(revokeReceipt.logs.length, 1);
          assert.equal(revokeReceipt.logs[0].event, 'TransactionUnconfirmed');
          assert.equal(revokeReceipt.logs[0].args.transactionId, 0);
        });

        it('should prevent non approve to revoke approval', async function () {
          await assertRevert(multiSig.revokeApproval(0, { from: accounts[0] }));
        });

        it('should allow executer to execute', async function () {
          const isExecutable = await multiSig.isExecutable(0, { from: accounts[2] });
          assert.equal(isExecutable, true, 'isExecutable');
          const executionReceipt = await multiSig.execute(0, { from: accounts[2] });
          assert.equal(executionReceipt.logs.length, 2);
          assert.equal(executionReceipt.logs[0].event, 'ConfigurationUpdated');
          assert.equal(executionReceipt.logs[0].args.threshold, 50);
          assert.equal(executionReceipt.logs[0].args.duration.toNumber(), 3600 * 24 * 7);
          assert.equal(executionReceipt.logs[1].event, 'Execution');
          assert.equal(executionReceipt.logs[1].args.transactionId, 0);
        });

        it('should prevent non executer to execute', async function () {
          await assertRevert(multiSig.execute(0, { from: accounts[0] }));
       });
      });
    });

    it('should add participants as approver', async function () {
      let addParticipantRequest = multiSig.addParticipant.request(accounts[5], 100);
      await multiSig.suggest(
        addParticipantRequest.params[0].to, 0,
        addParticipantRequest.params[0].data, { from: accounts[0] });
      await multiSig.approve(0, { from: accounts[1] });
      await multiSig.execute(0, { from: accounts[2] });

      const isSuggester = await multiSig.isSuggester(accounts[5]);
      assert.ok(!isSuggester, 'is not suggester');
      const isApprover = await multiSig.isApprover(accounts[5]);
      assert.ok(isApprover, 'is approver');
      const isExecuter = await multiSig.isExecuter(accounts[5]);
      assert.ok(!isExecuter, 'is not executer');
    });

    it('should add many participants as approvers', async function () {
      let addParticipantRequest =
        multiSig.addManyParticipants.request([ accounts[5], accounts[6] ], [ 100, 50 ]);
      await multiSig.suggest(
        addParticipantRequest.params[0].to, 0,
        addParticipantRequest.params[0].data, { from: accounts[0] });
      await multiSig.approve(0, { from: accounts[1] });
      await multiSig.execute(0, { from: accounts[2] });

      const isSuggester5 = await multiSig.isSuggester(accounts[5]);
      assert.ok(!isSuggester5, 'account5 is not suggester');
      const isApprover5 = await multiSig.isApprover(accounts[5]);
      assert.ok(isApprover5, 'account5 is approver');
      const isExecuter5 = await multiSig.isExecuter(accounts[5]);
      assert.ok(!isExecuter5, 'account5 is not executer');
      const isSuggester6 = await multiSig.isSuggester(accounts[6]);
      assert.ok(!isSuggester6, 'account6 is not suggester');
      const isApprover6 = await multiSig.isApprover(accounts[6]);
      assert.ok(isApprover6, 'account6 is approver');
      const isExecuter6 = await multiSig.isExecuter(accounts[6]);
      assert.ok(!isExecuter6, 'account6 is not executer');
    });

    it('should add particpant with role', async function () {
      let addParticipantWithRolesRequest =
        multiSig.addParticipantWithRoles.request(accounts[5], 50, true, false, true);
      await multiSig.suggest(
        addParticipantWithRolesRequest.params[0].to, 0,
        addParticipantWithRolesRequest.params[0].data, { from: accounts[0] });
      await multiSig.approve(0, { from: accounts[1] });
      await multiSig.execute(0, { from: accounts[2] });

      const isSuggester = await multiSig.isSuggester(accounts[5]);
      assert.ok(isSuggester, 'account5 is suggester');
      const isApprover = await multiSig.isApprover(accounts[5]);
      assert.ok(!isApprover, 'account5 is not approver');
      const isExecuter = await multiSig.isExecuter(accounts[5]);
      assert.ok(isExecuter, 'account5 is executer');
    });

    it('should add many participants with roles', async function () {
      let addManyParticipantsWithRolesRequest =
        multiSig.addManyParticipantsWithRoles.request([ accounts[5], accounts[6] ],
          [ 50, 50 ], [ true, true ], [ false, false ], [ true, true ]);
      await multiSig.suggest(
        addManyParticipantsWithRolesRequest.params[0].to, 0,
        addManyParticipantsWithRolesRequest.params[0].data, { from: accounts[0] });
      await multiSig.approve(0, { from: accounts[1] });
      await multiSig.execute(0, { from: accounts[2] });

      const isSuggester = await multiSig.isSuggester(accounts[5]);
      assert.ok(isSuggester, 'account5 is suggester');
      const isApprover = await multiSig.isApprover(accounts[5]);
      assert.ok(!isApprover, 'account5 is not approver');
      const isExecuter = await multiSig.isExecuter(accounts[5]);
      assert.ok(isExecuter, 'account5 is executer');
    });

    it('should update participant role', async function () {
      let updateParticipantRolesRequest =
        multiSig.updateParticipantRoles.request(accounts[2], true, true, true);
      await multiSig.suggest(
        updateParticipantRolesRequest.params[0].to, 0,
        updateParticipantRolesRequest.params[0].data, { from: accounts[0] });
      await multiSig.approve(0, { from: accounts[1] });
      await multiSig.execute(0, { from: accounts[2] });

      const isSuggester = await multiSig.isSuggester(accounts[2]);
      assert.ok(isSuggester, 'account2 is suggester');
      const isApprover = await multiSig.isApprover(accounts[2]);
      assert.ok(isApprover, 'account2 is not approver');
      const isExecuter = await multiSig.isExecuter(accounts[2]);
      assert.ok(isExecuter, 'account2 is executer');
    });

    it('should update many participants with roles', async function () {
      let updateManyParticipantsRolesRequest =
        multiSig.updateManyParticipantsRoles.request([ accounts[1], accounts[2] ],
          [ true, true ], [ true, true ], [ true, true ]);
      await multiSig.suggest(
        updateManyParticipantsRolesRequest.params[0].to, 0,
        updateManyParticipantsRolesRequest.params[0].data, { from: accounts[0] });
      await multiSig.approve(0, { from: accounts[1] });
      await multiSig.execute(0, { from: accounts[2] });

      const isSuggester = await multiSig.isSuggester(accounts[2]);
      assert.ok(isSuggester, 'account2 is suggester');
      const isApprover = await multiSig.isApprover(accounts[2]);
      assert.ok(isApprover, 'account2 is not approver');
      const isExecuter = await multiSig.isExecuter(accounts[2]);
      assert.ok(isExecuter, 'account2 is executer');
    });
  });
});
