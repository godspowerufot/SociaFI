use starknet::ContractAddress;

#[starknet::interface]
pub trait IProfile<TContractState> {
    fn register(ref self: TContractState, username: ByteArray, bio: ByteArray, avatar_cid: ByteArray);
    fn update_profile(ref self: TContractState, bio: ByteArray, avatar_cid: ByteArray);
    fn follow(ref self: TContractState, target: ContractAddress);
    fn unfollow(ref self: TContractState, target: ContractAddress);
    fn get_profile(self: @TContractState, user: ContractAddress) -> UserProfile;
    fn is_registered(self: @TContractState, user: ContractAddress) -> bool;
    fn is_following(self: @TContractState, follower: ContractAddress, target: ContractAddress) -> bool;
    fn get_follower_count(self: @TContractState, user: ContractAddress) -> u64;
    fn get_following_count(self: @TContractState, user: ContractAddress) -> u64;
    fn get_followers(self: @TContractState, user: ContractAddress) -> Array<ContractAddress>;
    fn get_following(self: @TContractState, user: ContractAddress) -> Array<ContractAddress>;
    fn username_taken(self: @TContractState, username: ByteArray) -> bool;
    fn get_address_by_username(self: @TContractState, username: ByteArray) -> ContractAddress;
}

#[derive(Drop, Serde, Clone, starknet::Store)]
pub struct UserProfile {
    pub owner: ContractAddress, pub username: ByteArray, pub bio: ByteArray, pub avatar_cid: ByteArray,
    pub created_at: u64, pub follower_count: u64, pub following_count: u64, pub registered: bool
}

#[starknet::contract]
pub mod Profile {
    use super::{IProfile, UserProfile};
    use starknet::{get_caller_address, get_block_timestamp, ContractAddress};
    use starknet::storage::{Map, Vec, VecTrait, MutableVecTrait, StoragePointerReadAccess, StoragePointerWriteAccess, StoragePathEntry, StorageMapReadAccess, StorageMapWriteAccess};

    #[storage]
    struct Storage {
        profiles: Map<ContractAddress, UserProfile>, follows: Map<(ContractAddress, ContractAddress), bool>,
        follower_list: Map<ContractAddress, Vec<ContractAddress>>, following_list: Map<ContractAddress, Vec<ContractAddress>>,
        username_to_address: Map<felt252, ContractAddress>, user_count: u64
    }

    #[event]
    #[derive(Drop, starknet::Event)]
    pub enum Event { ProfileRegistered: ProfileRegistered, ProfileUpdated: ProfileUpdated, Followed: Followed, Unfollowed: Unfollowed }
    #[derive(Drop, starknet::Event)]
    pub struct ProfileRegistered { #[key] pub user: ContractAddress, pub username: ByteArray, pub timestamp: u64 }
    #[derive(Drop, starknet::Event)]
    pub struct ProfileUpdated { #[key] pub user: ContractAddress, pub bio: ByteArray }
    #[derive(Drop, starknet::Event)]
    pub struct Followed { #[key] pub follower: ContractAddress, #[key] pub target: ContractAddress }
    #[derive(Drop, starknet::Event)]
    pub struct Unfollowed { #[key] pub follower: ContractAddress, #[key] pub target: ContractAddress }

    #[constructor]
    fn constructor(ref self: ContractState) { self.user_count.write(0); }

    fn hash_byte_array(b: @ByteArray) -> felt252 {
        let mut arr: Array<felt252> = array![];
        let len = b.len();
        let mut i: u32 = 0;
        loop {
            if i >= len { break; }
            let byte_val: u8 = b.at(i).unwrap();
            arr.append(byte_val.into());
            i += 1;
        };
        arr.append(len.into());
        core::poseidon::poseidon_hash_span(arr.span())
    }

