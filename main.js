async function deployContract(contractABI, contractBytecode, signer, parameters) {  
    contractFactory = new ethers.ContractFactory(contractABI, contractBytecode, signer);
    contract = await contractFactory.deploy(...parameters);
    await contract.waitForDeployment();
  
    const contractAddress = await contract.getAddress();
    console.log('Contract deployed at:', contractAddress);
    return [contract, contractAddress];
}

const connectWalletButton = document.getElementById("connect-wallet-button");

const tokenNameInput = document.getElementById("token-name-input");
const tokenSymbolInput = document.getElementById("token-symbol-input");
const tokenSupplyInput = document.getElementById("token-supply-input");
const tokenTaglineInput = document.getElementById("token-tagline-input");
const tokenDescriptionInput = document.getElementById("token-description-input");
const tokenGreetingInput = document.getElementById("token-greeting-input");
const tokenVoiceInput = document.getElementById("token-voice-input");
const tokenAdditionalInfoInput = document.getElementById("token-additional-info-input");

const createTokenButton = document.getElementById("create-token-button");


const listingTokenAddressInput = document.getElementById("listing-token-address-input");
const listingTokenAmountInput = document.getElementById("listing-token-amount-input");
const listingTokenPriceInput = document.getElementById("listing-token-price-input");
const createTokenListingButton = document.getElementById("create-token-listing-button");

const refreshTokenListingsButton = document.getElementById("refresh-token-listings-button");
const exampleTokenListing = document.getElementById("example-token-listing");

async function setup() {
    // Connect to the network
    let provider = new ethers.BrowserProvider(window.ethereum, 'matic-amoy');

    async function connectWallet() {
        // Prompt the user to connect their MetaMask wallet
        await window.ethereum.request({ method: 'eth_requestAccounts' });
    
        // Get the signer
        signer = await provider.getSigner();
    
        connectWalletButton.innerText = `Connected Wallet: ${await signer.getAddress()}`;
    }
    
    let signer;
    connectWalletButton.addEventListener("click", connectWallet);

    const accounts = await window.ethereum.request({ method: 'eth_accounts' });
    if (accounts.length > 0) {
        connectWalletButton.innerText = `Connected Wallet: ${accounts[0]}`;
    }

    createTokenButton.addEventListener("click", async () => {
        if (!signer) await connectWallet();
        const contractResult = await deployContract(characterERC20.abi, characterERC20.data.bytecode.object, signer, [
            tokenNameInput.value,
            tokenSymbolInput.value,
            tokenSupplyInput.value,
            0,
            tokenTaglineInput.value,
            tokenDescriptionInput.value,
            tokenGreetingInput.value,
            tokenVoiceInput.value,
            tokenAdditionalInfoInput.value
        ]);
        alert("Successfully Created Token.");
        alert("Token Address: "+contractResult[1]);
    });


    createTokenListingButton.addEventListener("click", async () => {
        if (!signer) await connectWallet();

        const tokenContract = new ethers.Contract(listingTokenAddressInput.value, characterERC20.abi, signer);
        const approveTxn01 = await tokenContract.approve(config.marketplaceAddress, listingTokenAmountInput.value);
        await approveTxn01.wait();

        const marketplaceSmartContract = new ethers.Contract(config.marketplaceAddress, marketplaceContract.abi, signer);
        const createListingTxn01 = await marketplaceSmartContract.createListing(listingTokenAddressInput.value, ethers.parseUnits(String(listingTokenPriceInput.value), "ether"), listingTokenAmountInput.value);
        await createListingTxn01.wait();

        alert("Successfully Created Listing.");
    });

    exampleTokenListing.cloneNode(true);
    refreshTokenListingsButton.addEventListener("click", async () => {
        if (!signer) await connectWallet();

        const marketplaceSmartContract = new ethers.Contract(config.marketplaceAddress, marketplaceContract.abi, signer);
        const listedFts = await marketplaceSmartContract.getAllListedFTs();
        
        for (const child of [...exampleTokenListing.parentNode.children]) {
            if (child.id==="example-token-listing") continue;
            child.remove();
        }

        for (let i = 0; i < listedFts.length; i++) {
            const listing = listedFts[i];

            const tokenListing = exampleTokenListing.cloneNode(true);
            const tokenListingDescription = tokenListing.getElementsByClassName("token-listing-description")[0];
            const tokenListingBuyButton = tokenListing.getElementsByClassName("token-listing-buy-button")[0];
            const tokenListingBought = listing[3]!=="0x0000000000000000000000000000000000000000"?true:false;
            const tokenContract = new ethers.Contract(listing[1], characterERC20.abi, signer);

            const characterInfo = await tokenContract.characterInfo();
            tokenListingDescription.innerText = `Seller: ${listing[2]}
            Token Address: ${listing[1]}

            Character Name: ${await tokenContract.name()}
            Character Tagline: ${characterInfo[0]}
            Character Description: ${characterInfo[1]}
            Character Greeting: ${characterInfo[2]}
            Character Voice: ${characterInfo[3]}
            Character Additional Info: ${characterInfo[4]}

            Amount: ${listing[5]}
            Price: ${ethers.formatEther(listing[4])} Matic
            Status: ${tokenListingBought?"Sold":"Available"}
            Creation Time: ${new Date(parseInt(listing[6])*1000)}`;

            if (tokenListingBought) tokenListingBuyButton.innerText = "Sold";
            tokenListingBuyButton.addEventListener("click", async () => {
                if (tokenListingBought) {
                    alert("Token Listing Already Bought");
                    return;
                }
                const buyTxn01 = await marketplaceSmartContract.buyListing(listing[0], listing[1], {value: listing[4]});
                await buyTxn01.wait();

                alert("Successfully Bought Token Listing");
            });


            exampleTokenListing.parentElement.appendChild(tokenListing);
            tokenListing.style.removeProperty("display");
            tokenListing.id = "";
        }

    });
}
setup();
