#!/bin/bash

# NFT Marketplace Setup Script for BSC Testnet
# 使用方法: bash setup.sh

echo "🚀 NFT Marketplace BSC测试网配置脚本"
echo "=================================="

# 检查Node.js
if ! command -v node &> /dev/null; then
    echo "❌ 请先安装Node.js"
    exit 1
fi

echo "✅ Node.js版本: $(node -v)"

# 安装依赖
echo ""
echo "📦 安装项目依赖..."
npm install

# 检查.env.local文件
if [ ! -f ".env.local" ]; then
    echo ""
    echo "📝 创建环境变量文件..."

    if [ -f ".env.local.example" ]; then
        cp .env.local.example .env.local
        echo "✅ 已创建.env.local文件"
        echo "⚠️  请编辑.env.local文件，添加你的Pinata API密钥："
        echo "   NEXT_PUBLIC_PINATA_API_KEY=你的API密钥"
        echo "   NEXT_PUBLIC_PINATA_SECRET_API_KEY=你的Secret密钥"
    elif [ -f ".env.example" ]; then
        cp .env.example .env.local
        echo "✅ 已创建.env.local文件"
        echo "⚠️  请编辑.env.local文件，添加你的Pinata API密钥"
    else
        echo "❌ 未找到环境变量示例文件"
        echo "请手动创建.env.local文件"
    fi
else
    echo "✅ .env.local文件已存在"
fi

# 检查.secret文件
if [ ! -f ".secret" ]; then
    echo ""
    echo "⚠️  未找到.secret文件"
    echo "请创建.secret文件并添加你的钱包私钥（不含0x前缀）："
    echo "echo '你的私钥' > .secret"
else
    echo "✅ .secret文件已存在"
fi

echo ""
echo "=================================="
echo "📋 后续步骤："
echo ""
echo "1. 配置Pinata："
echo "   - 访问 https://app.pinata.cloud/"
echo "   - 创建API密钥（选择Admin权限）"
echo "   - 更新.env.local文件"
echo ""
echo "2. 配置MetaMask："
echo "   - 添加BSC测试网"
echo "   - 获取测试BNB: https://testnet.binance.org/faucet-smart"
echo ""
echo "3. 部署合约："
echo "   npx hardhat run scripts/deploy.js --network bscTestnet"
echo ""
echo "4. 更新合约地址："
echo "   编辑 context/constants.js"
echo ""
echo "5. 启动项目："
echo "   npm run dev"
echo ""
echo "📖 详细说明请查看: 部署指南.md"
echo "=================================="