#![no_std]
use soroban_sdk::{
    contract, contractimpl, contracttype, Address, Env, String, symbol_short,
    token::Client as TokenClient,
};

#[contracttype]
#[derive(Clone)]
pub struct Wish {
    pub id: u64,
    pub creator: Address,
    pub title: String,
    pub goal_amount: i128,
    pub funded_amount: i128,
    pub is_completed: bool,
}

#[contracttype]
pub enum DataKey {
    Wish(u64),
    WishCount,
    TokenContract,
}

#[contract]
pub struct WishManager;

#[contractimpl]
impl WishManager {
    pub fn initialize(env: Env, token_contract: Address) {
        env.storage()
            .instance()
            .set(&DataKey::TokenContract, &token_contract);
        env.storage()
            .instance()
            .set(&DataKey::WishCount, &0u64);
    }

    pub fn create_wish(env: Env, creator: Address, title: String, goal_amount: i128) -> u64 {
        creator.require_auth();
        let count: u64 = env.storage()
            .instance()
            .get(&DataKey::WishCount)
            .unwrap_or(0);
        let wish_id = count + 1;
        let wish = Wish {
            id: wish_id,
            creator: creator.clone(),
            title,
            goal_amount,
            funded_amount: 0,
            is_completed: false,
        };
        env.storage()
            .persistent()
            .set(&DataKey::Wish(wish_id), &wish);
        env.storage()
            .instance()
            .set(&DataKey::WishCount, &wish_id);
        env.events()
            .publish((symbol_short!("created"),), (wish_id, creator, goal_amount));
        wish_id
    }

    pub fn fund_wish(env: Env, funder: Address, wish_id: u64, amount: i128) {
        funder.require_auth();
        let mut wish: Wish = env.storage()
            .persistent()
            .get(&DataKey::Wish(wish_id))
            .unwrap();
        assert!(!wish.is_completed, "wish already completed");
        assert!(amount > 0, "amount must be greater than 0");

        let token_contract: Address = env.storage()
            .instance()
            .get(&DataKey::TokenContract)
            .unwrap();
        let token_client = TokenClient::new(&env, &token_contract);
        token_client.transfer(&funder, &env.current_contract_address(), &amount);

        wish.funded_amount += amount;
        if wish.funded_amount >= wish.goal_amount {
            wish.is_completed = true;
            env.events()
                .publish((symbol_short!("completed"),), (wish_id, wish.funded_amount));
        }
        env.storage()
            .persistent()
            .set(&DataKey::Wish(wish_id), &wish);
        env.events()
            .publish((symbol_short!("funded"),), (wish_id, funder, amount));
    }

    pub fn remove_wish(env: Env, caller: Address, wish_id: u64) {
        caller.require_auth();
        let wish: Wish = env.storage()
            .persistent()
            .get(&DataKey::Wish(wish_id))
            .unwrap();
        assert!(wish.creator == caller, "only creator can remove wish");
        assert!(!wish.is_completed, "cannot remove completed wish");
        env.storage()
            .persistent()
            .remove(&DataKey::Wish(wish_id));
        env.events()
            .publish((symbol_short!("removed"),), (wish_id, caller));
    }

    pub fn get_wish(env: Env, wish_id: u64) -> Wish {
        env.storage()
            .persistent()
            .get(&DataKey::Wish(wish_id))
            .unwrap()
    }

    pub fn get_wish_count(env: Env) -> u64 {
        env.storage()
            .instance()
            .get(&DataKey::WishCount)
            .unwrap_or(0)
    }
}

#[cfg(test)]
mod test {
    use super::*;
    use soroban_sdk::testutils::Address as _;
    use soroban_sdk::{Env, String};

    #[test]
    fn test_create_wish() {
        let env = Env::default();
        env.mock_all_auths();

        let contract_id = env.register_contract(None, WishManager);
        let client = WishManagerClient::new(&env, &contract_id);

        let token = Address::generate(&env);
        let creator = Address::generate(&env);

        client.initialize(&token);

        let wish_id = client.create_wish(
            &creator,
            &String::from_str(&env, "New Laptop"),
            &1000,
        );

        assert_eq!(wish_id, 1);

        let wish = client.get_wish(&wish_id);
        assert_eq!(wish.goal_amount, 1000);
        assert_eq!(wish.funded_amount, 0);
        assert_eq!(wish.is_completed, false);
    }

    #[test]
    fn test_wish_count() {
        let env = Env::default();
        env.mock_all_auths();

        let contract_id = env.register_contract(None, WishManager);
        let client = WishManagerClient::new(&env, &contract_id);

        let token = Address::generate(&env);
        let creator = Address::generate(&env);

        client.initialize(&token);

        client.create_wish(&creator, &String::from_str(&env, "Wish 1"), &500);
        client.create_wish(&creator, &String::from_str(&env, "Wish 2"), &1000);

        assert_eq!(client.get_wish_count(), 2);
    }
}