// ============================================================
// Tests for the Social DApp contracts
// Run with: snforge test
// ============================================================

#[cfg(test)]
mod test_social_post {
    use snforge_std::{
        declare, ContractClassTrait, DeclareResultTrait,
        start_cheat_caller_address, stop_cheat_caller_address,
        start_cheat_block_timestamp, stop_cheat_block_timestamp,
    };
    use starknet::ContractAddress;
    use social_dapp::social_post::{ISocialPostDispatcher, ISocialPostDispatcherTrait};

    fn STRK_TOKEN() -> ContractAddress { 'STRK'.try_into().unwrap() }
    fn OWNER()      -> ContractAddress { 0x1111.try_into().unwrap() }
    fn ALICE()      -> ContractAddress { 0xAAAA.try_into().unwrap() }
    fn BOB()        -> ContractAddress { 0xBBBB.try_into().unwrap() }

    fn deploy_social_post() -> ContractAddress {
        let contract = declare("SocialPost").unwrap().contract_class();
        let mut calldata = array![
            STRK_TOKEN().into(),
            OWNER().into(),
        ];
        let (address, _) = contract.deploy(@calldata).unwrap();
        address
    }

    #[test]
    fn test_create_post_increments_count() {
        let addr = deploy_social_post();
        let dispatcher = ISocialPostDispatcher { contract_address: addr };

        start_cheat_caller_address(addr, ALICE());
        start_cheat_block_timestamp(addr, 1000);

        let post_id = dispatcher.create_post("bafybeig12345", "My first post");
        assert(post_id == 1, 'First post should be ID 1');
        assert(dispatcher.get_post_count() == 1, 'Count should be 1');

        stop_cheat_caller_address(addr);
        stop_cheat_block_timestamp(addr);
    }

    #[test]
    fn test_create_multiple_posts() {
        let addr = deploy_social_post();
        let dispatcher = ISocialPostDispatcher { contract_address: addr };

        start_cheat_caller_address(addr, ALICE());
        dispatcher.create_post("cid_1", "Post 1");
        dispatcher.create_post("cid_2", "Post 2");
        stop_cheat_caller_address(addr);

        start_cheat_caller_address(addr, BOB());
        dispatcher.create_post("cid_3", "Bob post");
        stop_cheat_caller_address(addr);

        assert(dispatcher.get_post_count() == 3, 'Should have 3 posts');
    }

    #[test]
    fn test_get_post_data() {
        let addr = deploy_social_post();
        let dispatcher = ISocialPostDispatcher { contract_address: addr };

        start_cheat_caller_address(addr, ALICE());
        start_cheat_block_timestamp(addr, 9999);
        let post_id = dispatcher.create_post("bafyXYZ", "Hello world");
        stop_cheat_caller_address(addr);
        stop_cheat_block_timestamp(addr);

        let post = dispatcher.get_post(post_id);
        assert(post.creator == ALICE(), 'Wrong creator');
        assert(post.timestamp == 9999, 'Wrong timestamp');
        assert(post.tip_total == 0_u256, 'Tip total should start 0');
    }

    #[test]
    fn test_get_all_posts_newest_first() {
        let addr = deploy_social_post();
        let dispatcher = ISocialPostDispatcher { contract_address: addr };

        start_cheat_caller_address(addr, ALICE());
        dispatcher.create_post("cid_1", "Post 1");
        dispatcher.create_post("cid_2", "Post 2");
        dispatcher.create_post("cid_3", "Post 3");
        stop_cheat_caller_address(addr);

        let posts = dispatcher.get_all_posts();
        assert(posts.len() == 3, 'Should return 3 posts');
        // Newest first: post 3 should be index 0
        assert(*posts.at(0).post_id == 3, 'First should be post 3');
        assert(*posts.at(2).post_id == 1, 'Last should be post 1');
    }

    #[test]
    fn test_get_posts_by_creator() {
        let addr = deploy_social_post();
        let dispatcher = ISocialPostDispatcher { contract_address: addr };

        start_cheat_caller_address(addr, ALICE());
        dispatcher.create_post("cid_a1", "Alice post 1");
        dispatcher.create_post("cid_a2", "Alice post 2");
        stop_cheat_caller_address(addr);

        start_cheat_caller_address(addr, BOB());
        dispatcher.create_post("cid_b1", "Bob post 1");
        stop_cheat_caller_address(addr);

        let alice_posts = dispatcher.get_posts_by_creator(ALICE());
        assert(alice_posts.len() == 2, 'Alice should have 2 posts');

        let bob_posts = dispatcher.get_posts_by_creator(BOB());
        assert(bob_posts.len() == 1, 'Bob should have 1 post');
    }

