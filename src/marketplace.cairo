use starknet::ContractAddress;

#[starknet::interface]
pub trait IMarketplace<TContractState> {
    fn list_token(ref self: TContractState, content_token: ContractAddress, amount: u256, price_per_token: u256, auto_save_pct: u8) -> u64;
    fn buy(ref self: TContractState, listing_id: u64, amount: u256);
    fn cancel_listing(ref self: TContractState, listing_id: u64);
    fn update_price(ref self: TContractState, listing_id: u64, new_price: u256);
    fn get_listing(self: @TContractState, listing_id: u64) -> Listing;
    fn get_all_active_listings(self: @TContractState) -> Array<Listing>;
    fn get_listings_by_seller(self: @TContractState, seller: ContractAddress) -> Array<Listing>;
    fn get_listings_by_token(self: @TContractState, token: ContractAddress) -> Array<Listing>;
    fn get_listing_count(self: @TContractState) -> u64;
    fn get_protocol_fee_bps(self: @TContractState) -> u256;
}

#[derive(Drop, Serde, Clone, starknet::Store)]
pub struct Listing {
    pub listing_id: u64, pub seller: ContractAddress, pub content_token: ContractAddress, pub amount: u256,
    pub price_per_token: u256, pub auto_save_pct: u8, pub active: bool, pub created_at: u64,
}

#[starknet::contract]
pub mod Marketplace {
    use super::{IMarketplace, Listing};
    use starknet::{get_caller_address, get_block_timestamp, ContractAddress};
    use starknet::storage::{Map, Vec, VecTrait, MutableVecTrait, StoragePointerReadAccess, StoragePointerWriteAccess, StoragePathEntry, StorageMapReadAccess, StorageMapWriteAccess};

    #[starknet::interface]
    trait IERC20<TContractState> {
        fn transfer(ref self: TContractState, recipient: ContractAddress, amount: u256) -> bool;
        fn transfer_from(ref self: TContractState, sender: ContractAddress, recipient: ContractAddress, amount: u256) -> bool;
        fn approve(ref self: TContractState, spender: ContractAddress, amount: u256) -> bool;
    }

    #[starknet::interface]
    trait ISavingsVault<TContractState> {
        fn deposit_earnings(ref self: TContractState, beneficiary: ContractAddress, token: ContractAddress, amount: u256);
    }

    #[storage]
    struct Storage {
        listings: Map<u64, Listing>, listing_count: u64, all_listing_ids: Vec<u64>,
        seller_listing_ids: Map<ContractAddress, Vec<u64>>, token_listing_ids: Map<ContractAddress, Vec<u64>>,
        strk_token: ContractAddress, protocol_fee_bps: u256, protocol_fee_recipient: ContractAddress,
        savings_vault: ContractAddress, owner: ContractAddress,
    }

    #[event]
    #[derive(Drop, starknet::Event)]
    pub enum Event {Listed: Listed, Bought: Bought, ListingCancelled: ListingCancelled, PriceUpdated: PriceUpdated}
    #[derive(Drop, starknet::Event)]
    pub struct Listed { #[key] pub listing_id: u64, #[key] pub seller: ContractAddress, pub content_token: ContractAddress, pub amount: u256, pub price_per_token: u256 }
    #[derive(Drop, starknet::Event)]
    pub struct Bought { #[key] pub listing_id: u64, #[key] pub buyer: ContractAddress, pub seller: ContractAddress, pub amount: u256, pub total_cost: u256, pub seller_received: u256, pub saved_to_vault: u256 }
    #[derive(Drop, starknet::Event)]
    pub struct ListingCancelled { #[key] pub listing_id: u64, pub seller: ContractAddress }
    #[derive(Drop, starknet::Event)]
    pub struct PriceUpdated { #[key] pub listing_id: u64, pub old_price: u256, pub new_price: u256 }

    #[constructor]
    fn constructor(ref self: ContractState, strk_token: ContractAddress, protocol_fee_bps: u256, protocol_fee_recipient: ContractAddress, savings_vault: ContractAddress, owner: ContractAddress) {
        self.strk_token.write(strk_token);
        self.protocol_fee_bps.write(protocol_fee_bps);
        self.protocol_fee_recipient.write(protocol_fee_recipient);
        self.savings_vault.write(savings_vault);
        self.owner.write(owner);
        self.listing_count.write(0);
    }

