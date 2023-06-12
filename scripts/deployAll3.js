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
    const swordAddress = '0xF78b7542802ACb9119f8D52107f9207bCf99DBB5'; 

    // Deploy
    const WrapSWORD = await ethers.getContractFactory('WrapSword');
    const wrapSword = await WrapSWORD.deploy(swordAddress);

    // ------------------------------
    // Log
    // ------------------------------
    console.log( "wSWORD: " + wrapSword.address );
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