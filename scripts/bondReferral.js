// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
const hre = require("hardhat");
const provider = hre.waffle.provider;

const swordTokenAddress = "0x8C9827Cd430d945aE5A5c3cfdc522f8D342334B9";
const deployerAddress = "0x8e762609CEa5Ddd3234B9d41Cf8D0d8b4f2581a6";
const bondsAddress = [
    { bond: "0x0d4f509b7D80Bfc7b3aaaEfC1C2edE4B362D8273", reserve: "0x1ede821daade714edade648f525ada0c5fe4ee3a" },
    { bond: "0xF171eFc8AD41Aabb798d466861dCd7144f973d62", reserve: "0xe9e7cea3dedca5984780bafc599bd69add087d56" },
    { bond: "0xe6F0A8E7a3550140495FfC17AB4dE44636278ee2", reserve: "0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c" },
    { bond: "0x3741008c8F1feBE5F2F82Fb5A6B0C1af404E48f7", reserve: "0x0e09fabb73bd3ade0a17ecc321fd13a19e81ce82" },
    { bond: "0x8BAAefCB8BD969F548aA3c6C71297063F694780F", reserve: "0x194d1D62d8d798Fcc81A6435e6d13adF8bcC2966" }
];
const busdTokenAddress = "0xe9e7cea3dedca5984780bafc599bd69add087d56";
const wbnbTokenAddress = "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c";

const test = true;

let deployer;
let poolFund;
let sword;
let bondReferral;
let busd;
let wbnb;
let busdBond;
let wbnbBond;

