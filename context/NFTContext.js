import React, { useEffect, useState } from 'react';
import Web3Modal from 'web3modal';
import { ethers } from 'ethers';
import axios from 'axios';

import { MarketAddress, MarketAddressABI } from './constants';

// Pinata IPFS Configuration
// Get API keys and gateway URL from environment variables
const pinataApiKey = process.env.NEXT_PUBLIC_PINATA_API_KEY;
const pinataSecretApiKey = process.env.NEXT_PUBLIC_PINATA_SECRET_API_KEY;
const pinataGateway = process.env.NEXT_PUBLIC_PINATA_GATEWAY || 'https://gateway.pinata.cloud/ipfs';

// IPFS content access base path
const endpointBasePath = `${pinataGateway}/`;

const fetchContract = (signerOrProvider) => new ethers.Contract(MarketAddress, MarketAddressABI, signerOrProvider);

export const NFTContext = React.createContext();

export const NFTProvider = ({ children }) => {
    const nftCurrency = 'BNB'; // BSC Testnet currency
    const [currentAccount, setCurrentAccount] = useState('');
    const [isLoadingNFT, setIsLoadingNFT] = useState(false);

    const checkIfWalletIsConnect = async () => {
        if (!window.ethereum) return alert('Please install MetaMask.');

        const accounts = await window.ethereum.request({ method: 'eth_accounts' });
        if (accounts.length) {
            setCurrentAccount(accounts[0]);
        }
    };

    useEffect(() => {
        checkIfWalletIsConnect();
    }, []);

    const connectWallet = async () => {
        if (!window.ethereum) return alert('Please install MetaMask.');

        const accounts = await window.ethereum.request({
            method: 'eth_requestAccounts',
        });

        setCurrentAccount(accounts[0]);
        window.location.reload();
    };

    // Upload file to IPFS (via Pinata)
    const uploadToIPFS = async (file) => {
        try {
            const formData = new FormData();
            formData.append('file', file);

            const metadata = JSON.stringify({
                name: `NFT-${Date.now()}`,
            });
            formData.append('pinataMetadata', metadata);

            const options = JSON.stringify({
                cidVersion: 0,
            });
            formData.append('pinataOptions', options);

            const response = await axios.post(
                'https://api.pinata.cloud/pinning/pinFileToIPFS',
                formData,
                {
                    maxBodyLength: 'Infinity',
                    headers: {
                        pinata_api_key: pinataApiKey,
                        pinata_secret_api_key: pinataSecretApiKey,
                    },
                },
            );

            const url = `${endpointBasePath}${response.data.IpfsHash}`;
            return url;
        } catch (error) {
            if (error.response) {
                if (error.response.data.reason === 'NO_SCOPES_FOUND') {
                    alert('API key permission error! Please check if your Pinata API key has pinFileToIPFS permission. Check console for details.');
                } else if (error.response.status === 401) {
                    alert('Invalid API key! Please check Pinata key configuration in .env.local file.');
                } else {
                    alert(`Upload failed: ${error.response.data.error || 'Unknown error'}`);
                }
            } else {
                alert('Network error, please check your internet connection');
            }
            throw error;
        }
    };

    const createSale = async (url, formInputPrice, isReselling, id) => {
        // Validate price input
        if (!formInputPrice || formInputPrice === '') {
            alert('Please enter a price');
            throw new Error('Price cannot be empty');
        }

        // Check if it's a valid number
        const priceNum = parseFloat(formInputPrice);
        if (isNaN(priceNum) || priceNum <= 0) {
            alert('Please enter a valid price (must be greater than 0)');
            throw new Error('Invalid price');
        }

        try {
            // Check if MetaMask is installed
            if (!window.ethereum) {
                alert('Please install MetaMask to continue');
                throw new Error('MetaMask not installed');
            }

            console.log('Connecting to wallet...');
            const web3Modal = new Web3Modal();
            const connection = await web3Modal.connect();
            const provider = new ethers.providers.Web3Provider(connection);
            const signer = provider.getSigner();

            const price = ethers.utils.parseUnits(formInputPrice.toString(), 'ether');
            const contract = fetchContract(signer);
            const listingPrice = await contract.getListingPrice();

            console.log('Creating transaction...', { isReselling, id, price: formInputPrice });
            const transaction = !isReselling
                ? await contract.createToken(url, price, {
                    value: listingPrice.toString(),
                })
                : await contract.resellToken(id, price, {
                    value: listingPrice.toString(),
                });

            setIsLoadingNFT(true);
            await transaction.wait();
            setIsLoadingNFT(false);
        } catch (error) {
            setIsLoadingNFT(false);
            console.error('Error in createSale:', error);

            if (error.code === 4001) {
                alert('Transaction cancelled by user');
            } else if (error.code === -32002) {
                alert('Please connect your wallet in MetaMask');
            } else if (error.message && error.message.includes('user rejected')) {
                alert('Transaction rejected by user');
            } else {
                alert(`Transaction failed: ${error.message || 'Unknown error'}`);
            }
            throw error;
        }
    };

    // Create NFT - Upload metadata and call smart contract
    const createNFT = async (formInput, fileUrl, router) => {
        const { name, description, price } = formInput;

        if (!name || !description || !price || !fileUrl) {
            alert('Please fill in all fields and upload an image');
            return;
        }

        // Validate price input validity
        const priceNum = parseFloat(price);
        if (isNaN(priceNum) || priceNum <= 0) {
            alert('Please enter a valid price (must be greater than 0)');
            return;
        }

        try {
            // Check if API keys are configured
            if (!pinataApiKey || !pinataSecretApiKey) {
                alert('Pinata API key not configured! Please check .env.local file');
                return;
            }

            // Upload JSON metadata to Pinata
            const response = await axios.post(
                'https://api.pinata.cloud/pinning/pinJSONToIPFS',
                {
                    pinataContent: {
                        name,
                        description,
                        image: fileUrl
                    },
                    pinataMetadata: {
                        name: `${name}-metadata`,
                    },
                },
                {
                    headers: {
                        'Content-Type': 'application/json',
                        pinata_api_key: pinataApiKey,
                        pinata_secret_api_key: pinataSecretApiKey,
                    },
                },
            );

            const url = endpointBasePath + response.data.IpfsHash;
            await createSale(url, price);

            router.push('/');
        } catch (error) {
            if (error.message && error.message.includes('createSale')) {
                alert('Smart contract call failed! Please ensure:\n1. Wallet is connected to BSC Testnet\n2. You have enough BNB for gas fees\n3. Contract address is configured correctly');
            } else if (error.response) {
                if (error.response.data.reason === 'NO_SCOPES_FOUND') {
                    alert('API key permission error! Please check if your Pinata API key has pinJSONToIPFS permission.\nPlease create a new API key with Admin permissions.');
                } else if (error.response.status === 401) {
                    alert('Invalid API key! Please check Pinata key configuration in .env.local file.');
                } else if (error.response.status === 402) {
                    alert('Pinata account quota exceeded! Please check your Pinata account.');
                } else {
                    alert(`Pinata upload failed: ${error.response.data.error || error.response.data.message || 'Unknown error'}`);
                }
            } else if (error.code === 'ECONNABORTED') {
                alert('Request timeout, please check your internet connection and try again');
            } else {
                alert(`Failed to create NFT: ${error.message || 'Unknown error'}`);
            }
        }
    };

    // Fetch all NFTs from marketplace
    const fetchNFTs = async () => {
        setIsLoadingNFT(false);
        // Use BSC Testnet RPC node
        const provider = new ethers.providers.JsonRpcProvider(
            'https://data-seed-prebsc-1-s1.binance.org:8545/',
        );
        const contract = fetchContract(provider);
        const data = await contract.fetchMarketItems();

        const items = await Promise.all(
            data.map(async ({ tokenId, seller, owner, price: unformattedPrice }) => {
                const tokenURI = await contract.tokenURI(tokenId);
                try {
                    const { data: { image, name, description } } = await axios.get(tokenURI);
                    const price = ethers.utils.formatUnits(unformattedPrice.toString(), 'ether');

                    // Convert IPFS hash to full URL if needed
                    const imageUrl = image.startsWith('http') ? image : `${endpointBasePath}${image}`;

                    // return an object with relevant properties
                    return {
                        price,
                        tokenId: tokenId.toNumber(),
                        seller,
                        owner,
                        image: imageUrl,
                        name,
                        description,
                        tokenURI,
                    };
                } catch (error) {
                    if (error.response) {
                        if (error.response.status === 404) {
                            // Token URI not found - return null to filter out
                            return null;
                        } else if (error.response.status === 403) {
                            console.error('403 Error - Access denied:', tokenURI);
                            console.error('Possible reasons: IPFS gateway requires authentication or CORS restriction');
                            // Try using public IPFS gateway
                            if (tokenURI.includes('ipfs')) {
                                const hash = tokenURI.split('/ipfs/')[1];
                                if (hash) {
                                    try {
                                        const publicUrl = `https://ipfs.io/ipfs/${hash}`;
                                        console.log('Trying public gateway:', publicUrl);
                                        const { data: { image, name, description } } = await axios.get(publicUrl);
                                        const price = ethers.utils.formatUnits(unformattedPrice.toString(), 'ether');
                                        const imageUrl = image.startsWith('http') ? image : `${endpointBasePath}${image}`;
                                        return {
                                            price,
                                            tokenId: tokenId.toNumber(),
                                            seller,
                                            owner,
                                            image: imageUrl,
                                            name,
                                            description,
                                            tokenURI,
                                        };
                                    } catch (retryError) {
                                        console.error('Public gateway also failed:', retryError.message);
                                        return null;
                                    }
                                }
                            }
                            return null;
                        }
                    }
                    // Handle other errors - return null to filter out
                    console.error('Error fetching NFT metadata:', error.message);
                    return null;
                }
            }),
        );

        return items;
    };

    const fetchMyNFTsOrListedNFTs = async (type) => {
        setIsLoadingNFT(false);
        const web3Modal = new Web3Modal();
        const connection = await web3Modal.connect();
        const provider = new ethers.providers.Web3Provider(connection);
        const signer = provider.getSigner();

        const contract = fetchContract(signer);
        const data = type === 'fetchItemsListed'
            ? await contract.fetchItemsListed()
            : await contract.fetchMyNFTs();

        const items = await Promise.all(
            data.map(async ({ tokenId, seller, owner, price: unformattedPrice }) => {
                const tokenURI = await contract.tokenURI(tokenId);
                try {
                    const {
                        data: { image, name, description },
                    } = await axios.get(tokenURI);
                    const price = ethers.utils.formatUnits(
                        unformattedPrice.toString(),
                        'ether',
                    );

                    // Convert IPFS hash to full URL if needed
                    const imageUrl = image.startsWith('http') ? image : `${endpointBasePath}${image}`;

                    return {
                        price,
                        tokenId: tokenId.toNumber(),
                        seller,
                        owner,
                        image: imageUrl,
                        name,
                        description,
                        tokenURI,
                    };
                } catch (error) {
                    console.error('Failed to fetch NFT metadata:', tokenURI, error.message);
                    // If it's a 403 error, try using public gateway
                    if (error.response && error.response.status === 403 && tokenURI.includes('ipfs')) {
                        const hash = tokenURI.split('/ipfs/')[1];
                        if (hash) {
                            try {
                                const publicUrl = `https://ipfs.io/ipfs/${hash}`;
                                const { data: { image, name, description } } = await axios.get(publicUrl);
                                const price = ethers.utils.formatUnits(unformattedPrice.toString(), 'ether');
                                const imageUrl = image.startsWith('http') ? image : `${endpointBasePath}${image}`;
                                return {
                                    price,
                                    tokenId: tokenId.toNumber(),
                                    seller,
                                    owner,
                                    image: imageUrl,
                                    name,
                                    description,
                                    tokenURI,
                                };
                            } catch (retryError) {
                                return null;
                            }
                        }
                    }
                    return null;
                }
            }),
        );
        return items;
    };

    const buyNft = async (nft) => {
        const web3Modal = new Web3Modal();
        const connection = await web3Modal.connect();
        const provider = new ethers.providers.Web3Provider(connection);
        const signer = provider.getSigner();
        const contract = new ethers.Contract(
            MarketAddress,
            MarketAddressABI,
            signer,
        );

        const price = ethers.utils.parseUnits(nft.price.toString(), 'ether');
        const transaction = await contract.createMarketSale(nft.tokenId, {
            value: price,
        });

        setIsLoadingNFT(true);
        await transaction.wait();
        setIsLoadingNFT(false);
    };

    return (
        <NFTContext.Provider
            value={{
                nftCurrency,
                connectWallet,
                currentAccount,
                uploadToIPFS,
                createNFT,
                fetchNFTs,
                fetchMyNFTsOrListedNFTs,
                buyNft,
                createSale,
                isLoadingNFT,
            }}
        >
            {children}
        </NFTContext.Provider>
    );
};
