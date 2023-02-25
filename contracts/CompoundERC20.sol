//SPDX-License-Identifier:MIT
pragma solidity ^0.8;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./interface/compound.sol";

import "hardhat/console.sol";

contract CompoundERC20 {
    IERC20 public token;
    CErc20 public cToken;

    constructor(address _token, address _cToken) {
        token = IERC20(_token);
        cToken = CErc20(_cToken);
    }

    //Supply token into the Pool
    function supply(uint256 _amount) external {
        token.transferFrom(msg.sender, address(this), _amount);
        token.approve(address(cToken), _amount);
        //If a number is equals zero that means token is minted
        require(cToken.mint(_amount) == 0, "mint failed");
    }

    function getCTokenbalance() external view returns (uint256) {
        //It will show the cToken balance of this account
        return cToken.balanceOf(address(this));
    }

    //Note: Not a view functions
    function getInfo()
        external
        returns (uint256 exchangeRate, uint256 supplyRate)
    {
        //Amount of current Exchange rate from cToken to underlying
        exchangeRate = cToken.exchangeRateCurrent();
        console.log("Exchange Rate:", exchangeRate);
        //Amount added to you supply balance this block / Interest Rate
        supplyRate = cToken.supplyRatePerBlock();
        console.log("Supply Rate:", supplyRate);
    }

    function estimateBalanceofUnderlying() external returns (uint256) {
        uint256 ctokenBal = cToken.balanceOf(address(this));
        uint256 exchangeRate = cToken.exchangeRateCurrent();
        uint256 decimals = 18; //DAI = 8 decimals
        uint256 CtokenDecimal = 8;
        console.log(
            "Estimated Balance of Underlying:",
            (ctokenBal * exchangeRate) / 10**(18 + decimals - CtokenDecimal)
        );
        return (ctokenBal * exchangeRate) / 10**(18 + decimals - CtokenDecimal);
    }

    //Direct method of getting balance
    function balanceUnderlying() external returns (uint256) {
        console.log(
            "Direct Function Balance of CToken:",
            cToken.balanceOfUnderlying(address(this))
        );
        return cToken.balanceOfUnderlying(address(this));
    }

    //Redeem function to sell the cToken
    function redeem(uint256 _amountCToken) external {
        require(cToken.redeem(_amountCToken) == 0, "Process failed");
    }
}