async function main() {
    // Hardhat always runs the compile task when running scripts with its command
    // line interface.
    //
    // If this script is run directly using `node` you may want to call compile
    // manually to make sure everything is compiled
    // await hre.run('compile');

    // ------------------------------
    logTitle("Deploy");
    // ------------------------------

    const [account1, account2] = await ethers.getSigners();
    deployer = await impersonateAddress(deployerAddress);
    const accountBusdFund = await impersonateAddress("0xaDf3D808Dc0E361551F5C944041DB13fe53A8928"); // 980k BUSD, 4000 BNB
    const accountWBNBFund = await impersonateAddress("0x945BCF562085De2D5875b9E2012ed5Fd5cfaB927"); // 1000 WBNB

    const ERC20Token = await ethers.getContractFactory('ERC20Token');
    sword = ERC20Token.attach(swordTokenAddress);
    busd = ERC20Token.attach(busdTokenAddress);
    wbnb = ERC20Token.attach(wbnbTokenAddress);

    const BondDepository = await ethers.getContractFactory('BondDepository');
    busdBond = BondDepository.attach(bondsAddress[1].bond);

    const BondDepositoryBNB = await ethers.getContractFactory('BondDepositoryETH');
    wbnbBond = BondDepositoryBNB.attach(bondsAddress[2].bond);

    // Deploy Pool Fund
    const PoolFund = await ethers.getContractFactory("PoolFund");
    poolFund = await PoolFund.connect(deployer).deploy(); 
    await poolFund.deployed();
    console.log("PoolFund:", poolFund.address);

    // Deploy Bond Referral
    const BondReferral = await ethers.getContractFactory("BondReferral");
    bondReferral = await BondReferral.connect(deployer).deploy(poolFund.address, sword.address); 
    await bondReferral.deployed();
    console.log("BondReferral:", bondReferral.address);

    // ------------------------------
    logTitle("Initial Contract");
    // ------------------------------

    // setup pool fund
    console.log(`\n- set poolFund.addPool()`);
    await poolFund.connect(deployer).addPool(bondReferral.address, sword.address);

    // setup referral
    console.log(`\n- set bondReferral.addReferralBonus()`);
    await bondReferral.connect(deployer).addReferralBonus(0, 5, 5); // 0, 0.5, 0.5
    await bondReferral.connect(deployer).addReferralBonus(100000000000, 10, 10); // 100, 1, 1
    await bondReferral.connect(deployer).addReferralBonus(500000000000, 15, 11); // 500, 1.5, 1.1
    await bondReferral.connect(deployer).addReferralBonus(1500000000000, 25, 12); // 1500, 2.5, 1.2
    await bondReferral.connect(deployer).addReferralBonus(3000000000000, 35, 15); // 3000, 3.5, 1.5
    await bondReferral.connect(deployer).addReferralBonus(5000000000000, 50, 20); // 5000, 5, 2

    if (test) {
        // test add/set/remove
        await bondReferral.connect(deployer).addReferralBonus(6000 * 10**9, 100, 25);
        await bondReferral.connect(deployer).removeReferralBonus(6);

        await bondReferral.connect(deployer).setReferralBonus(3, 0, 0, 0);
        await bondReferral.connect(deployer).setReferralBonus(3, 1500 * 10 **9, 15, 11);
    }

    const referralBonusLength = await bondReferral.referralBonusLength();
    console.log(`referralBonusLength:`, referralBonusLength * 1);
    for (var i = 0; i < referralBonusLength; i++) {
        const ref = await bondReferral.referralBonus(i);
        console.log(`referralBonus[${i}]:`, ref.referralAmount*1, ref.bonusReferral*1, ref.bonusDepositor*1);
    }
    
    console.log(`\n- set bondReferral.setBond()`);
    for (var i = 0; i < bondsAddress.length; i++) {
        await bondReferral.connect(deployer).setBond(i, bondsAddress[i].bond, bondsAddress[i].reserve);
    }

    if (test) {
        // test set / remove
        await bondReferral.connect(deployer).removeBond(1);

        await bondReferral.connect(deployer).setBond(0, bondsAddress[0].bond, bondsAddress[0].reserve);
        await bondReferral.connect(deployer).setBond(1, bondsAddress[1].bond, bondsAddress[1].reserve);
    }

    for (var i = 0; i < bondsAddress.length; i++) {
        const bond = await bondReferral.bonds(i);
        console.log(`bonds[${i}]:`, bond.bondDepositor, bond.reserve);
    }

    // transfer fund
    console.log(`\n- transfer sword to poolFund`);
    //console.log("deployer sword balance:", (await sword.balanceOf(deployer.address)) / 10**9);
    await sword.connect(deployer).transfer(poolFund.address, 1000*10**9); // 1000 SWORD
    console.log("poolFund sword balance:", (await bondReferral.rewardFundBalance()) / 10**9, "SWORD");

    // ------------------------------
    logTitle("BUSD Bond");
    // ------------------------------
    await logSwordBalance("Depositor", account1.address, false);
    await logSwordBalance("Referral", account2.address, false);
    await busd.connect(accountBusdFund).transfer(account1.address, toWei(100000)); // 100k BUSD

    console.log("\n- account1 address:", account1.address);
    console.log("account1 BUSD balance:", toETH(await busd.balanceOf(account1.address)), "BUSD");

    console.log(`\n- approve busd to bondReferral`);
    await busd.connect(account1).approve(bondReferral.address, toWei(100000)); 

    console.log(`\n- 1. bond 20000 BUSD`);
    await bondReferral.connect(account1).deposit(1, toWei(20000), 1000000000, account1.address, account2.address);
    await logSwordBalance("Depositor", account1.address, true);
    await logSwordBalance("Referral", account2.address, true);
    console.log("Referral Amount:", (await bondReferral.referralInfo(account2.address))[0] / 10**9);
    console.log("Referral Amount Bonus:", (await bondReferral.referralInfo(account2.address))[1] / 10**9);
    console.log("Referral Count:", (await bondReferral.referralInfo(account2.address))[2] * 1);

    console.log(`\n- 2. bond 1000 BUSD`);
    await bondReferral.connect(account1).deposit(1, toWei(1000), 1000000000, account1.address, account2.address);
    await logSwordBalance("Depositor", account1.address, true);
    await logSwordBalance("Referral", account2.address, true);
    console.log("Referral Amount:", (await bondReferral.referralInfo(account2.address))[0] / 10**9);
    console.log("Referral Amount Bonus:", (await bondReferral.referralInfo(account2.address))[1] / 10**9);
    console.log("Referral Count:", (await bondReferral.referralInfo(account2.address))[2] * 1);

    // ------------------------------
    logTitle("WBNB Bond");
    // ------------------------------
    await wbnb.connect(accountWBNBFund).transfer(account1.address, toWei(1000)); // 1000 WBNB

    console.log("\n- account1 address:", account1.address);
    console.log("account1 WBNB balance:", toETH(await wbnb.balanceOf(account1.address)), "WBNB");

    console.log(`\n- approve busd to bondReferral`);
    await wbnb.connect(account1).approve(bondReferral.address, toWei(100000)); 

    console.log(`\n- 1. bond 3 WBNB`);
    await bondReferral.connect(account1).deposit(2, toWei(3), 1000000000, account1.address, account2.address);
    await logSwordBalance("Depositor", account1.address, true);
    await logSwordBalance("Referral", account2.address, true);
    console.log("Referral Amount:", (await bondReferral.referralInfo(account2.address))[0] / 10**9);
    console.log("Referral Amount Bonus:", (await bondReferral.referralInfo(account2.address))[1] / 10**9);
    console.log("Referral Count:", (await bondReferral.referralInfo(account2.address))[2] * 1);

    // ------------------------------
    logTitle("BNB Bond");
    // ------------------------------
    await accountBusdFund.sendTransaction({
        to: account1.address,
        value: ethers.utils.parseEther("100") // 100 BNB
    });

    console.log("\n- account1 address:", account1.address);
    console.log("account1 BNB balance:", toETH(await getETHBalance(account1.address)), "BNB");

    console.log(`\n- 1. bond 5 BNB`);
    await bondReferral.connect(account1).deposit(2, toWei(5), 1000000000, account1.address, account2.address, {value: toWei(5)});
    await logSwordBalance("Depositor", account1.address, true);
    await logSwordBalance("Referral", account2.address, true);
    console.log("Referral Amount:", (await bondReferral.referralInfo(account2.address))[0] / 10**9);
    console.log("Referral Amount Bonus:", (await bondReferral.referralInfo(account2.address))[1] / 10**9);
    console.log("Referral Count:", (await bondReferral.referralInfo(account2.address))[2] * 1);

    // ------------------------------
    logTitle("All Bond");
    // ------------------------------
    const busdBondInfo = await busdBond.bondInfo(account1.address);
    console.log("BUSD Bond Payout:", busdBondInfo.payout / 10**9, ", vesting:", busdBondInfo.vesting/28800, ", lastBlock:", busdBondInfo.lastBlock*1, ", pricePaid:", busdBondInfo.pricePaid/10**18);
    
    const wbnbBondInfo = await wbnbBond.bondInfo(account1.address);
    console.log("WBNB Bond Payout:", wbnbBondInfo.payout / 10**9, ", vesting:", wbnbBondInfo.vesting/28800, ", lastBlock:", wbnbBondInfo.lastBlock*1, ", pricePaid:", wbnbBondInfo.pricePaid/10**18);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});

