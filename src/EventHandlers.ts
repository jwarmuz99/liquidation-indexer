/*
 * Please refer to https://docs.envio.dev for a thorough guide on all Envio indexer features
 */
import {
  InitializableImmutableAdminUpgradeabilityProxy,
  InitializableImmutableAdminUpgradeabilityProxy_LiquidationCall,
} from "generated";

InitializableImmutableAdminUpgradeabilityProxy.LiquidationCall.handler(
  async ({ event, context }) => {
    const entity: InitializableImmutableAdminUpgradeabilityProxy_LiquidationCall =
      {
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

    context.InitializableImmutableAdminUpgradeabilityProxy_LiquidationCall.set(
      entity
    );
  }
);
