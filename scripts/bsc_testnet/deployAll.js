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
    //const busdAddress = '0xDe5bd5c0d8c052f8E4884CeF01fbdfa34D864fbA';
    // Staking
    const initialIndex = '4547419269'; // default staking index
    const initialRewardRate = '4000'; // Initial reward rate for epoch
    // Block epoch
    const epochLengthInBlocks = '9600'; // 8 hr in BSC
    const firstEpochBlock = ((blockNumber * 1) + (30 * 60 / 3)) + ''; // next 30 min 12835700
    const firstEpochNumber = '0'; // ???
    // Bond
    const bondVestingLength = '144000'; // 5 days in BSC
    const busdBondBCV = '150'; // AVAX = 220
    const minBondPrice = '1000'; // 10$
    const maxBondPayout = '500'; // 0.5%
    //const maxBondPayout = '1000'; // 1%
    //const maxBondPayout = '50'
    const bondFee = '10000'; // 1%
    const maxBondDebt = '1000000000000000000000000'; // 1m bond
    const intialBondDebt = '0';
    // Deposit
    const depositBUSD = '2000000000000000000000'; // 2000 BUSD
    const reservedBUSD = '1000000000000'; // 1000 BUSD

    // ------------------------------

    // attach
    const ERC20Token = await ethers.getContractFactory("ERC20Token");
    const busd = await ERC20Token.deploy("BUSD Token", "BUSD", 18, "10000000000000000000000000"); // mint 10m BUSD
    //const busd = busdToken.attach(busdAddress);

    // Deploy
    const TemplarToken = await ethers.getContractFactory('TemplarToken');
    const templar = await TemplarToken.deploy();

    const SwordToken = await ethers.getContractFactory('SwordToken');
    const sword = await SwordToken.deploy();

    const Treasury = await ethers.getContractFactory('Treasury');
    const treasury = await Treasury.deploy(templar.address, busd.address, 0); // _blocksNeededForQueue = 0

    const BondingCalculator = await ethers.getContractFactory('BondingCalculator');
    const bondingCalculator = await BondingCalculator.deploy(templar.address);

    const Distributor = await ethers.getContractFactory('Distributor');
    const distributor = await Distributor.deploy(treasury.address, templar.address, epochLengthInBlocks, firstEpochBlock);

    const Staking = await ethers.getContractFactory('Staking');
    const staking = await Staking.deploy(templar.address, sword.address, epochLengthInBlocks, firstEpochNumber, firstEpochBlock);

    const StakingWarmup = await ethers.getContractFactory('StakingWarmup');
    const stakingWarmup = await StakingWarmup.deploy(staking.address, sword.address);

    const StakingHelper = await ethers.getContractFactory('StakingHelper');
    const stakingHelper = await StakingHelper.deploy(staking.address, templar.address);

    const RedeemHelper = await ethers.getContractFactory('RedeemHelper');
    const redeemHelper = await RedeemHelper.deploy();

    // Deploy Bond
    const BUSDBond = await ethers.getContractFactory('BondDepository');
    const busdBond = await BUSDBond.deploy(templar.address, busd.address, treasury.address, DAO.address, zeroAddress);

    // Setup Templar
    await templar.setVault(treasury.address);

    // Setup Sword
    await sword.initialize(staking.address);
    await sword.setIndex(initialIndex);

    // Setup Staking
    await staking.setContract('0', distributor.address);
    await staking.setContract('1', stakingWarmup.address);

    // Setup Distributor
    await distributor.addRecipient(staking.address, initialRewardRate);

    // Setup Bond
    await busdBond.setBondTerms(0, bondVestingLength);
    await sleep(2000);
    await busdBond.initializeBondTerms(busdBondBCV, bondVestingLength, minBondPrice, maxBondPayout, bondFee, maxBondDebt, intialBondDebt);
    await busdBond.setStaking(stakingHelper.address, true);

    // Setup RedeemHelper
    await redeemHelper.addBondContract(busdBond.address);

    // Setup Treasury
    // 0 = Reserve Depositor
    // 4 = Liquidity Deoisitor
    // 8 = Reserve Manager
    // 5 = isLiquidity Token
    await treasury.queue('0', deployer.address);
    await sleep(2000);
    await treasury.toggle('0', deployer.address, zeroAddress);

    await treasury.queue('4', deployer.address);
    await sleep(2000);
    await treasury.toggle('4', deployer.address, zeroAddress);

    await treasury.queue('8', distributor.address);
    await sleep(2000);
    await treasury.toggle('8', distributor.address, zeroAddress);
    
    // setup busd bond
    await treasury.queue('0', busdBond.address);
    await sleep(2000);
    await treasury.toggle('0', busdBond.address, zeroAddress);

    // Initial Deposit
    //await (await busd.connect(deployer)).approve(treasury.address, maxUint256);
    await busd.approve(treasury.address, maxUint256);
    await treasury.deposit(depositBUSD, busd.address, reservedBUSD); // mint 500 TEM

    // ------------------------------
    // Log
    // ------------------------------
    console.log( "BUSD: " + busd.address );
    console.log( "Templar: " + templar.address );
    console.log( "Sword: " + sword.address );
    console.log( "Treasury: " + treasury.address );
    console.log( "BondingCalculator: " + bondingCalculator.address );
    console.log( "Distributor: " + distributor.address );
    console.log( "Staking: " + staking.address );
    console.log( "StakingWarmpup: " + stakingWarmup.address );
    console.log( "StakingHelper: " + stakingHelper.address );
    console.log( "RedeemHelper: " + redeemHelper.address );
    console.log( "BUSDBond: " + busdBond.address );
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