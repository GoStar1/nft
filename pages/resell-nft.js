import { useEffect, useState, useContext } from 'react';
import { useRouter } from 'next/router';

import withTransition from '../components/withTransition';

import { NFTContext } from '../context/NFTContext';
import { Button, Input, Loader } from '../components';
import { fetchFromIPFS, getAccessibleImageUrl } from '../utils/ipfsHelper';

const ResellNFT = () => {
    const { createSale, isLoadingNFT } = useContext(NFTContext);
    const [price, setPrice] = useState('');
    const [image, setImage] = useState('');
    const router = useRouter();
    const { id, tokenURI } = router.query;

    const fetchNFT = async () => {
        if (!tokenURI) return;

        try {
            // Use helper function to automatically try multiple gateways
            const data = await fetchFromIPFS(tokenURI);
            setPrice(data.price);
            // Ensure image URL is accessible
            setImage(getAccessibleImageUrl(data.image));
        } catch (error) {
            console.error('Failed to fetch NFT data:', error);
            alert('Unable to fetch NFT data, please try again later');
        }
    };

    useEffect(() => {
        fetchNFT();
    }, [id]);

    const resell = async () => {
        console.log('Resell button clicked', { price, tokenURI, id });

        // Validate price input
        if (!price || price === '') {
            alert('Please enter a price');
            return;
        }

        const priceNum = parseFloat(price);
        if (isNaN(priceNum) || priceNum <= 0) {
            alert('Please enter a valid price (must be greater than 0)');
            return;
        }

        // Check if we have required parameters
        if (!tokenURI || !id) {
            alert('Missing NFT information. Please go back and try again.');
            console.error('Missing parameters:', { tokenURI, id });
            return;
        }

        try {
            console.log('Calling createSale with:', { tokenURI, price, id });
            await createSale(tokenURI, price, true, id);
            router.push('/');
        } catch (error) {
            console.error('Resell failed:', error);
            // Error already handled and displayed in createSale
        }
    };

    if (isLoadingNFT) {
        return (
            <div className="flexCenter" style={{ height: '51vh' }}>
                <Loader />
            </div>
        );
    }

    return (
        <div className="flex justify-center sm:px-4 p-12">
            <div className="w-3/5 md:w-full">
                <h1 className="font-poppins dark:text-white text-nft-black-1 font-semibold text-2xl">Resell NFT</h1>

                <Input
                    inputType="number"
                    title="Price"
                    placeholder="Asset Price"
                    handleClick={(e) => setPrice(e.target.value)}
                />

                {image && <img className="rounded mt-4" width="350" src={image} />}

                <div className="mt-7 w-full flex justify-end">
                    <Button
                        btnName="List NFT"
                        btnType="primary"
                        classStyles="rounded-xl"
                        handleClick={resell}
                    />
                </div>
            </div>
        </div>
    );
};

export default withTransition(ResellNFT);
