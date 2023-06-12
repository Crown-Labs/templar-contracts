// @dev. This script will deploy this V1.1 of Olympus. It will deploy the whole ecosystem except for the LP tokens and their bonds. 
// This should be enough of a test environment to learn about and test implementations with the Olympus as of V1.1.
// Not that the every instance of the Treasury's function 'valueOf' has been changed to 'valueOfToken'... 
// This solidity function was conflicting w js object property name

const { ethers } = require("hardhat");

async function main() {

    const [deployer, DAO] = await ethers.getSigners();
    const blockNumber = await ethers.provider.getBlockNumber();

    console.log('--------------------');
    console.log('Current blockNumber: ' + blockNumber);
    console.log('Deployer: ' + deployer.address); //0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
    console.log('DAO: ' + DAO.address); //0x70997970C51812dc3A010C7d01b50e0d17dc79C8
    console.log('--------------------');

    // Constants
    const zeroAddress = '0x0000000000000000000000000000000000000000';
    const maxUint256 = '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff';

    // ------------------------------
    // Config
    // ------------------------------
    const lpTemBusdAddress = '0x720cd5041Aa023E035a96307415AB98FB86303F5'; // add lp
    const templarAddress = '0xF79A3cf61432dC5148fC7E8B677EEfD2aE7b587E';
    const treasuryAddress = '0xDF57A8de8DC39aDC2CC58c5dD5A2C0aeE4CE0B19';
    const bondingCalculatorAddress = '0x0A6Cdd5af30b0C7426A6efAf3836daB241f66d39';
    const stakingHelperAddress = '0x4fd19763a52652Af85aE9c64392C9a5bB8849559';
    const redeemHelperAddress = '0x91613C3Fa3Ad1f5565812Ea2c4eC298137ff5dd3';
    
    // Bond
    const bondVestingLength = '144000'; // 5 days in BSC
    const lpBondBCV = '100'; // AVAX = 220
    const minBondPrice = '300'; // 9$
    const maxBondPayout = '500'; // 0.5%
    //const maxBondPayout = '1000'; // 1%
    const bondFee = '10000'; // 1%
    const maxBondDebt = '1000000000000000000000000'; // 1m bond
    const intialBondDebt = '0';
    // ------------------------------

    // attach
    const Treasury = await ethers.getContractFactory('Treasury');
    const treasury = await (Treasury.attach(treasuryAddress)).connect(deployer);

    const RedeemHelper = await ethers.getContractFactory('RedeemHelper');
    const redeemHelper = await (RedeemHelper.attach(redeemHelperAddress)).connect(deployer);

    // Deploy
    const LPBOND = await ethers.getContractFactory('BondDepository');
    const lpBond = await LPBOND.deploy(templarAddress, lpTemBusdAddress, treasury.address, DAO.address, bondingCalculatorAddress);

    // Setup Bond
    await lpBond.setBondTerms(0, bondVestingLength);
    await lpBond.initializeBondTerms(lpBondBCV, bondVestingLength, minBondPrice, maxBondPayout, bondFee, maxBondDebt, intialBondDebt);
    await lpBond.setStaking(stakingHelperAddress, true);

    // Setup RedeemHelper
    await redeemHelper.addBondContract(lpBond.address);

    // Setup Treasury
    // 0 = Reserve Depositor
    // 4 = Liquidity Deoisitor
    // 8 = Reserve Manager
    // 5 = isLiquidity Token
    await treasury.queue('5', lpTemBusdAddress);
    await sleep(2000);
    await treasury.toggle('5', lpTemBusdAddress, bondingCalculatorAddress);
    // setup lp bond
    await treasury.queue('4', lpBond.address);
    await sleep(2000);
    await treasury.toggle('4', lpBond.address, zeroAddress);

    // ------------------------------
    // Log
    // ------------------------------
    console.log( "LP TEM-BUSD: " + lpTemBusdAddress );
    console.log( "LPBond: " + lpBond.address );
}

main()
    .then(() => process.exit())
    .catch(error => {
        console.error(error);
        process.exit(1);
})

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}