    #[test]
    fn test_set_token_address_by_creator() {
        let addr = deploy_social_post();
        let dispatcher = ISocialPostDispatcher { contract_address: addr };

        start_cheat_caller_address(addr, ALICE());
        let post_id = dispatcher.create_post("cid", "title");
        let fake_token: ContractAddress = 'TOKEN'.try_into().unwrap();
        dispatcher.set_token_address(post_id, fake_token);
        stop_cheat_caller_address(addr);

        let post = dispatcher.get_post(post_id);
        assert(post.token_address == fake_token, 'Token not set');
    }

    #[test]
    #[should_panic(expected: ('Only creator can set token',))]
    fn test_set_token_address_fails_for_non_creator() {
        let addr = deploy_social_post();
        let dispatcher = ISocialPostDispatcher { contract_address: addr };

        start_cheat_caller_address(addr, ALICE());
        let post_id = dispatcher.create_post("cid", "title");
        stop_cheat_caller_address(addr);

        // BOB tries to set token on Alice's post — should fail
        start_cheat_caller_address(addr, BOB());
        dispatcher.set_token_address(post_id, 'FAKE'.try_into().unwrap());
        stop_cheat_caller_address(addr);
    }
}

// ============================================================
#[cfg(test)]
mod test_profile {
    use snforge_std::{
        declare, ContractClassTrait, DeclareResultTrait,
        start_cheat_caller_address, stop_cheat_caller_address,
    };
    use starknet::ContractAddress;
    use social_dapp::profile::{IProfileDispatcher, IProfileDispatcherTrait};

    fn ALICE() -> ContractAddress { 0xAAAA.try_into().unwrap() }
    fn BOB()   -> ContractAddress { 0xBBBB.try_into().unwrap() }

    fn deploy_profile() -> ContractAddress {
        let contract = declare("Profile").unwrap().contract_class();
        let (address, _) = contract.deploy(@array![]).unwrap();
        address
    }

    #[test]
    fn test_register_profile() {
        let addr = deploy_profile();
        let d = IProfileDispatcher { contract_address: addr };

        start_cheat_caller_address(addr, ALICE());
        d.register("alice", "I am Alice", "bafyAVATAR");
        stop_cheat_caller_address(addr);

        assert(d.is_registered(ALICE()), 'Alice should be registered');
        let profile = d.get_profile(ALICE());
        assert(profile.follower_count == 0, 'Should start with 0 followers');
    }

    #[test]
    #[should_panic(expected: ('Already registered',))]
    fn test_cannot_register_twice() {
        let addr = deploy_profile();
        let d = IProfileDispatcher { contract_address: addr };

        start_cheat_caller_address(addr, ALICE());
        d.register("alice", "bio", "cid");
        d.register("alice2", "bio2", "cid2"); // should panic
        stop_cheat_caller_address(addr);
    }

    #[test]
    #[should_panic(expected: ('Username already taken',))]
    fn test_username_uniqueness() {
        let addr = deploy_profile();
        let d = IProfileDispatcher { contract_address: addr };

        start_cheat_caller_address(addr, ALICE());
        d.register("coolname", "bio", "cid");
        stop_cheat_caller_address(addr);

        start_cheat_caller_address(addr, BOB());
        d.register("coolname", "other bio", "cid2"); // same username → panic
        stop_cheat_caller_address(addr);
    }

    #[test]
    fn test_follow_and_unfollow() {
        let addr = deploy_profile();
        let d = IProfileDispatcher { contract_address: addr };

        start_cheat_caller_address(addr, ALICE());
        d.register("alice", "Alice", "a.jpg");
        stop_cheat_caller_address(addr);

        start_cheat_caller_address(addr, BOB());
        d.register("bob", "Bob", "b.jpg");
        d.follow(ALICE());
        stop_cheat_caller_address(addr);

        assert(d.is_following(BOB(), ALICE()), 'Bob should follow Alice');
        assert(d.get_follower_count(ALICE()) == 1, 'Alice should have 1 follower');
        assert(d.get_following_count(BOB()) == 1, 'Bob should follow 1');

        start_cheat_caller_address(addr, BOB());
        d.unfollow(ALICE());
        stop_cheat_caller_address(addr);

        assert(!d.is_following(BOB(), ALICE()), 'Bob should not follow Alice');
        assert(d.get_follower_count(ALICE()) == 0, 'Alice should have 0 followers');
    }

    #[test]
    #[should_panic(expected: ('Cannot follow yourself',))]
    fn test_cannot_self_follow() {
        let addr = deploy_profile();
        let d = IProfileDispatcher { contract_address: addr };

        start_cheat_caller_address(addr, ALICE());
        d.register("alice", "Alice", "a.jpg");
        d.follow(ALICE()); // should panic
        stop_cheat_caller_address(addr);
    }

