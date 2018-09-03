pragma solidity ^0.4.24;

import "./PublicMultiSig.sol";


/**
 * @title SecretMultiSig
 * @dev SecretMultiSig contract
 * Use the KECCAK256 to hide the transaction details
 * The details only need to be revealed at the execution time
 *
 * @author Cyril Lapinte - <cyril.lapinte@mtpelerin.com>
 *
 * Error messages
 * E01: Only revealed transaction can be executed
 * E02: Transaction does not exist
 * E03: Transaction has already been revealed
 * E04: Revealed transaction hash does not matched
 */
contract SecretMultiSig is PublicMultiSig {

  struct SecretTransaction {
    bytes32 hash;
    bool revealed;
  }
  mapping(uint256 => SecretTransaction) internal privateTransactions;

  /**
   * @dev contructor
   **/
  constructor(
    uint256 _threshold,
    uint256 _duration,
    address[] _participants,
    uint256[] _weights
  ) PublicMultiSig(_threshold, _duration, _participants, _weights) public
  {
  }

  /**
   * @dev is the transaction revealed
   */
  function isRevealed(uint256 _transactionId) public view returns (bool) {
    return privateTransactions[_transactionId].revealed;
  }

  /**
   * @dev is the transaction executable
   */
  function isExecutable(uint256 _transactionId) public view returns (bool) {
    return isRevealed(_transactionId) && super.isExecutable(_transactionId);
  }

  /**
   * @dev execute the transaction if it has been revealed
   */
  function execute(uint256 _transactionId) public returns (bool) {
    require(isRevealed(_transactionId), "E01");
    return super.execute(_transactionId);
  }

  /**
   * @dev prepare a transaction hash
   */
  function buildHash(
    uint256 _transactionId,
    uint256 _salt,
    address _destination,
    uint256 _value,
    bytes _data
  ) public pure returns (bytes32)
  {
    return keccak256(
      abi.encode(
        _transactionId,
        _salt,
        _destination,
        _value,
        _data
      )
    );
  }

  /**
   * @dev execute the transaction hash without revealing it first
   */
  function executeHash(
    uint256 _transactionId,
    uint256 _salt,
    address _destination,
    uint256 _value,
    bytes _data
  ) public returns (bool)
  {
    revealHash(
      _transactionId,
      _salt,
      _destination,
      _value,
      _data
    );
    execute(_transactionId);
    return true;
  }

  /**
   * @dev suggest a new transaction
   */
  function suggest(address _destination, uint256 _value, bytes _data)
    public returns (bool)
  {
    privateTransactions[transactionCount] = SecretTransaction("", true);
    return super.suggest(_destination, _value, _data);
  }
 
  /**
   * @dev suggest a new transaction in providing the hash
   */
  function suggestHash(bytes32 _hash) public returns (bool) {
    require(_hash != "");
    privateTransactions[transactionCount] = SecretTransaction(_hash, false);
    transactions[transactionCount] = Transaction(
      0,
      0,
      "",
      0,
      false,
      false,
      msg.sender,
      // solium-disable-next-line security/no-block-members
      now,
      false
    );
    emit TransactionAdded(transactionCount);
    transactionCount++;
    return true;
  }

  /**
   * @dev reveal a transaction hash
   */
  function revealHash(
    uint256 _transactionId,
    uint256 _salt,
    address _destination,
    uint256 _value,
    bytes _data) public returns (bool)
  {
    require(_transactionId < transactionCount);
    SecretTransaction storage
      privateTransaction = privateTransactions[_transactionId];
    require(!privateTransaction.revealed, "E03");
    require(
      privateTransaction.hash == buildHash(
        _transactionId,
        _salt,
        _destination,
        _value,
        _data
      ),
      "E04"
    );

    privateTransaction.revealed = true;
    Transaction storage transaction = transactions[_transactionId];
    transaction.destination = _destination;
    transaction.value = _value;
    transaction.data = _data;
    emit TransactionRevealed(_transactionId);
    return true;
  }

  event TransactionRevealed(uint256 transactionId);
}