const impersonateAddress = async (address) => {
  await hre.network.provider.request({
    method: 'hardhat_impersonateAccount',
    params: [address],
  });
  const signer = await ethers.provider.getSigner(address);
  signer.address = signer._address;
  return signer;
};

async function getETHBalance(account) {
    return await provider.getBalance(account)
}

function toETH(amount) {
  return ethers.utils.formatEther(amount);
}

function toWei(amount) {
  return ethers.utils.parseEther(amount + "");
}

function minAmount(amount, slippage) {
  return amount * (1 - slippage / 100);
}

async function getBlockNumber() {
  return await ethers.provider.getBlockNumber();
}

function logTitle(title) {
    console.log(`\n// ------------------------------\n// ${title}\n// ------------------------------`);
}

let swordBalanceLog = [];
async function logSwordBalance(tag, account, log) {
    const swordBalance = await sword.balanceOf(account);
  
    if (log) {
      console.log(tag, "SWORD Balance:", (swordBalance) / 10**9, getBalanceChange(swordBalanceLog[account], swordBalance, 9));
    }
  
    swordBalanceLog[account] = swordBalance;
}

function getBalanceChange(balance1, balance2, decimal = 18) {
    diff = (balance2 - balance1) / 10**decimal;
    if (diff == 0) {
      return "";
    }
  
    return "(" + (diff > 0 ? "+" : "") + diff + ")";
}