    #[test]
    fn test_update_profile() {
        let addr = deploy_profile();
        let d = IProfileDispatcher { contract_address: addr };

        start_cheat_caller_address(addr, ALICE());
        d.register("alice", "Old bio", "old.jpg");
        d.update_profile("New bio", "new.jpg");
        stop_cheat_caller_address(addr);

        let profile = d.get_profile(ALICE());
        assert(profile.bio == "New bio", 'Bio not updated');
    }
}

// ============================================================
#[cfg(test)]
mod test_savings_vault {
    use snforge_std::{
        declare, ContractClassTrait, DeclareResultTrait,
        start_cheat_caller_address, stop_cheat_caller_address,
    };
    use starknet::ContractAddress;
    use social_dapp::savings_vault::{ISavingsVaultDispatcher, ISavingsVaultDispatcherTrait};

    fn STRK() -> ContractAddress { 'STRK'.try_into().unwrap() }
    fn OWNER() -> ContractAddress { 0x1111.try_into().unwrap() }
    fn ALICE() -> ContractAddress { 0xAAAA.try_into().unwrap() }

    fn deploy_vault() -> ContractAddress {
        let contract = declare("SavingsVault").unwrap().contract_class();
        let (address, _) = contract
            .deploy(@array![OWNER().into(), STRK().into()])
            .unwrap();
        address
    }

    #[test]
    fn test_initial_balance_is_zero() {
        let addr = deploy_vault();
        let d = ISavingsVaultDispatcher { contract_address: addr };
        assert(d.get_balance(ALICE(), STRK()) == 0_u256, 'Should start at 0');
    }

    #[test]
    fn test_strk_supported_by_default() {
        let addr = deploy_vault();
        let d = ISavingsVaultDispatcher { contract_address: addr };
        assert(d.is_supported_token(STRK()), 'STRK should be supported');
    }

    #[test]
    fn test_add_supported_token() {
        let addr = deploy_vault();
        let d = ISavingsVaultDispatcher { contract_address: addr };
        let usdc: ContractAddress = 'USDC'.try_into().unwrap();

        start_cheat_caller_address(addr, OWNER());
        d.add_supported_token(usdc);
        stop_cheat_caller_address(addr);

        assert(d.is_supported_token(usdc), 'USDC should be supported');
    }

    #[test]
    #[should_panic(expected: ('Token not supported',))]
    fn test_deposit_unsupported_token_fails() {
        let addr = deploy_vault();
        let d = ISavingsVaultDispatcher { contract_address: addr };
        let random: ContractAddress = 0x9999.try_into().unwrap();

        start_cheat_caller_address(addr, ALICE());
        d.deposit(random, 100_u256); // should panic
        stop_cheat_caller_address(addr);
    }
}

// ============================================================
#[cfg(test)]
mod test_marketplace {
    use snforge_std::{
        declare, ContractClassTrait, DeclareResultTrait,
    };
    use starknet::ContractAddress;
    use social_dapp::marketplace::{IMarketplaceDispatcher, IMarketplaceDispatcherTrait};

    fn STRK()     -> ContractAddress { 'STRK'.try_into().unwrap() }
    fn FEE_RCPT() -> ContractAddress { 'FEE'.try_into().unwrap() }
    fn VAULT()    -> ContractAddress { 'VAULT'.try_into().unwrap() }
    fn OWNER()    -> ContractAddress { 0x1111.try_into().unwrap() }
    fn ALICE()    -> ContractAddress { 0xAAAA.try_into().unwrap() }

    fn deploy_marketplace() -> ContractAddress {
        let contract = declare("Marketplace").unwrap().contract_class();
        let (address, _) = contract.deploy(@array![
            STRK().into(),
            250, 0,  // 2.5% fee (u256 low, high)
            FEE_RCPT().into(),
            VAULT().into(),
            OWNER().into(),
        ]).unwrap();
        address
    }

    #[test]
    fn test_listing_count_starts_zero() {
        let addr = deploy_marketplace();
        let d = IMarketplaceDispatcher { contract_address: addr };
        assert(d.get_listing_count() == 0, 'Should start at 0');
    }

    #[test]
    fn test_protocol_fee() {
        let addr = deploy_marketplace();
        let d = IMarketplaceDispatcher { contract_address: addr };
        assert(d.get_protocol_fee_bps() == 250_u256, 'Fee should be 2.5%');
    }

    #[test]
    fn test_active_listings_starts_empty() {
        let addr = deploy_marketplace();
        let d = IMarketplaceDispatcher { contract_address: addr };
        let listings = d.get_all_active_listings();
        assert(listings.len() == 0, 'Should be empty');
    }
}
