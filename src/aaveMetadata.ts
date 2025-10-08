import { experimental_createEffect, S } from "envio";
import { 
  executeWithRPCRotation,
  getAaveUiPoolDataProviderContract, 
  getAaveV3UiPoolDataProviderAddress, 
  getAaveV3PoolAddressesProviderAddress, 
  getAaveV3ProtocolDataProviderAddress,
  getAaveV3ProtocolDataProviderContract
} from "./utils";

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

    // Get the pool addresses provider address for this chain
    const poolAddressesProviderAddress = getAaveV3PoolAddressesProviderAddress(chainId);

    const poolDataProviderContract = getAaveUiPoolDataProviderContract(
      poolDataProviderAddress as `0x${string}`
    );

    try {
      // Try primary method with RPC rotation
      const result = await executeWithRPCRotation(
        chainId,
        async (client) => {
          return await client.readContract({
            ...poolDataProviderContract,
            functionName: "getReservesData",
            args: [poolAddressesProviderAddress],
            blockNumber: BigInt(blockNumber),
          });
        },
        { enableBatch: false, enableMulticall: false }
      );

      const [reservesData] = result as [any[]];

      // Find the specific reserve data for our token
      const reserveData = reservesData.find(
        (reserve: any) => reserve.underlyingAsset.toLowerCase() === tokenAddress.toLowerCase()
      );

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
      try {
        // Try fallback method with RPC rotation
        const protocolDataProviderAddress = getAaveV3ProtocolDataProviderAddress(chainId);
        const protocolDataProviderContract = getAaveV3ProtocolDataProviderContract(
          protocolDataProviderAddress as `0x${string}`
        );

        const result = await executeWithRPCRotation(
          chainId,
          async (client) => {
            return await client.readContract({
              ...protocolDataProviderContract,
              functionName: "getReserveConfigurationData",
              args: [tokenAddress],
              blockNumber: BigInt(blockNumber),
            });
          },
          { enableBatch: false, enableMulticall: false }
        );

        const [reservesData] = result as [any];
        const decimals = Number(reservesData.decimals);
        const ltv = BigInt(reservesData.ltv);
        const cf = BigInt(reservesData.liquidationThreshold);
        const liq_inc = BigInt(reservesData.liquidationBonus);
        const reserve_factor = BigInt(reservesData.reserveFactor);

        return {
          decimals,
          ltv,
          cf,
          liq_inc,
          reserve_factor,
        };

      } catch (error) {
        console.error(
          `All RPC attempts failed for getAaveV3ReserveData on chain ${chainId}. ` +
          `Token: ${tokenAddress}, Block: ${blockNumber}. Error: ${error}`
        );
        return {
          decimals: 0,
          ltv: 0n,
          cf: 0n,
          liq_inc: 0n,
          reserve_factor: 0n,
        };
      }
    }
  }
);
