import assert from "assert";
import {
  TestHelpers,
  InitializableImmutableAdminUpgradeabilityProxy_LiquidationCall,
} from "generated";
const { MockDb, InitializableImmutableAdminUpgradeabilityProxy } = TestHelpers;

describe("InitializableImmutableAdminUpgradeabilityProxy contract LiquidationCall event tests", () => {
  // Create mock db
  const mockDb = MockDb.createMockDb();

  // Creating mock for InitializableImmutableAdminUpgradeabilityProxy contract LiquidationCall event
  const event =
    InitializableImmutableAdminUpgradeabilityProxy.LiquidationCall.createMockEvent(
      {
        /* It mocks event fields with default values. You can overwrite them if you need */
      }
    );

  it("InitializableImmutableAdminUpgradeabilityProxy_LiquidationCall is created correctly", async () => {
    // Processing the event
    const mockDbUpdated =
      await InitializableImmutableAdminUpgradeabilityProxy.LiquidationCall.processEvent(
        {
          event,
          mockDb,
        }
      );

    // Getting the actual entity from the mock database
    let actualInitializableImmutableAdminUpgradeabilityProxyLiquidationCall =
      mockDbUpdated.entities.InitializableImmutableAdminUpgradeabilityProxy_LiquidationCall.get(
        `${event.chainId}_${event.block.number}_${event.logIndex}`
      );

    // Creating the expected entity
    const expectedInitializableImmutableAdminUpgradeabilityProxyLiquidationCall: InitializableImmutableAdminUpgradeabilityProxy_LiquidationCall =
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
    // Asserting that the entity in the mock database is the same as the expected entity
    assert.deepEqual(
      actualInitializableImmutableAdminUpgradeabilityProxyLiquidationCall,
      expectedInitializableImmutableAdminUpgradeabilityProxyLiquidationCall,
      "Actual InitializableImmutableAdminUpgradeabilityProxyLiquidationCall should be the same as the expectedInitializableImmutableAdminUpgradeabilityProxyLiquidationCall"
    );
  });
});
