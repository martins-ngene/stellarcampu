use super::*;
use soroban_sdk::{
    testutils::Address as _,
    Address, BytesN, Env,
};

#[test]
fn test_initialize_and_double_initialize() {
    let env = Env::default();
    let contract_id = env.register(StellarCampusContract, ());
    let client = StellarCampusContractClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    assert_eq!(client.initialize(&admin), ());

    // Second initialization should fail
    let second_admin = Address::generate(&env);
    let res = client.try_initialize(&second_admin);
    assert_eq!(res, Err(Ok(ContractError::AlreadyInitialized)));
}

#[test]
fn test_successful_challenge_completion() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(StellarCampusContract, ());
    let client = StellarCampusContractClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    client.initialize(&admin);

    let student = Address::generate(&env);
    let challenge_id = 5u32;
    let evidence_nonce = BytesN::from_array(&env, &[42u8; 32]);

    // Initial count is 0
    assert_eq!(client.get_student_completed_count(&student), 0);
    assert_eq!(client.get_completion(&student, &challenge_id), None);

    // Complete challenge
    let res = client.complete_challenge(&student, &challenge_id, &evidence_nonce);
    assert!(res);

    // Verify stored record
    let record = client.get_completion(&student, &challenge_id).unwrap();
    assert_eq!(record.challenge_id, challenge_id);
    assert_eq!(record.evidence_nonce, evidence_nonce);
    assert_eq!(client.get_student_completed_count(&student), 1);
}

#[test]
fn test_prevent_duplicate_challenge_completion() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(StellarCampusContract, ());
    let client = StellarCampusContractClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    client.initialize(&admin);

    let student = Address::generate(&env);
    let challenge_id = 5u32;
    let evidence_nonce = BytesN::from_array(&env, &[1u8; 32]);

    // First completion passes
    assert!(client.complete_challenge(&student, &challenge_id, &evidence_nonce));

    // Duplicate completion fails with AlreadyCompleted error
    let res = client.try_complete_challenge(&student, &challenge_id, &evidence_nonce);
    assert_eq!(res, Err(Ok(ContractError::AlreadyCompleted)));
}

#[test]
fn test_admin_can_deactivate_and_activate_challenge() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(StellarCampusContract, ());
    let client = StellarCampusContractClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    client.initialize(&admin);

    let student = Address::generate(&env);
    let challenge_id = 10u32;
    let evidence_nonce = BytesN::from_array(&env, &[7u8; 32]);

    // Admin deactivates challenge 10
    client.set_challenge_status(&admin, &challenge_id, &false);
    assert!(!client.is_challenge_active(&challenge_id));

    // Completion should be rejected
    let res = client.try_complete_challenge(&student, &challenge_id, &evidence_nonce);
    assert_eq!(res, Err(Ok(ContractError::ChallengeInactive)));

    // Admin reactivates challenge 10
    client.set_challenge_status(&admin, &challenge_id, &true);
    assert!(client.is_challenge_active(&challenge_id));

    // Completion now succeeds
    assert!(client.complete_challenge(&student, &challenge_id, &evidence_nonce));
}

#[test]
fn test_unauthorized_admin_fails() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(StellarCampusContract, ());
    let client = StellarCampusContractClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    client.initialize(&admin);

    let attacker = Address::generate(&env);
    let res = client.try_set_challenge_status(&attacker, &1u32, &false);
    assert_eq!(res, Err(Ok(ContractError::UnauthorizedAdmin)));
}

#[test]
fn test_multiple_challenges_progress_tracking() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(StellarCampusContract, ());
    let client = StellarCampusContractClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    client.initialize(&admin);

    let student = Address::generate(&env);
    let nonce_a = BytesN::from_array(&env, &[10u8; 32]);
    let nonce_b = BytesN::from_array(&env, &[20u8; 32]);

    assert!(client.complete_challenge(&student, &1u32, &nonce_a));
    assert_eq!(client.get_student_completed_count(&student), 1);

    assert!(client.complete_challenge(&student, &2u32, &nonce_b));
    assert_eq!(client.get_student_completed_count(&student), 2);
}
