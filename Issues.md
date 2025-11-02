# Distribution System Bugs and Fixes

## Critical Bugs Found

### 1. **CRITICAL: Equal Distribution Calculation Bug**

**Location:** `sahara-core/programs/saharasol-core/src/instructions/distribution.rs` lines 115-180

**Problem:**
The `total_allocation_weight` is updated AFTER calculating the distribution, but it's used IN the calculation formula. This causes:

- First distribution: Uses `total_allocation_weight = 0`, falls back to simple division
- Second distribution: Uses `total_allocation_weight = first_beneficiary_weight`, giving wrong amounts
- Result: Both beneficiaries get full or incorrect amounts, causing negative balances

**Current Code:**

```rust
let total_allocation = if pool.total_allocation_weight > 0 {
    let numerator = (pool.total_deposited as u128)
        .checked_mul(allocation_weight as u128)
        .ok_or(ErrorCode::ArithmeticOverflow)?;

    let allocation = numerator
        .checked_div(pool.total_allocation_weight as u128)  // BUG: Uses OLD weight
        .ok_or(ErrorCode::DivisionByZero)? as u64;

    allocation
} else {
    pool.total_deposited
        .checked_div(pool.beneficiary_count.max(1) as u64)
        .ok_or(ErrorCode::DivisionByZero)?
};

// ... later ...
pool.total_allocation_weight = pool
    .total_allocation_weight
    .checked_add(allocation_weight)  // BUG: Updated AFTER calculation
    .ok_or(ErrorCode::ArithmeticOverflow)?;
```

**Fix Required:**
The distribution calculation needs to be redesigned. Options:

1. **Pre-calculate approach:** Require all beneficiaries to be registered before any distribution
2. **Dynamic recalculation:** Recalculate all existing distributions when new ones are added (expensive)
3. **Fixed pool approach:** Lock the pool after first distribution, preventing new distributions

**Recommended Fix:** Use available funds approach instead of total deposited:

```rust
let available_funds = pool.total_deposited
    .checked_sub(pool.total_distributed)
    .ok_or(ErrorCode::ArithmeticUnderflow)?;

// For Equal distribution, simply divide available funds
let total_allocation = match pool.distribution_type {
    DistributionType::Equal => {
        // This should be calculated based on REMAINING eligible beneficiaries
        // Not just current beneficiary_count
        available_funds  // Allocate all available to this beneficiary
    },
    // ... other types need similar fixes
};
```

### 2. **Claim Logic Issue: Partial Claims**

**Location:** `sahara-core/programs/saharasol-core/src/instructions/distribution.rs` lines 292-318

**Problem:**
The current logic tries to claim both immediate and locked amounts in one transaction. If the lock hasn't expired, the entire transaction fails, preventing users from claiming their immediate portion.

**Current Behavior:**

- User tries to claim before lock expires
- Function checks immediate (✓ can claim)
- Function checks locked (✗ time lock not expired)
- Entire transaction fails with `TimeLockNotExpired` error

**Fix Required:**
The logic should allow claiming immediate funds even if locked funds aren't ready yet. The check should only apply to the locked portion:

```rust
// Claim immediate if available
if distribution.claimed_at.is_none() && distribution.amount_immediate > 0 {
    amount_to_claim = amount_to_claim
        .checked_add(distribution.amount_immediate)
        .ok_or(ErrorCode::ArithmeticOverflow)?;
    distribution.claimed_at = Some(clock.unix_timestamp);
}

// Try to claim locked if available AND time lock expired
if distribution.locked_claimed_at.is_none() && distribution.amount_locked > 0 {
    if let Some(unlock_time) = distribution.unlock_time {
        if clock.unix_timestamp >= unlock_time {
            // Only add to claim if unlocked
            amount_to_claim = amount_to_claim
                .checked_add(distribution.amount_locked)
                .ok_or(ErrorCode::ArithmeticOverflow)?;
            distribution.locked_claimed_at = Some(clock.unix_timestamp);
        }
        // If not unlocked yet, just skip (don't fail the transaction)
    } else {
        // No time lock, claim immediately
        amount_to_claim = amount_to_claim
            .checked_add(distribution.amount_locked)
            .ok_or(ErrorCode::ArithmeticOverflow)?;
        distribution.locked_claimed_at = Some(clock.unix_timestamp);
    }
}
```

### 3. **UI Issue: Non-editable Pool Fields**

**Location:** `frontend/components/pools/pool-form.tsx`

**Problem:**
Once a pool is created and has distributions, certain fields should not be editable:

- Distribution type (Equal, WeightedFamily, etc.)
- Eligibility criteria (minimum family size, damage severity)
- Distribution percentages (immediate vs locked)

**Fix Required:**
Add logic to disable these fields when editing an existing pool with distributions.

### 4. **Missing: Family Size Consideration**

**Problem:**
The WeightedFamily distribution type exists but may not be properly tested with the calculation bug.

**Verification Needed:**
Test WeightedFamily and WeightedDamage distribution types after fixing the main calculation bug.

## Recommended Action Plan

1. **IMMEDIATE:** Fix the distribution calculation bug (Critical - causes fund loss)
2. **HIGH:** Fix the claim logic to allow partial claims
3. **MEDIUM:** Add UI validation for non-editable pool fields
4. **LOW:** Add comprehensive tests for all distribution types

## Testing Checklist

After fixes:

- [ ] Equal distribution with 2 beneficiaries and $22 splits correctly ($11 each)
- [ ] Equal distribution with 3 beneficiaries and $30 splits correctly ($10 each)
- [ ] WeightedFamily distribution respects family sizes
- [ ] WeightedDamage distribution respects damage severity
- [ ] Immediate claim works before time lock expires
- [ ] Locked claim only works after time lock expires
- [ ] Both can be claimed together after lock expires
- [ ] Pool balance never goes negative
- [ ] Cannot edit distribution type after first distribution
