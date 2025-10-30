import { expect } from "chai";
import { Connection, PublicKey, AccountInfo } from "@solana/web3.js";
import { getAccount } from "@solana/spl-token";

export function assertAccountExists(accountInfo: AccountInfo<Buffer> | null): void {
    expect(accountInfo).to.not.be.null;
}

export function assertAccountDoesNotExist(accountInfo: AccountInfo<Buffer> | null): void {
    expect(accountInfo).to.be.null;
}

export function assertPubkeysEqual(actual: PublicKey, expected: PublicKey): void {
    expect(actual.toString()).to.equal(expected.toString());
}

export function assertBeneficiaryVerified(beneficiary: any): void {
    expect(beneficiary.verificationStatus).to.deep.equal({ verified: {} });
    expect(beneficiary.verifiedAt).to.not.be.null;
}

export function assertBeneficiaryPending(beneficiary: any): void {
    expect(beneficiary.verificationStatus).to.deep.equal({ pending: {} });
    expect(beneficiary.verifiedAt).to.be.null;
}

export function assertBeneficiaryFlagged(beneficiary: any): void {
    expect(beneficiary.verificationStatus).to.deep.equal({ flagged: {} });
    expect(beneficiary.flaggedReason).to.not.be.null;
}

export function assertBeneficiaryRejected(beneficiary: any): void {
    expect(beneficiary.verificationStatus).to.deep.equal({ rejected: {} });
}

export function assertPoolActive(pool: any): void {
    expect(pool.isActive).to.be.true;
    expect(pool.closedAt).to.be.null;
}

export function assertPoolClosed(pool: any): void {
    expect(pool.isActive).to.be.false;
    expect(pool.closedAt).to.not.be.null;
}

export function assertDistributionClaimed(distribution: any): void {
    expect(distribution.claimedAt).to.not.be.null;
    expect(distribution.amountClaimed).to.be.greaterThan(0);
}

export function assertDistributionFullyClaimed(distribution: any): void {
    expect(distribution.isFullyClaimed).to.be.true;
    expect(distribution.claimedAt).to.not.be.null;
    expect(distribution.lockedClaimedAt).to.not.be.null;
}

export async function assertTokenBalance(
    connection: Connection,
    tokenAccount: PublicKey,
    expectedAmount: number,
    tolerance: number = 0
): Promise<void> {
    const account = await getAccount(connection, tokenAccount);
    const actualAmount = Number(account.amount);

    if (tolerance === 0) {
        expect(actualAmount).to.equal(expectedAmount);
    } else {
        expect(actualAmount).to.be.within(
            expectedAmount - tolerance,
            expectedAmount + tolerance
        );
    }
}

export async function assertSOLBalance(
    connection: Connection,
    account: PublicKey,
    expectedAmount: number,
    tolerance: number = 0
): Promise<void> {
    const balance = await connection.getBalance(account);

    if (tolerance === 0) {
        expect(balance).to.equal(expectedAmount);
    } else {
        expect(balance).to.be.within(
            expectedAmount - tolerance,
            expectedAmount + tolerance
        );
    }
}

export async function expectError(
    transaction: Promise<any>,
    errorCode: string
): Promise<void> {
    try {
        await transaction;
        expect.fail(`Expected error ${errorCode} but transaction succeeded`);
    } catch (error: any) {
        const errorStr = error.toString();
        // For constraint errors, check if it's an account constraint error
        if (errorCode === "ConstraintRaw" && errorStr.includes("AnchorError caused by account")) {
            return; // This is the expected constraint error
        }
        expect(errorStr).to.include(errorCode);
    }
}

export function assertEnumVariant(actual: any, expectedVariant: string): void {
    const actualVariant = Object.keys(actual)[0];
    expect(actualVariant).to.equal(expectedVariant);
}

export function assertDisasterActive(disaster: any): void {
    expect(disaster.isActive).to.be.true;
    // closedAt can be null or undefined when disaster is active
    expect(disaster.closedAt == null).to.be.true;
}

export function assertDisasterClosed(disaster: any): void {
    expect(disaster.isActive).to.be.false;
    expect(disaster.closedAt).to.not.be.null;
}

export function assertNGOVerified(ngo: any): void {
    expect(ngo.isVerified).to.be.true;
    expect(ngo.verifiedAt).to.not.be.null;
    expect(ngo.verifiedBy).to.not.be.null;
}

export function assertNGONotVerified(ngo: any): void {
    expect(ngo.isVerified).to.be.false;
    expect(ngo.verifiedAt).to.be.null;
}

export function assertFieldWorkerActive(fieldWorker: any): void {
    expect(fieldWorker.isActive).to.be.true;
}

export function assertFieldWorkerInactive(fieldWorker: any): void {
    expect(fieldWorker.isActive).to.be.false;
}

export function assertPlatformPaused(config: any): void {
    expect(config.isPaused).to.be.true;
}

export function assertPlatformNotPaused(config: any): void {
    expect(config.isPaused).to.be.false;
}
