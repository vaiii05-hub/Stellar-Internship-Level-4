#![no_std]
use soroban_sdk::{contract, contractimpl, contracttype, Address, Env, symbol_short};

#[contracttype]
pub enum DataKey {
    Balance(Address),
    Admin,
}

#[contract]
pub struct WishToken;

#[contractimpl]
impl WishToken {
    pub fn initialize(env: Env, admin: Address) {
        admin.require_auth();
        env.storage().instance().set(&DataKey::Admin, &admin);
    }

    pub fn mint(env: Env, to: Address, amount: i128) {
        let admin: Address = env.storage()
            .instance()
            .get(&DataKey::Admin)
            .unwrap();
        admin.require_auth();
        let current: i128 = env.storage()
            .persistent()
            .get(&DataKey::Balance(to.clone()))
            .unwrap_or(0);
        env.storage()
            .persistent()
            .set(&DataKey::Balance(to.clone()), &(current + amount));
        env.events()
            .publish((symbol_short!("mint"),), (to, amount));
    }

    pub fn balance(env: Env, addr: Address) -> i128 {
        env.storage()
            .persistent()
            .get(&DataKey::Balance(addr))
            .unwrap_or(0)
    }

    pub fn transfer(env: Env, from: Address, to: Address, amount: i128) {
        from.require_auth();
        let from_balance: i128 = env.storage()
            .persistent()
            .get(&DataKey::Balance(from.clone()))
            .unwrap_or(0);
        assert!(from_balance >= amount, "insufficient balance");
        env.storage()
            .persistent()
            .set(&DataKey::Balance(from.clone()), &(from_balance - amount));
        let to_balance: i128 = env.storage()
            .persistent()
            .get(&DataKey::Balance(to.clone()))
            .unwrap_or(0);
        env.storage()
            .persistent()
            .set(&DataKey::Balance(to.clone()), &(to_balance + amount));
        env.events()
            .publish((symbol_short!("transfer"),), (from, to, amount));
    }
}



#[cfg(test)]
mod test {
    use super::*;
    use soroban_sdk::testutils::Address as _;
    use soroban_sdk::Env;

    #[test]
    fn test_mint_and_balance() {
        let env = Env::default();
        env.mock_all_auths();
        let contract_id = env.register_contract(None, WishToken);
        let client = WishTokenClient::new(&env, &contract_id);

        let admin = Address::generate(&env);
        let user = Address::generate(&env);

        client.initialize(&admin);
        client.mint(&user, &1000);

        assert_eq!(client.balance(&user), 1000);
    }

    #[test]
    fn test_transfer() {
        let env = Env::default();
        env.mock_all_auths();
        let contract_id = env.register_contract(None, WishToken);
        let client = WishTokenClient::new(&env, &contract_id);

        let admin = Address::generate(&env);
        let user1 = Address::generate(&env);
        let user2 = Address::generate(&env);

        client.initialize(&admin);
        client.mint(&user1, &1000);
        client.transfer(&user1, &user2, &500);

        assert_eq!(client.balance(&user1), 500);
        assert_eq!(client.balance(&user2), 500);
    }
}