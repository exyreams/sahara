#![allow(deprecated)]
#![allow(ambiguous_glob_reexports)]

use anchor_lang::prelude::*;

pub mod errors;
pub mod instructions;
pub mod state;

#[allow(unused_imports)]
pub use errors::*;
pub use instructions::*;
pub use state::*;

declare_id!("26jJKQHuNdAKc71J6fU6oV1UtXt5RDMamp4FpAbWyagJ");

#[allow(deprecated)]
#[program]
pub mod saharasol_core {
    use super::*;

    pub fn initialize_platform(
        ctx: Context<InitializePlatform>,
        params: InitializePlatformParams,
    ) -> Result<()> {
        instructions::platform::handler(ctx, params)
    }

    pub fn update_platform_config(
        ctx: Context<UpdatePlatformConfig>,
        timestamp: i64,
        params: UpdatePlatformConfigWithAuditParams,
    ) -> Result<()> {
        instructions::platform::update_platform_config_handler(ctx, timestamp, params)
    }

    pub fn add_allowed_token(
        ctx: Context<ManageAllowedTokens>,
        timestamp: i64,
        token_mint: Pubkey,
        reason: String,
    ) -> Result<()> {
        instructions::platform::add_allowed_token_handler(ctx, timestamp, token_mint, reason)
    }

    pub fn remove_allowed_token(
        ctx: Context<ManageAllowedTokens>,
        timestamp: i64,
        token_mint: Pubkey,
        reason: String,
    ) -> Result<()> {
        instructions::platform::remove_allowed_token_handler(ctx, timestamp, token_mint, reason)
    }

    pub fn initialize_disaster(
        ctx: Context<InitializeDisaster>,
        params: InitializeDisasterParams,
        timestamp: i64,
    ) -> Result<()> {
        instructions::disaster::handler(ctx, params, timestamp)
    }

    pub fn update_disaster(
        ctx: Context<UpdateDisaster>,
        event_id: String,
        timestamp: i64,
        params: UpdateDisasterParams,
    ) -> Result<()> {
        instructions::disaster::update_disaster_handler(ctx, event_id, timestamp, params)
    }

    pub fn close_disaster(
        ctx: Context<CloseDisaster>,
        event_id: String,
        timestamp: i64,
    ) -> Result<()> {
        instructions::disaster::close_disaster_handler(ctx, event_id, timestamp)
    }

    pub fn register_ngo(ctx: Context<RegisterNGO>, params: RegisterNGOParams) -> Result<()> {
        instructions::ngo::handler(ctx, params)
    }

    pub fn register_field_worker(
        ctx: Context<RegisterFieldWorker>,
        params: RegisterFieldWorkerParams,
    ) -> Result<()> {
        instructions::ngo::register_field_worker_handler(ctx, params)
    }

    pub fn update_field_worker_status(
        ctx: Context<UpdateFieldWorkerStatus>,
        params: UpdateFieldWorkerStatusParams,
    ) -> Result<()> {
        instructions::ngo::update_field_worker_status_handler(ctx, params)
    }

    pub fn update_ngo(
        ctx: Context<UpdateNGO>,
        params: UpdateNGOParams,
        timestamp: i64,
    ) -> Result<()> {
        instructions::ngo::update_ngo_handler(ctx, params, timestamp)
    }

    pub fn update_field_worker(
        ctx: Context<UpdateFieldWorker>,
        params: UpdateFieldWorkerParams,
        timestamp: i64,
    ) -> Result<()> {
        instructions::ngo::update_field_worker_handler(ctx, params, timestamp)
    }

