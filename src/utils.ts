import { Address, erc20Abi, erc20Abi_bytes32 } from "viem";
import { mainnet, optimism, arbitrum, polygon, base, gnosis, linea, scroll, avalanche, bsc } from 'viem/chains'
import * as fs from "fs";
import * as path from "path";


const evaultAbi = JSON.parse(
    fs.readFileSync(path.join(__dirname, "../abis/EVault.json"), "utf8")
);

const eulerRouterAbi = JSON.parse(
    fs.readFileSync(path.join(__dirname, "../abis/EulerRouter.json"), "utf8")
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