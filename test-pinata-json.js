// 测试Pinata JSON上传权限
// 运行: node test-pinata-json.js

const axios = require('axios');
require('dotenv').config({ path: '.env.local' });

const pinataApiKey = process.env.NEXT_PUBLIC_PINATA_API_KEY;
const pinataSecretApiKey = process.env.NEXT_PUBLIC_PINATA_SECRET_API_KEY;

console.log('测试Pinata JSON上传权限...\n');

if (!pinataApiKey || !pinataSecretApiKey) {
    console.error('❌ 错误: 未找到API密钥！');
    console.log('请确保.env.local文件包含:');
    console.log('NEXT_PUBLIC_PINATA_API_KEY=你的API密钥');
    console.log('NEXT_PUBLIC_PINATA_SECRET_API_KEY=你的Secret密钥');
    process.exit(1);
}

// 测试JSON上传权限
async function testJSONUpload() {
    console.log('API Key:', pinataApiKey.substring(0, 10) + '...');
    console.log('Secret Key:', pinataSecretApiKey.substring(0, 10) + '...\n');

    const testMetadata = {
        name: "Test NFT",
        description: "Testing Pinata JSON upload",
        image: "https://gateway.pinata.cloud/ipfs/QmTest123"
    };

    try {
        console.log('上传测试JSON到Pinata...');
        const response = await axios.post(
            'https://api.pinata.cloud/pinning/pinJSONToIPFS',
            {
                pinataContent: testMetadata,
                pinataMetadata: {
                    name: 'test-metadata',
                },
            },
            {
                headers: {
                    'Content-Type': 'application/json',
                    pinata_api_key: pinataApiKey,
                    pinata_secret_api_key: pinataSecretApiKey,
                }
            }
        );

        console.log('✅ JSON上传成功！');
        console.log('IPFS哈希:', response.data.IpfsHash);
        console.log('访问URL:', `https://gateway.pinata.cloud/ipfs/${response.data.IpfsHash}`);

        // 清理测试文件
        await unpinFile(response.data.IpfsHash);

        return true;
    } catch (error) {
        console.error('❌ JSON上传失败！');

        if (error.response) {
            console.error('\n错误详情:');
            console.error('状态码:', error.response.status);
            console.error('错误信息:', error.response.data);

            if (error.response.data.reason === 'NO_SCOPES_FOUND') {
                console.log('\n❌ 权限错误！你的API密钥缺少 pinJSONToIPFS 权限');
                console.log('\n解决方法:');
                console.log('1. 登录 https://app.pinata.cloud/');
                console.log('2. 进入 API Keys');
                console.log('3. 删除当前密钥');
                console.log('4. 创建新密钥时选择 "Admin" 权限');
                console.log('5. 或手动勾选以下权限:');
                console.log('   - pinFileToIPFS');
                console.log('   - pinJSONToIPFS');
                console.log('6. 更新.env.local文件中的密钥');
            } else if (error.response.status === 401) {
                console.log('\n❌ API密钥无效！');
                console.log('请检查.env.local文件中的密钥是否正确');
            } else if (error.response.status === 402) {
                console.log('\n❌ Pinata账户配额已用完！');
                console.log('请登录Pinata检查你的使用额度');
            }
        } else {
            console.error('网络错误:', error.message);
            console.log('\n可能的原因:');
            console.log('1. 网络连接问题');
            console.log('2. Pinata服务暂时不可用');
            console.log('3. 防火墙或代理阻止了请求');
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
        console.log('✅ 测试文件已清理\n');
    } catch (error) {
        // 忽略删除错误
    }
}

// 运行测试
testJSONUpload().then(success => {
    if (success) {
        console.log('🎉 测试通过！你的Pinata配置正确，可以创建NFT了。');
    } else {
        console.log('\n❌ 测试失败！请按照上述说明修复问题。');
    }
});