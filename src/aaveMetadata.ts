import { createPublicClient, http } from "viem";
import { experimental_createEffect, S } from "envio";
import { getChain, getRPCUrl, getAaveUiPoolDataProviderContract, getAaveV3UiPoolDataProviderAddress, getAaveV3PoolAddressesProviderAddress } from "./utils";

// Define the schema for the effect output
const getAaveV3ReserveDataSchema = S.schema({
  decimals: S.number,
  ltv: S.bigint,
  cf: S.bigint,
  liq_inc: S.bigint,
  reserve_factor: S.bigint,
});

// Infer the type from the schema
type getAaveV3ReserveData = S.Infer<typeof getAaveV3ReserveDataSchema>;

export const getAaveV3ReserveData = experimental_createEffect(
  {
    name: "getAaveV3ReserveData",
    input: {
      tokenAddress: S.string,
      chainId: S.number,
      blockNumber: S.bigint,
    },
    output: getAaveV3ReserveDataSchema,
    // Enable caching to avoid duplicated calls
    cache: true,
  },
  async ({ input }) => {
    const { tokenAddress, chainId, blockNumber } = input;

    // Get the pool data provider address for this chain
    const poolDataProviderAddress = getAaveV3UiPoolDataProviderAddress(chainId);

    if (!poolDataProviderAddress) {
      throw new Error(`No UiPoolDataProvider address configured for chain ${chainId}`);
    }

    // Get the pool addresses provider address for this chain
    const poolAddressesProviderAddress = getAaveV3PoolAddressesProviderAddress(chainId);

    if (!poolAddressesProviderAddress) {
      throw new Error(`No PoolAddressesProvider address configured for chain ${chainId}`);
    }

    // Map chain IDs to RPC URLs for all configured chains
    const RPC_URL = getRPCUrl(chainId);

    // Create a public client for the specific chain
    const client = createPublicClient({
      chain: getChain(chainId),
      transport: http(RPC_URL),
    });

    const poolDataProviderContract = getAaveUiPoolDataProviderContract(
      poolDataProviderAddress as `0x${string}`
    );

    try {
      // Call getReservesData to get all reserve data
      const result = await client.readContract({
        ...poolDataProviderContract,
        functionName: "getReservesData",
        args: [poolAddressesProviderAddress],
        blockNumber: BigInt(blockNumber),
      });

      const [reservesData] = result as [any[]];

      // Find the specific reserve data for our token
      const reserveData = reservesData.find(
        (reserve: any) => reserve.underlyingAsset.toLowerCase() === tokenAddress.toLowerCase()
      );

      if (!reserveData) {
        throw new Error(`Reserve data not found for token ${tokenAddress} on chain ${chainId}`);
      }

      // Convert LTV from basis points to actual value (LTV is in basis points, so divide by 10000)
      const decimals = Number(reserveData.decimals);
      const ltv = BigInt(reserveData.baseLTVasCollateral);
      const cf = BigInt(reserveData.reserveLiquidationThreshold);
      const liq_inc = BigInt(reserveData.reserveLiquidationBonus);
      const reserve_factor = BigInt(reserveData.reserveFactor);

      return {
        decimals,
        ltv,
        cf,
        liq_inc,
        reserve_factor,
      };
    } catch (error) {
      console.error(`Failed to fetch Aave V3 reserve data for ${tokenAddress} on chain ${chainId}`, error);
      throw error;
    }
  }
);
