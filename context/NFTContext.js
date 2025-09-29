import React, { useEffect, useState } from 'react';
import Web3Modal from 'web3modal';
import { ethers } from 'ethers';
import axios from 'axios';

import { MarketAddress, MarketAddressABI } from './constants';

// Pinata configuration
const pinataApiKey = process.env.NEXT_PUBLIC_PINATA_API_KEY;
const pinataSecretApiKey = process.env.NEXT_PUBLIC_PINATA_SECRET_API_KEY;
const pinataGateway = process.env.NEXT_PUBLIC_PINATA_GATEWAY || 'https://gateway.pinata.cloud/ipfs';

// Use Pinata gateway for accessing IPFS content
const endpointBasePath = `${pinataGateway}/`;

const fetchContract = (signerOrProvider) => new ethers.Contract(MarketAddress, MarketAddressABI, signerOrProvider);

export const NFTContext = React.createContext();

export const NFTProvider = ({ children }) => {
    const nftCurrency = 'BNB';
    const [currentAccount, setCurrentAccount] = useState('');
    const [isLoadingNFT, setIsLoadingNFT] = useState(false);

    const checkIfWalletIsConnect = async () => {
        if (!window.ethereum) return alert('Please install MetaMask.');

        const accounts = await window.ethereum.request({ method: 'eth_accounts' });
        if (accounts.length) {
            setCurrentAccount(accounts[0]);
        } else {
            console.log('No accounts found');
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
            console.log(`Upload to IPFS url: ${url}`);

            return url;
        } catch (error) {
            console.error('Error uploading file to Pinata:', error);
            if (error.response) {
                console.error('Error details:', error.response.data);
                if (error.response.data.reason === 'NO_SCOPES_FOUND') {
                    alert('API密钥权限错误！请检查Pinata API密钥是否有pinFileToIPFS权限。查看控制台了解详情。');
                } else if (error.response.status === 401) {
                    alert('API密钥无效！请检查.env.local文件中的Pinata密钥配置。');
                } else {
                    alert(`上传失败：${error.response.data.error || '未知错误'}`);
                }
            } else {
                alert('网络错误，请检查网络连接');
            }
            throw error;
        }
    };

    const createSale = async (url, formInputPrice, isReselling, id) => {
        const web3Modal = new Web3Modal();
        const connection = await web3Modal.connect();
        const provider = new ethers.providers.Web3Provider(connection);
        const signer = provider.getSigner();

        const price = ethers.utils.parseUnits(formInputPrice, 'ether');
        const contract = fetchContract(signer);
        const listingPrice = await contract.getListingPrice();

        const transaction = !isReselling
            ? await contract.createToken(url, price, {
                value: listingPrice.toString(),
            })
            : await contract.resellToken(id, price, {
                value: listingPrice.toString(),
            });

        setIsLoadingNFT(true);
        await transaction.wait();
    };

    const createNFT = async (formInput, fileUrl, router) => {
        const { name, description, price } = formInput;

        if (!name || !description || !price || !fileUrl) {
            alert('请填写所有字段并上传图片');
            return;
        }

        console.log('Creating NFT with:', { name, description, price, fileUrl });

        try {
            // Check if API keys are configured
            if (!pinataApiKey || !pinataSecretApiKey) {
                alert('Pinata API密钥未配置！请检查.env.local文件');
                return;
            }

            console.log('Uploading metadata to Pinata...');

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
            console.log(`Created NFT metadata url: ${url}`);

            console.log('Creating sale on blockchain...');
            await createSale(url, price);

            router.push('/');
        } catch (error) {
            console.error('Error creating NFT:', error);

            if (error.message && error.message.includes('createSale')) {
                console.error('Smart contract interaction failed');
                alert('智能合约调用失败！请确保：\n1. 钱包已连接到BSC测试网\n2. 有足够的BNB支付Gas费\n3. 合约地址配置正确');
            } else if (error.response) {
                console.error('Pinata API error:', error.response.data);
                if (error.response.data.reason === 'NO_SCOPES_FOUND') {
                    alert('API密钥权限错误！请检查Pinata API密钥是否有pinJSONToIPFS权限。\n请重新创建API密钥并选择Admin权限。');
                } else if (error.response.status === 401) {
                    alert('API密钥无效！请检查.env.local文件中的Pinata密钥配置。');
                } else if (error.response.status === 402) {
                    alert('Pinata账户配额已用完！请检查你的Pinata账户。');
                } else {
                    alert(`Pinata上传失败：${error.response.data.error || error.response.data.message || '未知错误'}`);
                }
            } else if (error.code === 'ECONNABORTED') {
                alert('请求超时，请检查网络连接并重试');
            } else {
                alert(`创建NFT失败：${error.message || '未知错误'}`);
                console.error('Full error:', error);
            }
        }
    };

    const fetchNFTs = async () => {
        setIsLoadingNFT(false);
        // Using JsonRpcProvider for BSC Testnet
        const provider = new ethers.providers.JsonRpcProvider(
            'https://data-seed-prebsc-1-s1.binance.org:8545/',
        );
        const contract = fetchContract(provider);
        const data = await contract.fetchMarketItems();

        const items = await Promise.all(
            data.map(async ({ tokenId, seller, owner, price: unformattedPrice }) => {
                const tokenURI = await contract.tokenURI(tokenId);
                console.log('data', tokenURI);
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
                    if (error.response && error.response.status === 404) {
                        // handle 404 error here
                        console.log('Token URI not found.');
                        return null;
                    }
                    // handle other errors here
                    console.error(error);
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