    #[abi(embed_v0)]
    impl MarketplaceImpl of IMarketplace<ContractState> {
        fn list_token(ref self: ContractState, content_token: ContractAddress, amount: u256, price_per_token: u256, auto_save_pct: u8) -> u64 {
            let seller = get_caller_address();
            let erc20 = IERC20Dispatcher { contract_address: content_token };
            assert(erc20.transfer_from(seller, starknet::get_contract_address(), amount), 'Escrow failed');
            let listing_id = self.listing_count.read() + 1;
            self.listing_count.write(listing_id);
            let listing = Listing { listing_id, seller, content_token, amount, price_per_token, auto_save_pct, active: true, created_at: get_block_timestamp() };
            self.listings.write(listing_id, listing);
            self.all_listing_ids.push(listing_id);
            self.seller_listing_ids.entry(seller).push(listing_id);
            self.token_listing_ids.entry(content_token).push(listing_id);
            self.emit(Listed { listing_id, seller, content_token, amount, price_per_token });
            listing_id
        }

        fn buy(ref self: ContractState, listing_id: u64, amount: u256) {
            let listing = self.listings.read(listing_id);
            assert(listing.active && listing.amount >= amount, 'Invalid listing');
            let buyer = get_caller_address();
            let total_cost = amount * listing.price_per_token;
            let protocol_fee = (total_cost * self.protocol_fee_bps.read()) / 10000_u256;
            let gross_seller = total_cost - protocol_fee;
            let save_amt = if listing.auto_save_pct > 0 { (gross_seller * listing.auto_save_pct.into()) / 100_u256 } else { 0_u256 };
            let seller_receives = gross_seller - save_amt;
            let strk = IERC20Dispatcher { contract_address: self.strk_token.read() };
            assert(strk.transfer_from(buyer, starknet::get_contract_address(), total_cost), 'Payment failed');
            if protocol_fee > 0 { strk.transfer(self.protocol_fee_recipient.read(), protocol_fee); }
            if seller_receives > 0 { strk.transfer(listing.seller, seller_receives); }
            if save_amt > 0 {
                let vault_addr = self.savings_vault.read();
                let zero_addr: ContractAddress = 0.try_into().unwrap();
                if vault_addr != zero_addr {
                    strk.approve(vault_addr, save_amt);
                    ISavingsVaultDispatcher { contract_address: vault_addr }.deposit_earnings(listing.seller, self.strk_token.read(), save_amt);
                } else { strk.transfer(listing.seller, save_amt); }
            }
            IERC20Dispatcher { contract_address: listing.content_token }.transfer(buyer, amount);
            self.listings.write(listing_id, Listing { amount: listing.amount - amount, active: (listing.amount - amount) > 0, ..listing });
            self.emit(Bought { listing_id, buyer, seller: listing.seller, amount, total_cost, seller_received: seller_receives, saved_to_vault: save_amt });
        }

        fn cancel_listing(ref self: ContractState, listing_id: u64) {
            let listing = self.listings.read(listing_id);
            assert(listing.active && (get_caller_address() == listing.seller || get_caller_address() == self.owner.read()), 'Unauthorized');
            IERC20Dispatcher { contract_address: listing.content_token }.transfer(listing.seller, listing.amount);
            self.listings.write(listing_id, Listing { active: false, amount: 0, ..listing });
            self.emit(ListingCancelled { listing_id, seller: listing.seller });
        }

        fn update_price(ref self: ContractState, listing_id: u64, new_price: u256) {
            let listing = self.listings.read(listing_id);
            assert(listing.active && get_caller_address() == listing.seller, 'Unauthorized');
            self.listings.write(listing_id, Listing { price_per_token: new_price, ..listing });
            self.emit(PriceUpdated { listing_id, old_price: listing.price_per_token, new_price });
        }

        fn get_listing(self: @ContractState, listing_id: u64) -> Listing { self.listings.read(listing_id) }
        fn get_all_active_listings(self: @ContractState) -> Array<Listing> {
            let mut res = array![]; let len = self.all_listing_ids.len(); let mut i = 0;
            loop { if i >= len { break; } let id = self.all_listing_ids.at(i).read(); let l = self.listings.read(id); if l.active { res.append(l); } i += 1; }; res
        }
        fn get_listings_by_seller(self: @ContractState, seller: ContractAddress) -> Array<Listing> {
            let mut res = array![]; let ids_path = self.seller_listing_ids.entry(seller); let len = ids_path.len(); let mut i = 0;
            loop { if i >= len { break; } let id = ids_path.at(i).read(); let l = self.listings.read(id); if l.active { res.append(l); } i += 1; }; res
        }
        fn get_listings_by_token(self: @ContractState, token: ContractAddress) -> Array<Listing> {
            let mut res = array![]; let ids_path = self.token_listing_ids.entry(token); let len = ids_path.len(); let mut i = 0;
            loop { if i >= len { break; } let id = ids_path.at(i).read(); let l = self.listings.read(id); if l.active { res.append(l); } i += 1; }; res
        }
        fn get_listing_count(self: @ContractState) -> u64 { self.listing_count.read() }
        fn get_protocol_fee_bps(self: @ContractState) -> u256 { self.protocol_fee_bps.read() }
    }
}
