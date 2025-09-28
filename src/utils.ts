import { Address, erc20Abi, erc20Abi_bytes32 } from "viem";
import { mainnet, optimism, arbitrum, polygon, base, gnosis, linea, scroll, avalanche, bsc } from 'viem/chains'
import * as fs from "fs";
import * as path from "path";
import { AaveV3Ethereum, AaveV3Optimism, AaveV3Arbitrum, AaveV3Polygon, AaveV3Base, AaveV3Gnosis, AaveV3Linea, AaveV3Scroll, AaveV3Avalanche, AaveV3BNB } from "@bgd-labs/aave-address-book"; 


const evaultAbi = JSON.parse(
    fs.readFileSync(path.join(__dirname, "../abis/EVault.json"), "utf8")
);

const eulerRouterAbi = JSON.parse(
    fs.readFileSync(path.join(__dirname, "../abis/EulerRouter.json"), "utf8")
);

const aaveV3OracleAbi = JSON.parse(
    fs.readFileSync(path.join(__dirname, "../abis/AaveV3Oracle.json"), "utf8")
);

const aaveUiPoolDataProviderAbi = JSON.parse(
    fs.readFileSync(path.join(__dirname, "../abis/AaveUiPoolDataProvider.json"), "utf8")
);

export function getERC20Contract(address: Address) {
    return { address: address as `0x${string}`, abi: erc20Abi };
}

export function getERC20BytesContract(address: Address) {
    return {
        address: address as `0x${string}`,
        abi: erc20Abi_bytes32,
    };
}

export function getEVaultContract(address: Address) {
    return { address: address as `0x${string}`, abi: evaultAbi };
}

export function getEulerRouterContract(address: Address) {
    return { address: address as `0x${string}`, abi: eulerRouterAbi };
}

export function getAaveV3OracleContract(address: Address) {
    return { address: address as `0x${string}`, abi: aaveV3OracleAbi };
}

export function getAaveUiPoolDataProviderContract(address: Address) {
    return { address: address as `0x${string}`, abi: aaveUiPoolDataProviderAbi };
}

export const getRPCUrl = (chainId: number) => {
    const rpcUrls: Record<number, string> = {
      1: process.env.RPC_URL_1 || "https://eth.drpc.org",
      10: process.env.RPC_URL_10 || "https://optimism.drpc.org",
      42161: process.env.RPC_URL_42161 || "https://arbitrum.drpc.org",
      137: process.env.RPC_URL_137 || "https://polygon.drpc.org",
      8453: process.env.RPC_URL_8453 || "https://base.drpc.org",
      100: process.env.RPC_URL_100 || "https://gnosis.drpc.org",
      59144: process.env.RPC_URL_59144 || "https://linea.drpc.org",
      534352: process.env.RPC_URL_534352 || "https://scroll.drpc.org",
      43114: process.env.RPC_URL_43114 || "https://avalanche.drpc.org",
      56: process.env.RPC_URL_56 || "https://bsc.drpc.org",
    };
    const RPC_URL = rpcUrls[chainId] || process.env.RPC_URL || "https://eth.drpc.org";
    return RPC_URL;
};
  
export const getChain = (chainId: number) => {
    const chainMap: Record<number, any> = {
        1: mainnet,
        10: optimism,
        42161: arbitrum,
        137: polygon,
        8453: base,
        100: gnosis,
        59144: linea,
        534352: scroll,
        43114: avalanche,
        56: bsc,
    };
    const chain = chainMap[chainId] || mainnet;
    return chain;
};

export const getAaveV3UiPoolDataProviderAddress = (chainId: number) => {
    const chainMap: Record<number, string> = {
        1: AaveV3Ethereum.UI_POOL_DATA_PROVIDER,
        10: AaveV3Optimism.UI_POOL_DATA_PROVIDER,
        42161: AaveV3Arbitrum.UI_POOL_DATA_PROVIDER,
        137: AaveV3Polygon.UI_POOL_DATA_PROVIDER,
        8453: AaveV3Base.UI_POOL_DATA_PROVIDER,
        100: AaveV3Gnosis.UI_POOL_DATA_PROVIDER,
        59144: AaveV3Linea.UI_POOL_DATA_PROVIDER,
        534352: AaveV3Scroll.UI_POOL_DATA_PROVIDER,
        43114: AaveV3Avalanche.UI_POOL_DATA_PROVIDER,
        56: AaveV3BNB.UI_POOL_DATA_PROVIDER,
    };
    const address = chainMap[chainId] || "";
    return address;
};

export const getAaveV3PoolAddressesProviderAddress = (chainId: number) => {
    const chainMap: Record<number, string> = {
        1: AaveV3Ethereum.POOL_ADDRESSES_PROVIDER,
        10: AaveV3Optimism.POOL_ADDRESSES_PROVIDER,
        42161: AaveV3Arbitrum.POOL_ADDRESSES_PROVIDER,
        137: AaveV3Polygon.POOL_ADDRESSES_PROVIDER,
        8453: AaveV3Base.POOL_ADDRESSES_PROVIDER,
        100: AaveV3Gnosis.POOL_ADDRESSES_PROVIDER,
        59144: AaveV3Linea.POOL_ADDRESSES_PROVIDER,
        534352: AaveV3Scroll.POOL_ADDRESSES_PROVIDER,
        43114: AaveV3Avalanche.POOL_ADDRESSES_PROVIDER,
        56: AaveV3BNB.POOL_ADDRESSES_PROVIDER,
    };
    const address = chainMap[chainId] || "";
    return address;
};

export const getAaveV3OracleAddress = (chainId: number) => {
    const chainMap: Record<number, string> = {
        1: AaveV3Ethereum.ORACLE,
        10: AaveV3Optimism.ORACLE,
        42161: AaveV3Arbitrum.ORACLE,
        137: AaveV3Polygon.ORACLE,
        8453: AaveV3Base.ORACLE,
        100: AaveV3Gnosis.ORACLE,
        59144: AaveV3Linea.ORACLE,
        534352: AaveV3Scroll.ORACLE,
        43114: AaveV3Avalanche.ORACLE,
        56: AaveV3BNB.ORACLE,
    };
    const address = chainMap[chainId] || "";
    return address;
};
