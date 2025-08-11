/*
 * Please refer to https://docs.envio.dev for a thorough guide on all Envio indexer features
 */
import {
  AaveProxy,
  AaveProxy_LiquidationCall,
  EulerFactory,
  EulerFactory_ProxyCreated,
  EulerVaultProxy,
  EulerVaultProxy_Liquidate,
  Morpho,
  Morpho_Liquidate,
  GeneralizedLiquidation,
  LiquidationStats,
} from "generated";

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

  const generalized: GeneralizedLiquidation = {
    id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
    chainId: event.chainId,
    timestamp: BigInt(event.block.timestamp),
    protocol: "Aave",
    borrower: event.params.user,
    liquidator: event.params.liquidator,
    collateralAsset: event.params.collateralAsset,
    debtAsset: event.params.debtAsset,
    repaidAssets: event.params.debtToCover,
    seizedAssets: event.params.liquidatedCollateralAmount,
  };
  context.GeneralizedLiquidation.set(generalized);

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

EulerFactory.ProxyCreated.handler(async ({ event, context }) => {
  const entity: EulerFactory_ProxyCreated = {
    id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
    chainId: event.chainId,
    timestamp: BigInt(event.block.timestamp),
    proxy: event.params.proxy,
    upgradeable: event.params.upgradeable,
    implementation: event.params.implementation,
    trailingData: event.params.trailingData,
  };

  context.EulerFactory_ProxyCreated.set(entity);
});

EulerFactory.ProxyCreated.contractRegister(async ({ event, context }) => {
  context.addEulerVaultProxy(event.params.proxy);
});

EulerVaultProxy.Liquidate.handler(async ({ event, context }) => {
  const entity: EulerVaultProxy_Liquidate = {
    id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
    chainId: event.chainId,
    timestamp: BigInt(event.block.timestamp),
    liquidator: event.params.liquidator,
    violator: event.params.violator,
    collateral: event.params.collateral,
    repayAssets: event.params.repayAssets,
    yieldBalance: event.params.yieldBalance,
  };

  context.EulerVaultProxy_Liquidate.set(entity);

  const generalized: GeneralizedLiquidation = {
    id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
    chainId: event.chainId,
    timestamp: BigInt(event.block.timestamp),
    protocol: "Euler",
    borrower: event.params.violator,
    liquidator: event.params.liquidator,
    collateralAsset: event.params.collateral,
    debtAsset: undefined,
    repaidAssets: event.params.repayAssets,
    seizedAssets: event.params.yieldBalance,
  };
  context.GeneralizedLiquidation.set(generalized);

  // Update per-chain stats
  const perChainStatsId2 = `stats_${event.chainId}`;
  const existingPerChain2 = await context.LiquidationStats.get(
    perChainStatsId2
  );
  const perChain2: LiquidationStats = {
    id: perChainStatsId2,
    chainId: event.chainId,
    aaveCount: BigInt(existingPerChain2?.aaveCount ?? 0n),
    eulerCount: BigInt(existingPerChain2?.eulerCount ?? 0n) + 1n,
    morphoCount: BigInt(existingPerChain2?.morphoCount ?? 0n),
    totalCount: BigInt(existingPerChain2?.totalCount ?? 0n) + 1n,
  };
  context.LiquidationStats.set(perChain2);

  // Update global stats
  const globalId2 = `stats_global`;
  const existingGlobal2 = await context.LiquidationStats.get(globalId2);
  const global2: LiquidationStats = {
    id: globalId2,
    chainId: undefined,
    aaveCount: BigInt(existingGlobal2?.aaveCount ?? 0n),
    eulerCount: BigInt(existingGlobal2?.eulerCount ?? 0n) + 1n,
    morphoCount: BigInt(existingGlobal2?.morphoCount ?? 0n),
    totalCount: BigInt(existingGlobal2?.totalCount ?? 0n) + 1n,
  };
  context.LiquidationStats.set(global2);
});

Morpho.Liquidate.handler(async ({ event, context }) => {
  const entity: Morpho_Liquidate = {
    id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
    chainId: event.chainId,
    timestamp: BigInt(event.block.timestamp),
    id_bytes32: event.params.id,
    caller: event.params.caller,
    borrower: event.params.borrower,
    repaidAssets: event.params.repaidAssets,
    repaidShares: event.params.repaidShares,
    seizedAssets: event.params.seizedAssets,
    badDebtAssets: event.params.badDebtAssets,
    badDebtShares: event.params.badDebtShares,
  };

  context.Morpho_Liquidate.set(entity);

  const generalized: GeneralizedLiquidation = {
    id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
    chainId: event.chainId,
    timestamp: BigInt(event.block.timestamp),
    protocol: "Morpho",
    borrower: event.params.borrower,
    liquidator: event.params.caller,
    collateralAsset: undefined,
    debtAsset: undefined,
    repaidAssets: event.params.repaidAssets,
    seizedAssets: event.params.seizedAssets,
  };
  context.GeneralizedLiquidation.set(generalized);

  // Update per-chain stats
  const perChainStatsId3 = `stats_${event.chainId}`;
  const existingPerChain3 = await context.LiquidationStats.get(
    perChainStatsId3
  );
  const perChain3: LiquidationStats = {
    id: perChainStatsId3,
    chainId: event.chainId,
    aaveCount: BigInt(existingPerChain3?.aaveCount ?? 0n),
    eulerCount: BigInt(existingPerChain3?.eulerCount ?? 0n),
    morphoCount: BigInt(existingPerChain3?.morphoCount ?? 0n) + 1n,
    totalCount: BigInt(existingPerChain3?.totalCount ?? 0n) + 1n,
  };
  context.LiquidationStats.set(perChain3);

  // Update global stats
  const globalId3 = `stats_global`;
  const existingGlobal3 = await context.LiquidationStats.get(globalId3);
  const global3: LiquidationStats = {
    id: globalId3,
    chainId: undefined,
    aaveCount: BigInt(existingGlobal3?.aaveCount ?? 0n),
    eulerCount: BigInt(existingGlobal3?.eulerCount ?? 0n),
    morphoCount: BigInt(existingGlobal3?.morphoCount ?? 0n) + 1n,
    totalCount: BigInt(existingGlobal3?.totalCount ?? 0n) + 1n,
  };
  context.LiquidationStats.set(global3);
});
