use anchor_lang::prelude::*;

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq)]
pub enum DisasterType {
    // Natural Disasters - Geological
    Earthquake,
    Volcano,
    Landslide,
    Avalanche,
    Sinkhole,

    // Natural Disasters - Weather/Climate
    Flood,
    Hurricane,
    Tornado,
    Drought,
    Wildfire,
    Blizzard,
    Heatwave,
    Tsunami,

    // Human-Made Disasters
    IndustrialAccident,
    ChemicalSpill,
    NuclearAccident,
    OilSpill,
    BuildingCollapse,
    Transportation,

    // Conflict & Security
    Conflict,
    Terrorism,
    CivilUnrest,

    // Health & Biological
    Pandemic,
    FoodPoisoning,
    AnimalAttack,

    // Other
    Other,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq)]
pub enum VerificationStatus {
    Pending,
    Verified,
    Rejected,
    Flagged,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq, Debug)]
pub enum DistributionType {
    Equal,
    WeightedFamily,
    WeightedDamage,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq)]
pub enum DonationType {
    Direct,
    Pool,
    Anonymous,
}
