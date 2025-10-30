import type { PublicKey } from "@solana/web3.js";
import BN from "bn.js";

// Global counter to ensure uniqueness
let globalCounter = 0;

/**
 * Generates unique action IDs for admin operations.
 * All IDs are generated together and guaranteed to be unique.
 *
 * @param adminPubkey - The admin's public key
 * @param count - Number of unique IDs to generate (default: 1)
 * @returns Array of unique BN action IDs
 *
 * @example
 * // Single operation
 * const [actionId] = generateActionIds(adminPubkey, 1);
 *
 * // Admin selected 3 NGOs to verify
 * const actionIds = generateActionIds(adminPubkey, 3);
 * // actionIds[0] for NGO 1
 * // actionIds[1] for NGO 2
 * // actionIds[2] for NGO 3
 */
export function generateActionIds(
  adminPubkey: PublicKey,
  count: number = 1,
): BN[] {
  if (count <= 0) {
    throw new Error("Count must be greater than 0");
  }

  const ids: BN[] = [];
  const usedIds = new Set<string>();
  const pubkeyBytes = adminPubkey.toBytes();

  // Get base timestamp once for all IDs
  const baseTimestamp = Date.now() + performance.now();

  for (let i = 0; i < count; i++) {
    let attempts = 0;
    let id: BN;

    do {
      // Increment global counter for each attempt
      globalCounter = (globalCounter + 1) % Number.MAX_SAFE_INTEGER;

      // Generate 8 bytes of randomness
      const rand = new Uint8Array(8);
      crypto.getRandomValues(rand);

      // Create unique timestamp for this ID
      // Base timestamp + (index * large offset) + counter
      const uniqueTimestamp = baseTimestamp + i * 1000000 + globalCounter;

      // Convert timestamp to bytes (little-endian)
      const timestampBytes = new Uint8Array(8);
      new DataView(timestampBytes.buffer).setBigUint64(
        0,
        BigInt(Math.floor(uniqueTimestamp)),
        true,
      );

      // Combine: timestamp XOR random XOR pubkey
      const idBytes = new Uint8Array(8);
      for (let j = 0; j < 8; j++) {
        idBytes[j] = timestampBytes[j] ^ rand[j] ^ pubkeyBytes[j];
      }

      // Convert to BN (little-endian)
      const idBigInt = Array.from(idBytes).reduce(
        (acc, byte, idx) => acc + BigInt(byte) * (BigInt(1) << BigInt(8 * idx)),
        BigInt(0),
      );

      id = new BN(idBigInt.toString());
      attempts++;

      // Safety check to prevent infinite loop
      if (attempts > 100) {
        throw new Error(
          `Failed to generate unique action ID after 100 attempts for index ${i}`,
        );
      }
    } while (usedIds.has(id.toString()));

    // Mark this ID as used
    usedIds.add(id.toString());
    ids.push(id);
  }

  return ids;
}
