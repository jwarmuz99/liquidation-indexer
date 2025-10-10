import { Liquidator, Borrower } from "generated";
import { getAaveUserPositionData } from "./aavePositionSnapshot";
import { getTokenDetails } from "./tokenDetails";
import { getAssetPrice } from "./aaveOracle";

interface ProcessedCollateral {
  id: string;
  asset: string;
  symbol: string;
  decimals: number;
  amount: bigint;
  amountUSD: number | undefined;
  enabledAsCollateral: boolean;
  isSeized: boolean;
}

interface ProcessedDebt {
  id: string;
  asset: string;
  symbol: string;
  decimals: number;
  amount: bigint;
  amountUSD: number | undefined;
  isRepaid: boolean;
}

interface PositionSnapshotData {
  collaterals: ProcessedCollateral[];
  debts: ProcessedDebt[];
  totalCollateralUSD: number;
  totalDebtUSD: number;
  ltv: number | undefined;
}

export async function processAavePositionSnapshot(
  context: any,
  userAddress: string,
  chainId: number,
  blockNumber: bigint,
  seizedAsset: string,
  repaidAsset: string,
  snapshotId: string
): Promise<PositionSnapshotData> {
  
  // Fetch user position data
  const positionData = await context.effect(getAaveUserPositionData, {
    userAddress,
    chainId,
    blockNumber,
  });

  if (positionData.userReserves.length === 0) {
    context.log.warn(
      `No position data found for user ${userAddress} on chain ${chainId} at block ${blockNumber}`
    );
    return {
      collaterals: [],
      debts: [],
      totalCollateralUSD: 0,
      totalDebtUSD: 0,
      ltv: undefined,
    };
  }

  const collaterals: ProcessedCollateral[] = [];
  const debts: ProcessedDebt[] = [];
  let totalCollateralUSD = 0;
  let totalDebtUSD = 0;
  let totalCollateralUSDForLTV = 0;

  let collateralIndex = 0;
  let debtIndex = 0;

  // Process each reserve
  for (const reserve of positionData.userReserves) {
    const assetAddress = reserve.underlyingAsset;
    
    // Fetch token metadata
    let tokenMetadata;
    try {
      tokenMetadata = await context.effect(getTokenDetails, {
        tokenAddress: assetAddress,
        chainId,
      });
    } catch (error) {
      context.log.error(`Failed to fetch token metadata for ${assetAddress}`, {
        error,
        chainId,
      });
      continue;
    }

    // Process collateral (if scaledATokenBalance > 0)
    if (reserve.scaledATokenBalance > 0n) {
      let collateralPriceUSD: number | undefined;
      try {
        const price = await context.effect(getAssetPrice, {
          assetAddress,
          chainId,
          blockNumber,
        });
        
        // Convert scaled balance to USD
        const amountInTokens = Number(reserve.scaledATokenBalance) / (10 ** tokenMetadata.decimals);
        const priceInUSD = Number(price.price) / (10 ** 8);
        collateralPriceUSD = amountInTokens * priceInUSD;
        
        totalCollateralUSD += collateralPriceUSD;
        
        // Only count for LTV if enabled as collateral
        if (reserve.usageAsCollateralEnabledOnUser) {
          totalCollateralUSDForLTV += collateralPriceUSD;
        }
      } catch (error) {
        context.log.warn(`Failed to fetch price for collateral ${assetAddress}`, {
          error,
          chainId,
        });
      }

      const collateral: ProcessedCollateral = {
        id: `${snapshotId}_col_${collateralIndex}`,
        asset: assetAddress,
        symbol: tokenMetadata.symbol,
        decimals: tokenMetadata.decimals,
        amount: reserve.scaledATokenBalance,
        amountUSD: collateralPriceUSD,
        enabledAsCollateral: reserve.usageAsCollateralEnabledOnUser,
        isSeized: assetAddress.toLowerCase() === seizedAsset.toLowerCase(),
      };
      
      collaterals.push(collateral);
      collateralIndex++;
    }

    // Process debt (if scaledVariableDebt > 0)
    if (reserve.scaledVariableDebt > 0n) {
      let debtPriceUSD: number | undefined;
      try {
        const price = await context.effect(getAssetPrice, {
          assetAddress,
          chainId,
          blockNumber,
        });
        
        // Convert scaled balance to USD
        const amountInTokens = Number(reserve.scaledVariableDebt) / (10 ** tokenMetadata.decimals);
        const priceInUSD = Number(price.price) / (10 ** 8);
        debtPriceUSD = amountInTokens * priceInUSD;
        
        totalDebtUSD += debtPriceUSD;
      } catch (error) {
        context.log.warn(`Failed to fetch price for debt ${assetAddress}`, {
          error,
          chainId,
        });
      }

      const debt: ProcessedDebt = {
        id: `${snapshotId}_debt_${debtIndex}`,
        asset: assetAddress,
        symbol: tokenMetadata.symbol,
        decimals: tokenMetadata.decimals,
        amount: reserve.scaledVariableDebt,
        amountUSD: debtPriceUSD,
        isRepaid: assetAddress.toLowerCase() === repaidAsset.toLowerCase(),
      };
      
      debts.push(debt);
      debtIndex++;
    }
  }

  // Calculate LTV: totalDebtUSD / sum(collateralUSD where enabledAsCollateral=true)
  const ltv = totalCollateralUSDForLTV > 0 
    ? totalDebtUSD / totalCollateralUSDForLTV 
    : undefined;

  return {
    collaterals,
    debts,
    totalCollateralUSD,
    totalDebtUSD,
    ltv,
  };
}

// Helper function to update liquidator data
export async function updateLiquidatorData(
  context: any,
  liquidator: string,
  chainId: number,
  protocol: "Aave" | "Euler" | "Morpho",
  timestamp: bigint
) {
  const liquidatorId = `${liquidator}_${chainId}`;
  const existing = await context.Liquidator.get(liquidatorId);

  const liquidatorData: Liquidator = {
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
    firstLiquidationTimestamp: existing?.firstLiquidationTimestamp ?? timestamp,
    lastLiquidationTimestamp: timestamp,
  };

  context.Liquidator.set(liquidatorData);
  return liquidatorId;
}

// Helper function to update borrower data
export async function updateBorrowerData(
  context: any,
  borrower: string,
  chainId: number,
  protocol: "Aave" | "Euler" | "Morpho",
  timestamp: bigint
) {
  const borrowerId = `${borrower}_${chainId}`;
  const existing = await context.Borrower.get(borrowerId);

  const borrowerData: Borrower = {
    id: borrowerId,
    borrower: borrower,
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
    firstLiquidationTimestamp: existing?.firstLiquidationTimestamp ?? timestamp,
    lastLiquidationTimestamp: timestamp,
  };

  context.Borrower.set(borrowerData);
  return borrowerId;
}
