#![no_std]
use soroban_sdk::{
    contract, contracterror, contractimpl, contracttype, symbol_short, Address, BytesN, Env,
};

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum ContractError {
    AlreadyInitialized = 1,
    NotInitialized = 2,
    UnauthorizedAdmin = 3,
    ChallengeInactive = 4,
    AlreadyCompleted = 5,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct ChallengeRecord {
    pub challenge_id: u32,
    pub completed_at: u64,
    pub evidence_nonce: BytesN<32>,
}

#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    Admin,
    ChallengeActive(u32),
    Completion(Address, u32),
    StudentCount(Address),
}

const LEDGER_BUMP_AMOUNT: u32 = 518_400; // ~30 days at 5 sec/ledger
const LEDGER_LIFETIME_THRESHOLD: u32 = 17_280; // ~1 day

#[contract]
pub struct StellarCampusContract;

#[contractimpl]
impl StellarCampusContract {
    /// Initialize the contract with the primary admin address
    pub fn initialize(env: Env, admin: Address) -> Result<(), ContractError> {
        if env.storage().instance().has(&DataKey::Admin) {
            return Err(ContractError::AlreadyInitialized);
        }
        env.storage().instance().set(&DataKey::Admin, &admin);
        Ok(())
    }

    /// Admin toggles whether a challenge ID is active or retired
    pub fn set_challenge_status(
        env: Env,
        admin: Address,
        challenge_id: u32,
        active: bool,
    ) -> Result<(), ContractError> {
        admin.require_auth();
        let stored_admin: Address = env
            .storage()
            .instance()
            .get(&DataKey::Admin)
            .ok_or(ContractError::NotInitialized)?;

        if admin != stored_admin {
            return Err(ContractError::UnauthorizedAdmin);
        }

        env.storage()
            .instance()
            .set(&DataKey::ChallengeActive(challenge_id), &active);
        Ok(())
    }

    /// Check if a challenge is active (defaults to active if not explicitly toggled)
    pub fn is_challenge_active(env: Env, challenge_id: u32) -> bool {
        env.storage()
            .instance()
            .get(&DataKey::ChallengeActive(challenge_id))
            .unwrap_or(true)
    }

    /// Complete a challenge. Enforces that the student's wallet signed the invocation.
    pub fn complete_challenge(
        env: Env,
        student: Address,
        challenge_id: u32,
        evidence_nonce: BytesN<32>,
    ) -> Result<bool, ContractError> {
        // Enforce student ownership - only the authorized student address can complete for itself
        student.require_auth();

        // Check if the challenge is active
        if !Self::is_challenge_active(env.clone(), challenge_id) {
            return Err(ContractError::ChallengeInactive);
        }

        // Prevent duplicate completions
        let completion_key = DataKey::Completion(student.clone(), challenge_id);
        if env.storage().persistent().has(&completion_key) {
            return Err(ContractError::AlreadyCompleted);
        }

        let completed_at = env.ledger().timestamp();
        let record = ChallengeRecord {
            challenge_id,
            completed_at,
            evidence_nonce: evidence_nonce.clone(),
        };

        // Persist completion record and extend TTL
        env.storage().persistent().set(&completion_key, &record);
        env.storage().persistent().extend_ttl(
            &completion_key,
            LEDGER_LIFETIME_THRESHOLD,
            LEDGER_BUMP_AMOUNT,
        );

        // Increment student's completed challenge counter
        let count_key = DataKey::StudentCount(student.clone());
        let count: u32 = env.storage().persistent().get(&count_key).unwrap_or(0);
        env.storage().persistent().set(&count_key, &(count + 1));
        env.storage().persistent().extend_ttl(
            &count_key,
            LEDGER_LIFETIME_THRESHOLD,
            LEDGER_BUMP_AMOUNT,
        );

        // Publish searchable Soroban event
        env.events().publish(
            (symbol_short!("verify"), student, challenge_id),
            (completed_at, evidence_nonce),
        );

        Ok(true)
    }

    /// Read-only method to fetch completion record
    pub fn get_completion(env: Env, student: Address, challenge_id: u32) -> Option<ChallengeRecord> {
        env.storage()
            .persistent()
            .get(&DataKey::Completion(student, challenge_id))
    }

    /// Read-only method to fetch total verified challenges completed on-chain
    pub fn get_student_completed_count(env: Env, student: Address) -> u32 {
        env.storage()
            .persistent()
            .get(&DataKey::StudentCount(student))
            .unwrap_or(0)
    }
}

#[cfg(test)]
mod test;
