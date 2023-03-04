const { ethers } = require("hardhat");
const  BN  = require("bn.js");

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
    liquidateContract;
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
    [liquidateAccount, supplyAccount] = await ethers.getSigners();
  });
  const snapshot = async (compContract, liquidateContract) => {
    const colFactor = await compContract.getCollateral();
    const liquidity = await compContract.getAccountLiquidity();
    const price = await compContract.getPriceFeed(cDAI);
    /*const closeFactor = await liquidateContract.getCloseFactor();
    const incentive = await liquidateContract.getLiquidationIncentive();
    const liquidated = await liquidateContract.getSupplyBalance.call(
      C_TOKEN_SUPPLY
    ); */

    return {
      colFactor: colFactor / 1e16,
      //  supplied: supplied.div(pow(10, SUPPLY_DECIMALS - 2)) / 100,
      //  borrowed: borrowed.div(pow(10, BORROW_DECIMALS - 2)) / 100,
      //   price: price.div(pow(10, 18 - 2)) / 100,
      liquidity: liquidity[0],
      shortfall: liquidity[1],
      /*  closeFactor: closeFactor.div(pow(10, 18 - 2)),
      incentive: incentive.div(pow(10, 18 - 2)) / 100,
      liquidated: liquidated.div(pow(10, SUPPLY_DECIMALS - 4)) / 10000, */
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
    console.log("----------END------------");
    console.log("\n");

    //enter market
    await compContract.connect(supplyAccount).enterMarket();

    //Borrow
    const liquidity = await compContract.getAccountLiquidity();
    let price = await compContract.getPriceFeed(cDAI);
    const maxBorrow = liquidity[0] *(10 **18)/price;
    const borrowAmount = (maxBorrow * 9997) / 10000;
    console.log(maxBorrow/1e18) 
    console.log(borrowAmount);
    console.log("---------------Enter the Market------------");
    console.log("Liquidity in Dollar: $", liquidity[0]);
    // console.log("MaxBorrow in Dollar: $", maxBorrow.toFixed());
    console.log("---------------END-------------------");
    console.log("\n");
    
    // NOTE: tweak borrow amount for testing
    //const borrowAmount = (maxBorrow.toFixed() * 9997) / 10000;
    //Borrow function
    await compContract.connect(supplyAccount).borrow(borrowAmount);
    // await compContract.getBorrowedBalance();
    await compContract.getBorrowedBalance();

    for (let i = 0; i < 20000; i++) {
      await ethers.provider.send("evm_increaseTime", [86400]); // 1 day in seconds
      await ethers.provider.send("evm_mine", []);
    }

    await compContract.getBorrowedBalance();
    snapS = await snapshot(compContract, liquidateContract);
    console.log("--------After Few Blocks---------");
    console.log(`liquidity: $ ${snapS.liquidity}`);
    console.log(`shortfall: $ ${snapS.shortfall}`);
  });
});
