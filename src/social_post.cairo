use starknet::ContractAddress;

#[starknet::interface]
pub trait ISocialPost<TContractState> {
    fn create_post(ref self: TContractState, content_cid: ByteArray, title: ByteArray) -> u64;
    fn tip_creator(ref self: TContractState, post_id: u64, amount: u256);
    fn set_token_address(ref self: TContractState, post_id: u64, token_address: ContractAddress);
    fn get_post(self: @TContractState, post_id: u64) -> Post;
    fn get_all_posts(self: @TContractState) -> Array<Post>;
    fn get_posts_by_creator(self: @TContractState, creator: ContractAddress) -> Array<Post>;
    fn get_post_count(self: @TContractState) -> u64;
    fn get_tips_received(self: @TContractState, post_id: u64) -> u256;
}

#[derive(Drop, Serde, Clone, starknet::Store)]
pub struct Post {
    pub post_id: u64, pub creator: ContractAddress, pub title: ByteArray, pub content_cid: ByteArray,
    pub timestamp: u64, pub token_address: ContractAddress, pub tip_total: u256,
}

#[starknet::contract]
pub mod SocialPost {
    use super::{ISocialPost, Post};
    use starknet::{get_caller_address, get_block_timestamp, ContractAddress};
    use starknet::storage::{Map, Vec, VecTrait, MutableVecTrait, StoragePointerReadAccess, StoragePointerWriteAccess, StoragePathEntry, StorageMapReadAccess, StorageMapWriteAccess};

    #[starknet::interface]
    trait IERC20<TContractState> {
        fn transfer_from(ref self: TContractState, sender: ContractAddress, recipient: ContractAddress, amount: u256) -> bool;
    }

    #[storage]
    struct Storage {
        posts: Map<u64, Post>, post_count: u64, tips_received: Map<u64, u256>,
        creator_post_ids: Map<ContractAddress, Vec<u64>>, all_post_ids: Vec<u64>,
        strk_token: ContractAddress, owner: ContractAddress,
    }

    #[event]
    #[derive(Drop, starknet::Event)]
    pub enum Event { PostCreated: PostCreated, CreatorTipped: CreatorTipped, TokenAddressSet: TokenAddressSet }
    #[derive(Drop, starknet::Event)]
    pub struct PostCreated { #[key] pub post_id: u64, #[key] pub creator: ContractAddress, pub title: ByteArray, pub content_cid: ByteArray, pub timestamp: u64 }
    #[derive(Drop, starknet::Event)]
    pub struct CreatorTipped { #[key] pub post_id: u64, #[key] pub tipper: ContractAddress, pub recipient: ContractAddress, pub amount: u256 }
    #[derive(Drop, starknet::Event)]
    pub struct TokenAddressSet { #[key] pub post_id: u64, pub token_address: ContractAddress }

    #[constructor]
    fn constructor(ref self: ContractState, strk_token: ContractAddress, owner: ContractAddress) {
        self.strk_token.write(strk_token);
        self.owner.write(owner);
        self.post_count.write(0);
    }

    #[abi(embed_v0)]
    impl SocialPostImpl of ISocialPost<ContractState> {
        fn create_post(ref self: ContractState, content_cid: ByteArray, title: ByteArray) -> u64 {
            let caller = get_caller_address();
            let post_id = self.post_count.read() + 1;
            self.post_count.write(post_id);
            let post = Post { post_id, creator: caller, title: title.clone(), content_cid: content_cid.clone(), timestamp: get_block_timestamp(), token_address: 0.try_into().unwrap(), tip_total: 0 };
            self.posts.write(post_id, post);
            self.all_post_ids.push(post_id);
            self.creator_post_ids.entry(caller).push(post_id);
            self.emit(PostCreated { post_id, creator: caller, title, content_cid, timestamp: get_block_timestamp() });
            post_id
        }

        fn tip_creator(ref self: ContractState, post_id: u64, amount: u256) {
            let post = self.posts.read(post_id);
            assert(post.post_id > 0, 'Invalid post');
            let success = IERC20Dispatcher { contract_address: self.strk_token.read() }.transfer_from(get_caller_address(), post.creator, amount);
            assert(success, 'Tip failed');
            let prev = self.tips_received.read(post_id);
            self.tips_received.write(post_id, prev + amount);
            self.posts.write(post_id, Post { tip_total: prev + amount, ..post });
            self.emit(CreatorTipped { post_id, tipper: get_caller_address(), recipient: post.creator, amount });
        }

        fn set_token_address(ref self: ContractState, post_id: u64, token_address: ContractAddress) {
            let post = self.posts.read(post_id);
            assert(post.creator == get_caller_address(), 'Only creator can set token');
            self.posts.write(post_id, Post { token_address, ..post });
            self.emit(TokenAddressSet { post_id, token_address });
        }

        fn get_post(self: @ContractState, post_id: u64) -> Post { self.posts.read(post_id) }
        fn get_all_posts(self: @ContractState) -> Array<Post> {
            let mut res = array![]; let len = self.all_post_ids.len(); let mut i = len;
            loop { if i == 0 { break; } i -= 1; let id = self.all_post_ids.at(i).read(); res.append(self.posts.read(id)); }; res
        }
        fn get_posts_by_creator(self: @ContractState, creator: ContractAddress) -> Array<Post> {
            let mut res = array![]; let ids_path = self.creator_post_ids.entry(creator); let len = ids_path.len(); let mut i = len;
            loop { if i == 0 { break; } i -= 1; let id = ids_path.at(i).read(); res.append(self.posts.read(id)); }; res
        }
        fn get_post_count(self: @ContractState) -> u64 { self.post_count.read() }
        fn get_tips_received(self: @ContractState, post_id: u64) -> u256 { self.tips_received.read(post_id) }
    }
}
