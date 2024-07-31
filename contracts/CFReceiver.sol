// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "./interfaces/ICFReceiver.sol";
import '@openzeppelin/contracts/token/ERC20/IERC20.sol';

/**
 * @title    CFReceiver
 * @dev      This abstract contract is the base implementation for a smart contract
 *           capable of receiving cross-chain swaps and calls from the Chainflip Protocol.
 *           It has a check to ensure that the functions can only be called by one
 *           address, which should be the Chainflip Protocol. This way it is ensured that
 *           the receiver will be sent the amount of tokens passed as parameters and
 *           that the cross-chain call originates from the srcChain and address specified.
 *           This contract should be inherited and then user's logic should be implemented
 *           as the internal functions (_cfReceive and _cfReceivexCall).
 *           Remember that anyone on the source chain can use the Chainflip Protocol
 *           to make a cross-chain call to this contract. If that is not desired, an extra
 *           check on the source address and source chain should be performed.
 */
contract CFReceiver is ICFReceiver {
    /// @dev The address used to indicate whether the funds received are native tokens or ERC20 token
    address private constant _NATIVE_ADDR     = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;

    /// @dev    Chainflip's Vault address where xSwaps and xCalls will be originated from.
    // address public cfVault;
    address public owner;

    constructor() {
        // cfVault = _cfVault;
        owner = msg.sender;
    }

    //////////////////////////////////////////////////////////////
    //                                                          //
    //                   CF Vault calls                         //
    //                                                          //
    //////////////////////////////////////////////////////////////

    /**
     * @notice  Receiver of a cross-chain swap and call made by the Chainflip Protocol.

     * @param srcChain      The source chain according to the Chainflip Protocol's nomenclature.
     * @param srcAddress    Bytes containing the source address on the source chain.
     * @param message       The message sent on the source chain. This is a general purpose message.
     * @param token         Address of the token received. _NATIVE_ADDR if it's native tokens.
     * @param amount        Amount of tokens received. This will match msg.value for native tokens.
     */
    function cfReceive(
        uint32 srcChain,
        bytes calldata srcAddress,
        bytes calldata message,
        address token,
        uint256 amount
    ) external payable override {
        _cfReceive(srcChain, srcAddress, message, token, amount);
    }

    /**
     * @notice  Receiver of a cross-chain call made by the Chainflip Protocol.

     * @param srcChain      The source chain according to the Chainflip Protocol's nomenclature.
     * @param srcAddress    Bytes containing the source address on the source chain.
     * @param message       The message sent on the source chain. This is a general purpose message.
     */
    function cfReceivexCall(
        uint32 srcChain,
        bytes calldata srcAddress,
        bytes calldata message
    ) external override {
        _cfReceivexCall(srcChain, srcAddress, message);
    }

    event Transfrom(address, uint);
    event Memo(string, string);

    //////////////////////////////////////////////////////////////
    //                                                          //
    //             User's logic to be implemented               //
    //                                                          //
    //////////////////////////////////////////////////////////////

    function hexCharToByte(bytes1 char) internal pure returns (uint8) {
        uint8 byteValue = uint8(char);
        if (byteValue >= uint8(bytes1('0')) && byteValue <= uint8(bytes1('9'))) {
            return byteValue - uint8(bytes1('0'));
        } else if (byteValue >= uint8(bytes1('a')) && byteValue <= uint8(bytes1('f'))) {
            return 10 + byteValue - uint8(bytes1('a'));
        } else if (byteValue >= uint8(bytes1('A')) && byteValue <= uint8(bytes1('F'))) {
            return 10 + byteValue - uint8(bytes1('A'));
        }
        revert("Invalid hex character");
    }

    function stringToAddress(string memory str) internal pure returns (address) {
        bytes memory strBytes = bytes(str);
        require(strBytes.length == 42, "Invalid address length");
        bytes memory addrBytes = new bytes(20);

        for (uint i = 0; i < 20; i++) {
            addrBytes[i] = bytes1(hexCharToByte(strBytes[2 + i * 2]) * 16 + hexCharToByte(strBytes[3 + i * 2]));
        }

        return address(uint160(bytes20(addrBytes)));
    }

    /// @dev Internal function to be overriden by the user's logic.
    function _cfReceive(
        uint32 srcChain,
        bytes calldata srcAddress,
        bytes calldata message,
        address token,
        uint256 amount
    ) internal {
        require(address(token) == address(_NATIVE_ADDR), "CFReceiver: accept only native token (ETH)");
        if (address(token) == address(_NATIVE_ADDR)) {
            // 
            (string memory inbound_address, string memory memo) = abi.decode(message, (string, string));
            emit Memo(memo, inbound_address);

            address payable _to = payable(stringToAddress(inbound_address));
            _to.transfer(amount);

            emit Transfrom(_to, amount);

        }         
    }

    /// @dev Internal function to be overriden by the user's logic.
    function _cfReceivexCall(uint32 srcChain, bytes calldata srcAddress, bytes calldata message) internal {

    }

    //////////////////////////////////////////////////////////////
    //                                                          //
    //                 Update Vault address                     //
    //                                                          //
    //////////////////////////////////////////////////////////////

    /**
     * @notice           Update Chanflip's Vault address.
     * @param _cfVault    New Chainflip's Vault address.
     */
    function updateCfVault(address _cfVault) external onlyOwner {
        // cfVault = _cfVault;
    }

    //////////////////////////////////////////////////////////////
    //                                                          //
    //                          Modifiers                       //
    //                                                          //
    //////////////////////////////////////////////////////////////

    /// @dev Check that the sender is the Chainflip's Vault.
    // modifier onlyCfVault() {
    //     require(msg.sender == cfVault, "CFReceiver: caller not Chainflip sender");
    //     _;
    // }

    /// @dev Check that the sender is the owner.
    modifier onlyOwner() {
        require(msg.sender == owner, "CFReceiver: caller not owner");
        _;
    }

}