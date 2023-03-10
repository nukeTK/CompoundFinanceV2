const { BigNumber } = require("ethers");
const { ethers } = require("hardhat");

describe("CompoundERC20", () => {
  let DAI,
    cDAI,
    daiToken,
    cDAIToken,
    cETH,
    cETHToken,
    comp,
    compContract,
    signer;
  before("Initialize", async () => {
    DAI = "0x6B175474E89094C44Da98b954EedeAC495271d0F";
    cDAI = "0x5d3a536E4D6DbD6114cc1Ead35777bAB948E3643";
    cETH = "0x4Ddc2D193948926D02f9B1fE9e1daa0718270ED5";
    
    daiToken = await ethers.getContractAt("IERC20", DAI);
    cDAIToken = await ethers.getContractAt("CErc20", cDAI);
    cETHToken = await ethers.getContractAt("CEth", cETH);
    comp = await ethers.getContractFactory("CompoundETH");
    compContract = await comp.deploy(cETH);
    await compContract.deployed();
    signer = await ethers.getSigner();
  });

  const snapshot = async (compContract, daiToken) => {
    const _liquidity = await compContract.getAccountLiquidity();
    const _colFactor = await compContract.getCollateral();
    const _priceFeed = await compContract.getPriceFeed(cDAI);
    const borrowRate = await compContract.getBorrowedRatePerBlock(cDAI);
    const tokenToBorrowBal = await daiToken.balanceOf(compContract.address);
    return {
      colFactor: Number(_colFactor) / 1e16,
      liquidity: _liquidity[0],
      priceFeed: Number(_priceFeed) / 1e18,
      MaxBorrow: _liquidity[0]/_priceFeed,
      borrowRate,
      tokenToBorrowBal,
    };
  };

  it("Borrow and Repay", async () => {

    console.log("-------CHECK THE BALANCE OF ETH & cETH--------");
    console.log(
      "ETH:",
      ethers.utils.formatEther(
        (await ethers.provider.getBalance(signer.address)).toString()
      )
    );
    console.log("-----------------END--------------------");

    //Supplying ETH token
    await compContract.connect(signer).supply({
      value: ethers.utils.parseEther("10"),
    });
    
    const ethBal = await ethers.provider.getBalance(signer.address);
    
    console.log("\n");
    console.log("-------CHECK THE BALANCE OF ETH & cETH--------");
    console.log("ETH:", ethers.utils.formatEther(ethBal.toString()));
    console.log(
      "cETH of contract:",
      await cETHToken.balanceOf(compContract.address)
    );
    console.log(
      "Contract Balance cETH:",
      ethers.utils.formatUnits(
        (await compContract.getCTokenBalance()).toString(),
        8
      )
    );
    
    
    console.log("\n");
    console.log("--------------Before Borrow---------------");
    const snapshotF = await snapshot(compContract, daiToken);
    console.log("Collateral Factor:", snapshotF.colFactor + "%");
    console.log("Liquidity:", snapshotF.liquidity);
    console.log("Max Borrow:", Number(snapshotF.MaxBorrow));
    console.log("Price of cDAI in Dollar:", snapshotF.priceFeed);
    console.log("Borrow Rate Per Block:", Number(snapshotF.borrowRate));
    await compContract.balanceOfUnderlying();
    console.log("DAI Balance in Contract:", Number(snapshotF.tokenToBorrowBal));
    await compContract.getBorrowedBalance(cDAI);
    console.log("--------------END---------------");
    console.log("\n");
    
    
    //Borrow
    await compContract.connect(signer).borrow(cDAI, 8);
    
    
    console.log("--------------After Borrow---------------");
    const snapshotS = await snapshot(compContract, daiToken);
    console.log("Collateral Factor:", snapshotS.colFactor + "%");
    console.log("Liquidity:", snapshotS.liquidity);
    console.log("Max Borrow:", Number(snapshotS.MaxBorrow));
    console.log("Price of cDAI in Dollar:", snapshotS.priceFeed);
    console.log("Borrow Rate Per Block:", Number(snapshotS.borrowRate));
    await compContract.balanceOfUnderlying();
    console.log("DAI Balance in Contract:", Number(snapshotS.tokenToBorrowBal));
    await compContract.getBorrowedBalance(cDAI);
    console.log(
      "cETH of Contract:",
      await cETHToken.balanceOf(compContract.address)
    );
    console.log("--------------END---------------");

    // Advance the block by 100 blocks
    for (let i = 0; i < 100; i++) {
      await ethers.provider.send("evm_increaseTime", [86400]); // 1 day in seconds
      await ethers.provider.send("evm_mine", []);
    }
    
    console.log("\n");
    console.log("-----------Checking Interest------------");
    const snapshotT = await snapshot(compContract, daiToken);
    console.log("Liquidity:", snapshotT.liquidity);
    console.log("Max Borrow:", Number(snapshotT.MaxBorrow));
    console.log("DAI Balance in Contract:", Number(snapshotT.tokenToBorrowBal));
    await compContract.getBorrowedBalance(cDAI);
    console.log("----------------END----------------------");
    
    //Repay
    const daiBal = await daiToken.balanceOf(signer.address);
    await daiToken.connect(signer).transfer(compContract.address, daiBal);
    
    //Amount:A value of -1 (i.e. 2^256 - 1) can be used to repay the full amount
    const MAX_UINT = BigNumber.from(2).pow(256).sub(1);
    
    //Repay Function
    await compContract.connect(signer).repay(daiToken.address, cDAI, MAX_UINT);
    
    
    console.log("\n");
    console.log("-----------After Repay Full Amount------------");
    const snapshotFF = await snapshot(compContract, daiToken);
    console.log("Liquidity:", snapshotFF.liquidity);
    console.log("Max Borrow:", snapshotFF.MaxBorrow);
    console.log("DAI Balance in Contract:", snapshotF.tokenToBorrowBal);
    await compContract.getBorrowedBalance(cDAI);
    console.log("----------------END----------------------");
  });
});
