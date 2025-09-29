// 测试Pinata API密钥的脚本
// 运行: node test-pinata-api.js

const axios = require('axios');
require('dotenv').config({ path: '.env.local' });

const pinataApiKey = process.env.NEXT_PUBLIC_PINATA_API_KEY;
const pinataSecretApiKey = process.env.NEXT_PUBLIC_PINATA_SECRET_API_KEY;

console.log('测试Pinata API连接...\n');

if (!pinataApiKey || !pinataSecretApiKey) {
    console.error('❌ 错误: 未找到API密钥！');
    console.log('请确保.env.local文件包含:');
    console.log('NEXT_PUBLIC_PINATA_API_KEY=你的API密钥');
    console.log('NEXT_PUBLIC_PINATA_SECRET_API_KEY=你的Secret密钥');
    process.exit(1);
}

// 测试认证
async function testAuthentication() {
    try {
        const response = await axios.get(
            'https://api.pinata.cloud/data/testAuthentication',
            {
                headers: {
                    pinata_api_key: pinataApiKey,
                    pinata_secret_api_key: pinataSecretApiKey,
                }
            }
        );
        console.log('✅ API认证成功！');
        console.log('消息:', response.data.message);
        return true;
    } catch (error) {
        console.error('❌ API认证失败！');
        if (error.response) {
            console.error('错误:', error.response.data);
        } else {
            console.error('错误:', error.message);
        }
        return false;
    }
}

// 测试文件上传权限
async function testFileUploadPermission() {
    console.log('\n测试文件上传权限...');

    // 创建一个简单的测试文件
    const FormData = require('form-data');
    const formData = new FormData();

    // 创建一个小的测试文件
    const testContent = Buffer.from('Test NFT Marketplace Pinata Connection');
    formData.append('file', testContent, 'test.txt');

    const metadata = JSON.stringify({
        name: 'API-Test-File',
    });
    formData.append('pinataMetadata', metadata);

    const options = JSON.stringify({
        cidVersion: 0,
    });
    formData.append('pinataOptions', options);

    try {
        const response = await axios.post(
            'https://api.pinata.cloud/pinning/pinFileToIPFS',
            formData,
            {
                maxBodyLength: 'Infinity',
                headers: {
                    ...formData.getHeaders(),
                    pinata_api_key: pinataApiKey,
                    pinata_secret_api_key: pinataSecretApiKey,
                }
            }
        );
        console.log('✅ 文件上传权限正常！');
        console.log('测试文件IPFS哈希:', response.data.IpfsHash);

        // 可选：删除测试文件
        await unpinFile(response.data.IpfsHash);

        return true;
    } catch (error) {
        console.error('❌ 文件上传权限错误！');
        if (error.response && error.response.data.reason === 'NO_SCOPES_FOUND') {
            console.error('原因: API密钥缺少 pinFileToIPFS 权限');
            console.log('\n请按照以下步骤修复:');
            console.log('1. 登录 https://app.pinata.cloud/');
            console.log('2. 进入 API Keys 页面');
            console.log('3. 删除当前密钥并创建新密钥');
            console.log('4. 选择 "Admin" 权限或手动勾选 pinFileToIPFS 和 pinJSONToIPFS');
        } else if (error.response) {
            console.error('错误详情:', error.response.data);
        } else {
            console.error('错误:', error.message);
        }
        return false;
    }
}

// 删除测试文件
async function unpinFile(hash) {
    try {
        await axios.delete(
            `https://api.pinata.cloud/pinning/unpin/${hash}`,
            {
                headers: {
                    pinata_api_key: pinataApiKey,
                    pinata_secret_api_key: pinataSecretApiKey,
                }
            }
        );
        console.log('✅ 测试文件已清理');
    } catch (error) {
        // 忽略删除错误
    }
}

// 运行测试
async function runTests() {
    console.log('API Key:', pinataApiKey.substring(0, 10) + '...');
    console.log('Secret Key:', pinataSecretApiKey.substring(0, 10) + '...\n');

    const authSuccess = await testAuthentication();
    if (authSuccess) {
        await testFileUploadPermission();
    }

    console.log('\n测试完成！');
}

runTests();