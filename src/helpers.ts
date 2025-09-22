import { LiquidatorData } from "generated";

// Helper function to update liquidator data
export async function updateLiquidatorData(
  context: any,
  liquidator: string,
  chainId: number,
  protocol: "Aave" | "Euler" | "Morpho",
  liquidationId: string,
  timestamp: bigint
) {
  const liquidatorId = `${liquidator}_${chainId}`;
  const existing = await context.LiquidatorData.get(liquidatorId);

  const liquidatorData: LiquidatorData = {
    id: liquidatorId,
    liquidator: liquidator,
    chainId: chainId,
    aaveLiquidations:
      BigInt(existing?.aaveLiquidations ?? 0n) +
      (protocol === "Aave" ? 1n : 0n),
    eulerLiquidations:
      BigInt(existing?.eulerLiquidations ?? 0n) +
      (protocol === "Euler" ? 1n : 0n),
    morphoLiquidations:
      BigInt(existing?.morphoLiquidations ?? 0n) +
      (protocol === "Morpho" ? 1n : 0n),
    totalLiquidations: BigInt(existing?.totalLiquidations ?? 0n) + 1n,
    liquidations: [...(existing?.liquidations ?? []), liquidationId],
    firstLiquidationTimestamp: existing?.firstLiquidationTimestamp ?? timestamp,
    lastLiquidationTimestamp: timestamp,
  };

  context.LiquidatorData.set(liquidatorData);
}