    pub fn register_beneficiary<'info>(
        ctx: Context<'_, '_, 'info, 'info, RegisterBeneficiary<'info>>,
        params: RegisterBeneficiaryParams,
        timestamp: i64,
    ) -> Result<()> {
        instructions::beneficiary::handler(ctx, params, timestamp)
    }

    pub fn update_beneficiary(
        ctx: Context<UpdateBeneficiary>,
        beneficiary_authority: Pubkey,
        disaster_id: String,
        params: UpdateBeneficiaryParams,
    ) -> Result<()> {
        instructions::beneficiary::update_beneficiary_handler(
            ctx,
            beneficiary_authority,
            disaster_id,
            params,
        )
    }

    pub fn verify_beneficiary(
        ctx: Context<VerifyBeneficiary>,
        beneficiary_authority: Pubkey,
        disaster_id: String,
        timestamp: i64,
    ) -> Result<()> {
        instructions::verification::handler(ctx, beneficiary_authority, disaster_id, timestamp)
    }

    pub fn flag_beneficiary(
        ctx: Context<FlagBeneficiary>,
        beneficiary_authority: Pubkey,
        disaster_id: String,
        params: FlagBeneficiaryParams,
    ) -> Result<()> {
        instructions::verification::flag_beneficiary_handler(
            ctx,
            beneficiary_authority,
            disaster_id,
            params,
        )
    }

    pub fn review_flagged_beneficiary(
        ctx: Context<ReviewFlaggedBeneficiary>,
        beneficiary_authority: Pubkey,
        disaster_id: String,
        params: ReviewFlaggedBeneficiaryParams,
    ) -> Result<()> {
        instructions::verification::review_flagged_beneficiary_handler(
            ctx,
            beneficiary_authority,
            disaster_id,
            params,
        )
    }

    pub fn create_fund_pool(
        ctx: Context<CreateFundPool>,
        disaster_id: String,
        pool_id: String,
        timestamp: i64,
        params: Box<CreateFundPoolParams>,
    ) -> Result<()> {
        instructions::fund_pool::handler(ctx, disaster_id, pool_id, timestamp, params)
    }

    pub fn donate_to_pool<'info>(
        ctx: Context<'_, '_, 'info, 'info, DonateToPool<'info>>,
        disaster_id: String,
        pool_id: String,
        params: DonateToPoolParams,
        timestamp: i64,
    ) -> Result<()> {
        instructions::fund_pool::donate_to_pool_handler(
            ctx,
            disaster_id,
            pool_id,
            params,
            timestamp,
        )
    }

    pub fn update_pool_config(
        ctx: Context<UpdatePoolConfig>,
        disaster_id: String,
        pool_id: String,
        params: UpdatePoolConfigParams,
    ) -> Result<()> {
        instructions::fund_pool::update_pool_config_handler(ctx, disaster_id, pool_id, params)
    }

    pub fn close_pool(
        ctx: Context<ClosePool>,
        disaster_id: String,
        pool_id: String,
        timestamp: i64,
    ) -> Result<()> {
        instructions::fund_pool::close_pool_handler(ctx, disaster_id, pool_id, timestamp)
    }

    pub fn donate_direct(
        ctx: Context<DonateDirect>,
        beneficiary_authority: Pubkey,
        disaster_id: String,
        params: Box<DonateDirectParams>,
        timestamp: i64,
    ) -> Result<()> {
        instructions::donation::handler(ctx, beneficiary_authority, disaster_id, params, timestamp)
    }

    pub fn distribute_from_pool(
        ctx: Context<DistributeFromPool>,
        disaster_id: String,
        pool_id: String,
        params: DistributeFromPoolParams,
    ) -> Result<()> {
        instructions::distribution::handler(ctx, disaster_id, pool_id, params)
    }

    pub fn claim_distribution(
        ctx: Context<ClaimDistribution>,
        disaster_id: String,
        pool_id: String,
        timestamp: i64,
    ) -> Result<()> {
        instructions::distribution::claim_distribution_handler(ctx, disaster_id, pool_id, timestamp)
    }

    pub fn reclaim_expired_distribution(
        ctx: Context<ReclaimExpiredDistribution>,
        disaster_id: String,
        pool_id: String,
        beneficiary_authority: Pubkey,
    ) -> Result<()> {
        instructions::distribution::reclaim_expired_distribution_handler(
            ctx,
            disaster_id,
            pool_id,
            beneficiary_authority,
        )
    }

    pub fn register_beneficiary_for_pool(
        ctx: Context<RegisterBeneficiaryForPool>,
        disaster_id: String,
        pool_id: String,
        params: RegisterBeneficiaryForPoolParams,
        timestamp: i64,
    ) -> Result<()> {
        instructions::pool_registration::register_beneficiary_for_pool_handler(
            ctx,
            disaster_id,
            pool_id,
            params,
            timestamp,
        )
    }

    pub fn lock_pool_registration(
        ctx: Context<LockPoolRegistration>,
        disaster_id: String,
        pool_id: String,
        timestamp: i64,
    ) -> Result<()> {
        instructions::pool_registration::lock_pool_registration_handler(
            ctx,
            disaster_id,
            pool_id,
            timestamp,
        )
    }

    pub fn verify_ngo(
        ctx: Context<VerifyNGO>,
        ngo_authority: Pubkey,
        params: VerifyNGOParams,
        action_id: u64,
    ) -> Result<()> {
        instructions::admin::verify_ngo_handler(ctx, ngo_authority, params, action_id)
    }

    pub fn revoke_ngo_verification(
        ctx: Context<RevokeVerification>,
        ngo_authority: Pubkey,
        params: RevokeVerificationParams,
        action_id: u64,
    ) -> Result<()> {
        instructions::admin::revoke_verification_handler(ctx, ngo_authority, params, action_id)
    }

    pub fn update_ngo_status(
        ctx: Context<UpdateNGOStatus>,
        ngo_authority: Pubkey,
        params: UpdateNGOStatusParams,
        action_id: u64,
    ) -> Result<()> {
        instructions::admin::update_ngo_status_handler(ctx, ngo_authority, params, action_id)
    }

    pub fn blacklist_ngo(
        ctx: Context<BlacklistNGO>,
        ngo_authority: Pubkey,
        params: BlacklistNGOParams,
        action_id: u64,
    ) -> Result<()> {
        instructions::admin::blacklist_ngo_handler(ctx, ngo_authority, params, action_id)
    }

    pub fn remove_blacklist(
        ctx: Context<RemoveBlacklist>,
        ngo_authority: Pubkey,
        params: RemoveBlacklistParams,
        action_id: u64,
    ) -> Result<()> {
        instructions::admin::remove_blacklist_handler(ctx, ngo_authority, params, action_id)
    }

    pub fn batch_verify_ngos<'info>(
        ctx: Context<'_, '_, 'info, 'info, BatchVerifyNGOs<'info>>,
        params: BatchVerifyNGOsParams,
    ) -> Result<()> {
        instructions::admin::batch_verify_ngos_handler(ctx, params)
    }

    pub fn batch_update_ngo_status<'info>(
        ctx: Context<'_, '_, 'info, 'info, BatchUpdateNGOStatus<'info>>,
        params: BatchUpdateNGOStatusParams,
    ) -> Result<()> {
        instructions::admin::batch_update_ngo_status_handler(ctx, params)
    }

    pub fn initiate_admin_transfer(
        ctx: Context<InitiateAdminTransfer>,
        params: InitiateAdminTransferParams,
        action_id: u64,
    ) -> Result<()> {
        instructions::admin::initiate_admin_transfer_handler(ctx, params, action_id)
    }

    pub fn accept_admin_transfer(
        ctx: Context<AcceptAdminTransfer>,
        params: AcceptAdminTransferParams,
        action_id: u64,
    ) -> Result<()> {
        instructions::admin::accept_admin_transfer_handler(ctx, params, action_id)
    }

    pub fn cancel_admin_transfer(
        ctx: Context<CancelAdminTransfer>,
        params: CancelAdminTransferParams,
        action_id: u64,
    ) -> Result<()> {
        instructions::admin::cancel_admin_transfer_handler(ctx, params, action_id)
    }
}
