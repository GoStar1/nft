// IPFS access helper functions
import axios from 'axios';

// Backup IPFS gateway list
const IPFS_GATEWAYS = [
    'https://gateway.pinata.cloud/ipfs/',
    'https://ipfs.io/ipfs/',
    'https://cloudflare-ipfs.com/ipfs/',
    'https://dweb.link/ipfs/',
    'https://gateway.ipfs.io/ipfs/'
];

/**
 * Fetch data from IPFS, automatically tries multiple gateways
 * @param {string} ipfsUrl - IPFS URL
 * @returns {Promise<any>} - Returns data
 */
export const fetchFromIPFS = async (ipfsUrl) => {
    // Extract IPFS hash
    let ipfsHash = '';
    if (ipfsUrl.includes('/ipfs/')) {
        ipfsHash = ipfsUrl.split('/ipfs/')[1];
    } else if (ipfsUrl.startsWith('ipfs://')) {
        ipfsHash = ipfsUrl.replace('ipfs://', '');
    } else {
        // If not an IPFS URL, try fetching directly
        try {
            const response = await axios.get(ipfsUrl);
            return response.data;
        } catch (error) {
            console.error('Failed to fetch data:', error.message);
            throw error;
        }
    }

    // Try multiple IPFS gateways
    for (const gateway of IPFS_GATEWAYS) {
        try {
            const url = gateway + ipfsHash;
            console.log(`Trying gateway: ${gateway}`);
            const response = await axios.get(url, {
                timeout: 10000 // 10 seconds timeout
            });
            console.log(`Successfully fetched data from ${gateway}`);
            return response.data;
        } catch (error) {
            console.error(`Gateway ${gateway} failed:`, error.message);
            continue;
        }
    }

    throw new Error('All IPFS gateways are inaccessible');
};

/**
 * Convert image URL to ensure accessibility
 * @param {string} imageUrl - Original image URL
 * @returns {string} - Accessible image URL
 */
export const getAccessibleImageUrl = (imageUrl) => {
    if (!imageUrl) return '';

    // If already a complete HTTP URL, return directly
    if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
        return imageUrl;
    }

    // If IPFS protocol URL
    if (imageUrl.startsWith('ipfs://')) {
        const hash = imageUrl.replace('ipfs://', '');
        return `https://ipfs.io/ipfs/${hash}`;
    }

    // If just a hash, add gateway
    if (imageUrl.startsWith('Qm') || imageUrl.startsWith('bafy')) {
        return `https://ipfs.io/ipfs/${imageUrl}`;
    }

    // Return original URL by default
    return imageUrl;
};