    #[abi(embed_v0)]
    impl ProfileImpl of IProfile<ContractState> {
        fn register(ref self: ContractState, username: ByteArray, bio: ByteArray, avatar_cid: ByteArray) {
            let caller = get_caller_address(); assert(!self.profiles.read(caller).registered, 'Already registered');
            let hash = hash_byte_array(@username);
            let zero_addr: ContractAddress = 0.try_into().unwrap();
            assert(self.username_to_address.read(hash) == zero_addr, 'Username already taken');
            let p = UserProfile { owner: caller, username: username.clone(), bio, avatar_cid, created_at: get_block_timestamp(), follower_count: 0, following_count: 0, registered: true };
            self.profiles.write(caller, p);
            self.username_to_address.write(hash, caller);
            self.user_count.write(self.user_count.read() + 1);
            self.emit(ProfileRegistered { user: caller, username, timestamp: get_block_timestamp() });
        }

        fn update_profile(ref self: ContractState, bio: ByteArray, avatar_cid: ByteArray) {
            let caller = get_caller_address(); let p = self.profiles.read(caller);
            assert(p.registered, 'Not registered'); self.profiles.write(caller, UserProfile { bio: bio.clone(), avatar_cid, ..p });
            self.emit(ProfileUpdated { user: caller, bio });
        }

        fn follow(ref self: ContractState, target: ContractAddress) {
            let caller = get_caller_address();
            assert(caller != target, 'Cannot follow yourself');
            assert(self.profiles.read(caller).registered, 'Not registered');
            assert(self.profiles.read(target).registered, 'Target not registered');
            assert(!self.follows.read((caller, target)), 'Already follows');
            self.follows.write((caller, target), true);
            self.follower_list.entry(target).push(caller);
            self.following_list.entry(caller).push(target);
            let mut tp = self.profiles.read(target); tp.follower_count += 1; self.profiles.write(target, tp);
            let mut cp = self.profiles.read(caller); cp.following_count += 1; self.profiles.write(caller, cp);
            self.emit(Followed { follower: caller, target });
        }

        fn unfollow(ref self: ContractState, target: ContractAddress) {
            let caller = get_caller_address(); assert(self.follows.read((caller, target)), 'Not following');
            self.follows.write((caller, target), false);
            let mut tp = self.profiles.read(target); if tp.follower_count > 0 { tp.follower_count -= 1; } self.profiles.write(target, tp);
            let mut cp = self.profiles.read(caller); if cp.following_count > 0 { cp.following_count -= 1; } self.profiles.write(caller, cp);
            self.emit(Unfollowed { follower: caller, target });
        }

        fn get_profile(self: @ContractState, user: ContractAddress) -> UserProfile { self.profiles.read(user) }
        fn is_registered(self: @ContractState, user: ContractAddress) -> bool { self.profiles.read(user).registered }
        fn is_following(self: @ContractState, follower: ContractAddress, target: ContractAddress) -> bool { self.follows.read((follower, target)) }
        fn get_follower_count(self: @ContractState, user: ContractAddress) -> u64 { self.profiles.read(user).follower_count }
        fn get_following_count(self: @ContractState, user: ContractAddress) -> u64 { self.profiles.read(user).following_count }
        fn get_followers(self: @ContractState, user: ContractAddress) -> Array<ContractAddress> {
            let mut res = array![]; let list = self.follower_list.entry(user); let len = list.len(); let mut i = 0;
            loop { if i >= len { break; } let addr = list.at(i).read(); if self.follows.read((addr, user)) { res.append(addr); } i += 1; }; res
        }
        fn get_following(self: @ContractState, user: ContractAddress) -> Array<ContractAddress> {
            let mut res = array![]; let list = self.following_list.entry(user); let len = list.len(); let mut i = 0;
            loop { if i >= len { break; } let addr = list.at(i).read(); if self.follows.read((user, addr)) { res.append(addr); } i += 1; }; res
        }
        fn username_taken(self: @ContractState, username: ByteArray) -> bool {
            let zero_addr: ContractAddress = 0.try_into().unwrap();
            self.username_to_address.read(hash_byte_array(@username)) != zero_addr
        }
        fn get_address_by_username(self: @ContractState, username: ByteArray) -> ContractAddress {
            self.username_to_address.read(hash_byte_array(@username))
        }
    }
}
