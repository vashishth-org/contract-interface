import { ethers, run } from "hardhat";
import { Signer } from "ethers";
import "@nomiclabs/hardhat-web3";

export default class NFTManager {
    private signer: any;

    /**
     * Create an instance of NFTManager
     * @param _rpcUrl (optional) RPC url of the node
     * @param _privateKey (optional) Private key of the account
     */
    public constructor(_rpcUrl?: string, _privateKey?: string) {
        if (_rpcUrl && _privateKey) {
            const provider = new ethers.providers.JsonRpcProvider(_rpcUrl);
            this.signer = new ethers.Wallet(_privateKey, provider);
        }
    }

    /**
     * Add a signer to the NFTManager
     * @param signer Signer of the account
     * @returns NFTManager instance
     */
    public connect(signer: Signer): NFTManager {
        this.signer = signer;
        return this;
    }

    /**
     * Deploy a new NFT smart contract
     * @param tokenName Name of the token
     * @param tokenSymbol Symbol of the token
     * @returns Address of the deployed contract
     */
    public async deployContract(tokenName: string, tokenSymbol: string): Promise<string> {
        if (!this.signer) {
            throw new Error("Signer is not set");
        }

        await run('compile');
        const NFT = (await ethers.getContractFactory("NFT")).connect(this.signer);
        const contract = await NFT.deploy(tokenName, tokenSymbol);

        await contract.deployed();
        await this.txWait(contract.deployTransaction.hash, 2);

        return contract.address;
    }

    /**
     *  Verify the NFT smart contract
     * @param contractAddress Address of the contract
     * @param args Arguments of the function
     */
    public async verify(contractAddress: string, ...args: any[]) {
        await run("verify:verify", {
            address: contractAddress,
            constructorArguments: args,
        }).catch(e => {
            if (!e.message.toLowerCase().includes("already verified")) {
                throw e;
            }
        });
    }

    /**
     * Mint a new NFT
     * @param contractAddress Address of the contract
     * @param tokenURI URI of the token
     */
    public async mintNFT(contractAddress: string, tokenURI: string) {
        if (!this.signer) {
            throw new Error("Signer is not set");
        }

        const NFT = (await ethers.getContractFactory("NFT")).connect(this.signer);
        const contract = NFT.attach(contractAddress);

        const tx = await contract.mint(tokenURI);
        await this.txWait(tx.hash, 2);
        return tx.hash;
    }

    /**
     * Wait for a transaction confirmations on the network
     * @param txHash Transaction hash
     * @param confirmations Number of confirmations to wait for
     */
    private async txWait(txHash: string, confirmations: number) {
        const provider = this.signer.provider;
        const tx = await provider.getTransaction(txHash);
        let currentBlock = await provider.getBlockNumber();
        while (currentBlock - tx.blockNumber < confirmations) {
            await new Promise(resolve => setTimeout(resolve, 500));
            currentBlock = await provider.getBlockNumber();
        }
    }
}