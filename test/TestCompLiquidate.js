const { BigNumber } = require("ethers");
const { ethers } = require("hardhat");

describe("Compound Liquidate Test", () => {
  let DAI,
    cDAI,
    daiToken,
    cDAIToken,
    cETH,
    cETHToken,
    comp,
    compContract,
    liquidate,
    liquidateContract,
    supplyAccount,
    Liquidator;
  before("Initialize", async () => {
    DAI = "0x6B175474E89094C44Da98b954EedeAC495271d0F";
    cDAI = "0x5d3a536E4D6DbD6114cc1Ead35777bAB948E3643";
    cETH = "0x4Ddc2D193948926D02f9B1fE9e1daa0718270ED5";

    daiToken = await ethers.getContractAt("IERC20", DAI);
    cDAIToken = await ethers.getContractAt("CErc20", cDAI);
    cETHToken = await ethers.getContractAt("CEth", cETH);

    comp = await ethers.getContractFactory("TestCompoundLiquidate");
    compContract = await comp.deploy(cETH, DAI, cDAI);
    await compContract.deployed();

    liquidate = await ethers.getContractFactory("CompoundLiquidate");
    liquidateContract = await liquidate.deploy(DAI, cDAI);
    await liquidateContract.deployed();

    [Liquidator, supplyAccount] = await ethers.getSigners();
  });
  const snapshot = async (compContract, liquidateContract) => {
    const colFactor = await compContract.getCollateral();
    const liquidity = await compContract.getAccountLiquidity();
    const price = await compContract.getPriceFeed(cDAI);
    const closeF = await liquidateContract.getCloseFactor();
    const incentive = await liquidateContract.getLiquidationIncentive();
    const liquidated = await liquidateContract.getSupplyBalance(cETH);

    return {
      colFactor: colFactor / 1e16,
      liquidity: liquidity[0],
      shortfall: liquidity[1],
      Price: price,
      closeFactor: closeF,
      incentive: incentive,
      liquidated: liquidated,
    };
  };
  it("Testing Borrow Max and then liquidate", async () => {
    //Supplying ETH token
    await compContract.connect(supplyAccount).supply({
      value: ethers.utils.parseEther("1"),
    });
    //Checking balance after supply eth
    snapF = await snapshot(compContract, liquidateContract);
    console.log(`---CHECKING BALANCE AFTER SUPPLY---`);
    console.log(`Collateral factor: ${snapF.colFactor} %`);
    await compContract.getSupplyBalance();
    console.log("----------END------------");

    //enter market
    await compContract.connect(supplyAccount).enterMarket();

    //Borrow
    const liquidity = await compContract.getAccountLiquidity();
    let price = await compContract.getPriceFeed(cDAI);
    const multiplier = BigNumber.from(10).pow(18);

    const maxBorrow = BigNumber.from(liquidity[0]).mul(multiplier).div(price);

    /* // NOTE: tweak borrow amount for testing
    const borrowAmount = BigNumber.from(maxBorrow).mul(9999).div(10000); */

    console.log("---------------Enter the Market------------");
    console.log("Liquidity in Dollar: $", (liquidity[0] / 1e18).toFixed(4));
    console.log("MaxBorrow in Dollar: $", (maxBorrow / 1e18).toFixed(4));
    console.log("---------------END-------------------");
    console.log("\n");

    //Borrow function
    //Using Liquidity Amount, to show shortfall greater than
    await compContract.connect(supplyAccount).borrow(liquidity[0]);
    console.log("--BORROWED BAL BEFORE MINING BLOCK--");
    await compContract.getBorrowedBalance();

    for (let i = 0; i < 10000; i++) {
      await ethers.provider.send("evm_increaseTime", [86400]); // 1 day in seconds
      await ethers.provider.send("evm_mine", []);
    }

    console.log("--BORROWED BAL BEFORE MINING BLOCK--");
    await compContract.getBorrowedBalance();
    console.log("\n");
    snapS = await snapshot(compContract, liquidateContract);
    console.log("--------CHECK LIQUIDITY AND SHORTFALL---------");
    console.log(`liquidity: $ ${snapS.liquidity / 1e18}`);
    console.log(`shortfall: $ ${snapS.shortfall / 1e18}`);
    console.log("\n");
    //LIQUIDATE
    const closeFactor = await liquidateContract.getCloseFactor();

    const borrowedBalance = await compContract.getBorrowedBalance();

    const amt = BigNumber.from(borrowedBalance).mul(closeFactor);
    const repayAmount = BigNumber.from(amt).div(1000000000000000000n);

    const liqBal = await daiToken.balanceOf(Liquidator.address);
    console.log(`liquidator balance: ${liqBal / 1e18}`);

    const amountToBeLiquidated = await liquidateContract
      .connect(Liquidator)
      .getAmountToBeLiquidated(DAI, cDAI, repayAmount);
    console.log("Amount To be Liquidated:", amountToBeLiquidated / 1e18);

    await tokenBorrow
      .connect(Liquidator)
      .approve(liquidateContract.address, repayAmount);
    //Paying back
    await liquidateContract
      .connect(Liquidator)
      .liquidate(compContract.address, repayAmount, cDAI);

    snapT = await snapshot(compContract, liquidateContract);
    console.log(`--- AFTER LIQUIDATED ---`);
    console.log(`close factor: ${snapT.closeFactor} %`);
    console.log(`liquidation incentive: ${snapT.incentive}`);
    console.log(`supplied: ${snapT.supplied}`);
    console.log(`liquidity: $ ${snapT.liquidity}`);
    console.log(`shortfall: $ ${snapT.shortfall}`);
    console.log(`liquidated: ${snapT.liquidated}`);
  });
});
