const { BN } = require("bn.js");
const { BigNumber } = require("ethers");
const { ethers } = require("hardhat");

describe("CompoundERC20", () => {
  let DAI,
    cDAI,
    daiToken,
    cDAIToken,
    LINK,
    cLINK,
    linkToken,
    cLINKToken,
    comp,
    compContract,
    signer;
  before("Initialize", async () => {
    DAI = "0x6B175474E89094C44Da98b954EedeAC495271d0F";
    cDAI = "0x5d3a536E4D6DbD6114cc1Ead35777bAB948E3643";
    cLINK = "0xFAce851a4921ce59e912d19329929CE6da6EB0c7";
    daiToken = await ethers.getContractAt("IERC20", DAI);
    cDAIToken = await ethers.getContractAt("CErc20", cDAI);
    cLINKToken = await ethers.getContractAt("CErc20", cLINK);
    comp = await ethers.getContractFactory("CompoundERC20");
    compContract = await comp.deploy(DAI, cDAI);
    await compContract.deployed();
    signer = await ethers.getSigner();
    LINK = await ethers.getContractFactory("LINK");
    linkToken = await LINK.deploy();
    await linkToken.deployed();
  });

  const snapshot = async (compContract, linkToken) => {
    const _liquidity = await compContract.getAccountLiquidity();
    const _colFactor = await compContract.getCollateral();
    const _priceFeed = await compContract.getPriceFeed(cLINK);
    const borrowRate = await compContract.getBorrowedRatePerBlock(cLINK);
    const tokenToBorrowBal = await linkToken.balanceOf(compContract.address);
    return {
      colFactor: Number(_colFactor)/1e18 ,
      liquidity: Number(_liquidity[0]),
      priceFeed: Number(_priceFeed)/1e20,
      MaxBorrow: (Number(_priceFeed) / 1e30 / (Number(_liquidity[0]) / 1e18)),
      borrowRate,
      tokenToBorrowBal,
    };
  };

  it("Borrow and Repay", async () => {
    console.log("-------CHECK THE BALANCE OF DAI & LINK--------");
    console.log("DAI:",await daiToken.balanceOf(signer.address));
    console.log("cDAI:",await cDAIToken.balanceOf(signer.address));
    console.log("LINK:",await linkToken.balanceOf(signer.address));
    console.log("cLINK:",await cLINKToken.balanceOf(signer.address));
    console.log("-----------------END--------------------");

    //Supplying DAI token
    const amountDeposited = 10n ** 16n;
    await daiToken
      .connect(signer)
      .approve(compContract.address, amountDeposited);
    await compContract.connect(signer).supply(amountDeposited);
    console.log("\n");
    //Getting all the values before borrow
    console.log("--------------Before Borrow---------------");
    const snapshotF = await snapshot(compContract, linkToken);
    console.log("Collateral Factor:", snapshotF.colFactor + "%");
    console.log("Liquidity:", snapshotF.liquidity);
    console.log("Price of cLINK in Dollar:", snapshotF.priceFeed);
    console.log("Borrow Rate Per Block:", Number(snapshotF.borrowRate));
    console.log("Max Borrow:", Number(snapshotF.MaxBorrow));
    await compContract.balanceUnderlying();
    console.log(
      "LINK Balance in Contract:",
      Number(snapshotF.tokenToBorrowBal)
    );
    await compContract.getBorrowedBalance(cLINK);
    console.log("--------------END---------------");
    console.log("\n");
    //Borrow
    await compContract.connect(signer).borrow(cLINK, 8);

    console.log("--------------After Borrow---------------");
    const snapshotS = await snapshot(compContract, linkToken);
    console.log("Collateral Factor:", snapshotS.colFactor + "%");
    console.log("Liquidity:", snapshotS.liquidity);
    console.log("Price of cLINK in Dollar:", snapshotS.priceFeed);
    console.log("Borrow Rate Per Block:", Number(snapshotS.borrowRate));
    console.log("Max Borrow:", Number(snapshotS.MaxBorrow));
    console.log(
      "LINK Balance in Contract:",
      Number(snapshotS.tokenToBorrowBal)
    );
    await compContract.balanceUnderlying();
    await compContract.connect(signer).getBorrowedBalance(cLINK);

    console.log("--------------END---------------");
    // Advance the block by 100 blocks
    for (let i = 0; i < 100; i++) {
      await ethers.provider.send("evm_increaseTime", [86400]); // 1 day in seconds
      await ethers.provider.send("evm_mine", []);
    }
    console.log("\n");
    console.log("-----------Checking Interest------------");
    const snapshotT = await snapshot(compContract, linkToken);
    console.log("Liquidity:", snapshotT.liquidity);
    console.log("Max Borrow:", Number(snapshotT.MaxBorrow));
    console.log(
      "LINK Balance in Contract:",
      Number(snapshotT.tokenToBorrowBal)
    );
    await compContract.connect(signer).getBorrowedBalance(cLINK);
    console.log("----------------END----------------------");
    //Repay
    await linkToken.connect(signer).transfer(compContract.address, 10n ** 18n);
    //Amount:A value of -1 (i.e. 2^256 - 1) can be used to repay the full amount
    //Getting Error with this will fix it soon
    await compContract.connect(signer).repay(linkToken.address, cLINK,"1");
  });
});
