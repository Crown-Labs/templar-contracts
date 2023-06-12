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
    const lpTemDaiAddress = '0x0919ec43a32a3fe21ea82da46ac94eab94cb5eba'; // add lp
    const templarAddress = '0xaaec83e6E3F6afB5D808154eD13834eD141E4890';
    const treasuryAddress = '0x9c66BdA6B34C2Ac247B307F3FAB949c144D520FA';
    const bondingCalculatorAddress = '0x8c5a8fE9cc99c61cFD3337D867F81efb48B80AF5';
    const stakingHelperAddress = '0x557Cb93B560a0EF7755F291ce66a1d6aE01AeB07';
    const redeemHelperAddress = '0xCef577187d62CA6E6A8F23d0d3872323f94AB8D7';
    
    // Bond
    const bondVestingLength = '216000';// '144000'; // 5 days in BSC // <- 2 
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
    const lpBond = await LPBOND.deploy(templarAddress, lpTemDaiAddress, treasury.address, DAO.address, bondingCalculatorAddress);

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
    await treasury.queue('5', lpTemDaiAddress);
    await sleep(2000);
    await treasury.toggle('5', lpTemDaiAddress, bondingCalculatorAddress);
    // setup lp bond
    await treasury.queue('4', lpBond.address);
    await sleep(2000);
    await treasury.toggle('4', lpBond.address, zeroAddress);

    // ------------------------------
    // Log
    // ------------------------------
    console.log( "LP TEM-DAI: " + lpTemDaiAddress );
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