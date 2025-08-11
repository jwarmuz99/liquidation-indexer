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
    debtAsset: null,
    repaidAssets: event.params.repayAssets,
    seizedAssets: event.params.yieldBalance,
  } as unknown as GeneralizedLiquidation; // allow null debtAsset
  context.GeneralizedLiquidation.set(generalized);
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
    collateralAsset: null,
    debtAsset: null,
    repaidAssets: event.params.repaidAssets,
    seizedAssets: event.params.seizedAssets,
  } as unknown as GeneralizedLiquidation; // allow nulls
  context.GeneralizedLiquidation.set(generalized);
});
