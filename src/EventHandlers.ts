/*
 * Please refer to https://docs.envio.dev for a thorough guide on all Envio indexer features.
 */
import {
  AaveProxy,
  AaveProxy_LiquidationCall,
  EulerFactory,
  EVaultDetails,
  EulerVaultProxy,
  EulerVaultProxy_Liquidate,
  Morpho,
  Morpho_Liquidate,
  GeneralizedLiquidation,
  LiquidationStats,
} from "generated";
import type { Morpho_CreateMarket as Morpho_CreateMarketEntity } from "generated/src/Types.gen";
import { updateLiquidatorData, updateBorrowerData, processAavePositionSnapshot } from "./helpers";
import { getEVaultMetadata } from "./evaultMetadata";
import { getTokenDetails } from "./tokenDetails";
import { getQuote } from "./evaultOracle";
import { getAssetPrice } from "./aaveOracle";
import { getMorphoHistoricalPrice } from "./morphoOracle";
import { getAaveV3ReserveData } from "./aaveMetadata";

AaveProxy.LiquidationCall.handler(async ({ event, context }) => {
  const entity: AaveProxy_LiquidationCall = {
    id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
    chainId: event.chainId,
    timestamp: BigInt(event.block.timestamp),
    collateralAsset: event.params.collateralAsset,
    debtAsset: event.params.debtAsset,
    user: event.params.user,
    debtToCover: event.params.debtToCover,
    liquidatedCollateralAmount: event.params.liquidatedCollateralAmount,
    liquidator: event.params.liquidator,
    receiveAToken: event.params.receiveAToken,
  };

  context.AaveProxy_LiquidationCall.set(entity);

  try {
    const collateralTokenMetadata = await context.effect(getTokenDetails, {
      tokenAddress: event.params.collateralAsset,
      chainId: event.chainId,
    });
    context.Token.set({
      id: `${event.chainId}_${event.params.collateralAsset}`,
      chainId: event.chainId,
      name: collateralTokenMetadata.name,
      symbol: collateralTokenMetadata.symbol,
      decimals: collateralTokenMetadata.decimals,
    });
  } catch (error) {
    context.log.error(
      `Failed to fetch collateral token metadata ${event.params.collateralAsset}`,
      {
        tokenAddress: event.params.collateralAsset,
        chainId: event.chainId,
        err: error,
      }
    );
    return;
  }

  try {
    const debtTokenMetadata = await context.effect(getTokenDetails, {
      tokenAddress: event.params.debtAsset,
      chainId: event.chainId,
    });
    context.Token.set({
      id: `${event.chainId}_${event.params.debtAsset}`,
      chainId: event.chainId,
      name: debtTokenMetadata.name,
      symbol: debtTokenMetadata.symbol,
      decimals: debtTokenMetadata.decimals,
    });
  } catch (error) {
    context.log.error(
      `Failed to fetch debt token metadata ${event.params.debtAsset}`,
      {
        tokenAddress: event.params.debtAsset,
        chainId: event.chainId,
        err: error,
      }
    );
    return;
  }

  const collateralToken = await context.Token.get(
    `${event.chainId}_${event.params.collateralAsset}`
  );
  if (!collateralToken) {
    context.log.error("Collateral token entity not preloaded", {
      tokenAddress: event.params.collateralAsset,
      chainId: event.chainId,
    });
    return;
  }

  const debtToken = await context.Token.get(
    `${event.chainId}_${event.params.debtAsset}`
  );
  if (!debtToken) {
    context.log.error("Debt token entity not preloaded", {
      tokenAddress: event.params.debtAsset,
      chainId: event.chainId,
    });
    return;
  }

  const collateralSymbol =
    collateralToken.symbol || event.params.collateralAsset;
  const debtSymbol = debtToken.symbol || event.params.debtAsset;

  let collateralMarketDetails: any;
  let debtMarketDetails: any;

  try {
    collateralMarketDetails = await context.effect(getAaveV3ReserveData, {
      tokenAddress: event.params.collateralAsset,
      chainId: event.chainId,
      blockNumber: BigInt(event.block.number),
    });
    if (collateralMarketDetails) {
      context.AaveV3ReserveConfigurationData.set({
        id: `${event.chainId}_${event.params.collateralAsset}`,
        chainId: event.chainId,
        decimals: collateralMarketDetails.decimals,
        ltv: collateralMarketDetails.ltv,
        cf: collateralMarketDetails.cf,
        liq_inc: collateralMarketDetails.liq_inc,
        reserve_factor: collateralMarketDetails.reserve_factor,
      });
    }
  } catch (error) {
    context.log.warn(
      `Failed to fetch Aave V3 reserve data for collateral ${event.params.collateralAsset} on chain ${event.chainId}, continuing without it`,
      {
        tokenAddress: event.params.collateralAsset,
        chainId: event.chainId,
        err: error,
      }
    );
    // Don't return here - we can still process the liquidation without the reserve data
  }

  try {
    debtMarketDetails = await context.effect(getAaveV3ReserveData, {
      tokenAddress: event.params.debtAsset,
      chainId: event.chainId,
      blockNumber: BigInt(event.block.number),
    });
    if (debtMarketDetails) {
      context.AaveV3ReserveConfigurationData.set({
        id: `${event.chainId}_${event.params.debtAsset}`,
        chainId: event.chainId,
        decimals: debtMarketDetails.decimals,
        ltv: debtMarketDetails.ltv,
        cf: debtMarketDetails.cf,
        liq_inc: debtMarketDetails.liq_inc,
        reserve_factor: debtMarketDetails.reserve_factor,
      });
    }
  } catch (error) {
    context.log.warn(
      `Failed to fetch Aave V3 reserve data for debt ${event.params.debtAsset} on chain ${event.chainId}, continuing without it`,
      {
        tokenAddress: event.params.debtAsset,
        chainId: event.chainId,
        err: error,
      }
    );
    // Don't return here - we can still process the liquidation without the reserve data
  }

  // Only fetch prices if we have oracle addresses from reserve data
  let collateralPrice = { price: 0n };
  let debtPrice = { price: 0n };

  try {
    collateralPrice = await context.effect(getAssetPrice, {
      assetAddress: event.params.collateralAsset,
      chainId: event.chainId,
      blockNumber: BigInt(event.block.number),
    });
  } catch (error) {
    context.log.warn(`Failed to fetch collateral price, using 0`, {
      tokenAddress: event.params.collateralAsset,
      err: error,
    });
  }

  try {
    debtPrice = await context.effect(getAssetPrice, {
      assetAddress: event.params.debtAsset,
      chainId: event.chainId,
      blockNumber: BigInt(event.block.number),
    });
  } catch (error) {
    context.log.warn(`Failed to fetch debt price, using 0`, {
      tokenAddress: event.params.debtAsset,
      err: error,
    });
  }

  const seizedAssetsUSD =
    (Number(event.params.liquidatedCollateralAmount) /
      10 ** collateralToken.decimals) *
    (Number(collateralPrice.price) / 10 ** 8);
  const repaidAssetsUSD =
    (Number(event.params.debtToCover) / 10 ** debtToken.decimals) *
    (Number(debtPrice.price) / 10 ** 8);

  // Update liquidator data first to get the liquidator ID
  const liquidatorId = await updateLiquidatorData(
    context,
    event.params.liquidator,
    event.chainId,
    "Aave",
    BigInt(event.block.timestamp)
  );

  // Update borrower data to get the borrower ID
  const borrowerId = await updateBorrowerData(
    context,
    event.params.user,
    event.chainId,
    "Aave",
    BigInt(event.block.timestamp)
  );

  const generalized: GeneralizedLiquidation = {
    id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
    chainId: event.chainId,
    timestamp: BigInt(event.block.timestamp),
    protocol: "Aave",
    borrower_id: borrowerId,
    liquidator_id: liquidatorId,
    txHash: event.transaction.hash,
    collateralAsset: collateralSymbol,
    debtAsset: debtSymbol,
    repaidAssets: event.params.debtToCover,
    repaidAssetsUSD: repaidAssetsUSD,
    seizedAssets: event.params.liquidatedCollateralAmount,
    seizedAssetsUSD: seizedAssetsUSD,
    positionSnapshot_id: undefined,
  };
  context.GeneralizedLiquidation.set(generalized);

  // Create position snapshot
  const snapshotId = `${event.chainId}_${event.block.number}_${event.logIndex}_snapshot`;
  
  try {
    const snapshotData = await processAavePositionSnapshot(
      context,
      event.params.user,
      event.chainId,
      BigInt(event.block.number),
      event.params.collateralAsset,
      event.params.debtAsset,
      snapshotId
    );

    // Create PositionSnapshot entity
    const positionSnapshot = {
      id: snapshotId,
      chainId: event.chainId,
      timestamp: BigInt(event.block.timestamp),
      protocol: "Aave",
      borrower: event.params.user,
      txHash: event.transaction.hash,
      totalCollateralUSD: snapshotData.totalCollateralUSD,
      totalDebtUSD: snapshotData.totalDebtUSD,
      ltv: snapshotData.ltv,
      liquidation_id: generalized.id,
    };
    context.PositionSnapshot.set(positionSnapshot);

    // Create PositionCollateral entities
    for (const collateral of snapshotData.collaterals) {
      context.PositionCollateral.set({
        id: collateral.id,
        positionSnapshot_id: snapshotId,
        asset: collateral.asset,
        symbol: collateral.symbol,
        decimals: collateral.decimals,
        amount: collateral.amount,
        amountUSD: collateral.amountUSD,
        enabledAsCollateral: collateral.enabledAsCollateral,
        isSeized: collateral.isSeized,
      });
    }

    // Create PositionDebt entities
    for (const debt of snapshotData.debts) {
      context.PositionDebt.set({
        id: debt.id,
        positionSnapshot_id: snapshotId,
        asset: debt.asset,
        symbol: debt.symbol,
        decimals: debt.decimals,
        amount: debt.amount,
        amountUSD: debt.amountUSD,
        isRepaid: debt.isRepaid,
      });
    }

    // Link snapshot to liquidation
    context.GeneralizedLiquidation.set({
      ...generalized,
      positionSnapshot_id: snapshotId,
    });

  } catch (error) {
    context.log.error(
      `Failed to create position snapshot for liquidation ${generalized.id}`,
      {
        error,
        userAddress: event.params.user,
        chainId: event.chainId,
        blockNumber: event.block.number,
      }
    );
    // Continue without snapshot - don't fail the entire liquidation indexing
  }

  // Update per-chain stats
  const perChainStatsId = `stats_${event.chainId}`;
  const existingPerChain = await context.LiquidationStats.get(perChainStatsId);
  const perChain: LiquidationStats = {
    id: perChainStatsId,
    chainId: event.chainId,
    aaveCount: BigInt(existingPerChain?.aaveCount ?? 0n) + 1n,
    eulerCount: BigInt(existingPerChain?.eulerCount ?? 0n),
    morphoCount: BigInt(existingPerChain?.morphoCount ?? 0n),
    totalCount: BigInt(existingPerChain?.totalCount ?? 0n) + 1n,
  };
  context.LiquidationStats.set(perChain);

  // Update global stats
  const globalId = `stats_global`;
  const existingGlobal = await context.LiquidationStats.get(globalId);
  const global: LiquidationStats = {
    id: globalId,
    chainId: undefined,
    aaveCount: BigInt(existingGlobal?.aaveCount ?? 0n) + 1n,
    eulerCount: BigInt(existingGlobal?.eulerCount ?? 0n),
    morphoCount: BigInt(existingGlobal?.morphoCount ?? 0n),
    totalCount: BigInt(existingGlobal?.totalCount ?? 0n) + 1n,
  };
  context.LiquidationStats.set(global);
});

