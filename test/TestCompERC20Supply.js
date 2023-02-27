const { ethers } = require("hardhat");

describe("Testing Supply and Redeem method of Compound", () => {
  let DAI, cToken, compound, compoundContract, daiToken, cDAIToken, signer;
  before("Getting Data", async () => {
    //DAI Token/Contract address
    DAI = "0x6B175474E89094C44Da98b954EedeAC495271d0F";
    //cDAI Token/Contract address 
    cToken = "0x5d3a536E4D6DbD6114cc1Ead35777bAB948E3643";
    //Getting Contract
    daiToken = await ethers.getContractAt("IERC20", DAI);
    cDAIToken = await ethers.getContractAt("CErc20", cToken);

    signer = await ethers.getSigner();
    //Deploy Compound Contract
    compound = await ethers.getContractFactory("CompoundERC20");
    compoundContract = await compound.deploy(DAI, cToken);
    await compoundContract.deployed();
  });

  const snapshot = async (compoundContract, daiToken, cDAIToken,address) => {
    let signerDaiBal = await daiToken.balanceOf(address);
    let tokenBal = await daiToken.balanceOf(compoundContract.address);
    let cTokenbal = await cDAIToken.balanceOf(compoundContract.address);
    return {
      daiBal:Number(signerDaiBal),
      TokenBal: tokenBal,
      cTokenBal: cTokenbal,
    };
  };

  it("Supply and Redeem", async () => {
    console.log("\n");
   
    //checking Balance of DAIToken and cDAITOKEN
    console.log("------------CHECKING BALANCE--------------");
    let checkF =await snapshot(compoundContract, daiToken, cDAIToken,signer.address);
    console.log("DAI BALANCE OF USER:",checkF.daiBal)
    console.log("DAI TOKEN BALANCE OF CONTRACT:", checkF.TokenBal);
    console.log("cDAI TOKEN BALANCE OF CONTRACT:", checkF.cTokenBal);
    console.log("-------------------END--------------------");
    console.log("\n");

    //Amount Going to supply
    const amountDeposited = 14785162117224010n;
    
    //Approving compound Contract to handle asset on behalf of msg.sender
    await daiToken
      .connect(signer)
      .approve(compoundContract.address, amountDeposited);
    
      //Supply Function
    await compoundContract.connect(signer).supply(amountDeposited);
    
    //Getting values
    console.log("-CHECKING EXCHANGE RATE,INTEREST RATE & ESTIMATED TOKEN BALANCE --------------");
    await compoundContract.getInfo();
    await compoundContract.estimateBalanceofUnderlying();
    await compoundContract.balanceUnderlying();
    console.log("------------------------END---------------------------------------");
    console.log("\n");
    
    //Checking after Supply
    console.log("------------CHECKING BALANCE AFTER MINTING SUPPLY--------------");
    let checkS =await snapshot(compoundContract, daiToken, cDAIToken,signer.address);
    console.log("DAI BALANCE OF USER:",checkS.daiBal)
    console.log("DAI TOKEN BALANCE OF CONTRACT:", checkF.TokenBal);
    console.log("cDAI TOKEN BALANCE OF CONTRACT:", checkF.cTokenBal);
    console.log("-------------------------END------------------------------------");
    console.log("\n"); 

      // Advance the block by 100 blocks
      for (let i = 0; i < 100; i++) {
        await ethers.provider.send('evm_increaseTime', [86400]); // 1 day in seconds
        await ethers.provider.send('evm_mine', []);
      }
    console.log("--CHECKING EXCHANGE/INTEREST RATE & ESTIMATED EARNING--")
    await compoundContract.getInfo();
    await compoundContract.balanceUnderlying();
    console.log("-----------------END---------------------");

    //Redeem Function
    //GET cTOKEN BALANCE OF CONTRACT
    let getCToken =await snapshot(compoundContract, daiToken, cDAIToken,signer.address);
    await compoundContract.connect(signer).redeem(getCToken.cTokenBal);
    console.log("\n")
    
    //Checking after Supply
    console.log("------------FINAL CHECK--------------");
    let checkT =await snapshot(compoundContract, daiToken, cDAIToken,signer.address);
    console.log("DAI BALANCE OF USER:",checkT.daiBal)
    console.log("DAI TOKEN BALANCE OF CONTRACT:", checkF.TokenBal);
    console.log("cDAI TOKEN BALANCE OF CONTRACT:", checkF.cTokenBal);
    console.log("-------------------------END-----------");
    console.log("\n");
    
  });
});
