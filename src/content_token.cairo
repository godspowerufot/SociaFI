use starknet::ContractAddress;

#[starknet::interface]
pub trait IContentToken<TContractState> {
    fn name(self: @TContractState) -> ByteArray;
    fn symbol(self: @TContractState) -> ByteArray;
    fn decimals(self: @TContractState) -> u8;
    fn total_supply(self: @TContractState) -> u256;
    fn balance_of(self: @TContractState, account: ContractAddress) -> u256;
    fn allowance(self: @TContractState, owner: ContractAddress, spender: ContractAddress) -> u256;
    fn transfer(ref self: TContractState, recipient: ContractAddress, amount: u256) -> bool;
    fn transfer_from(ref self: TContractState, sender: ContractAddress, recipient: ContractAddress, amount: u256) -> bool;
    fn approve(ref self: TContractState, spender: ContractAddress, amount: u256) -> bool;
    fn post_id(self: @TContractState) -> u64;
    fn creator(self: @TContractState) -> ContractAddress;
    fn buy(ref self: TContractState, amount: u256);
    fn sell(ref self: TContractState, amount: u256);
    fn get_buy_price(self: @TContractState, amount: u256) -> u256;
    fn get_sell_price(self: @TContractState, amount: u256) -> u256;
}

#[starknet::contract]
pub mod ContentToken {
    use super::IContentToken;
    use starknet::{get_caller_address, ContractAddress};
    use starknet::storage::{Map, StoragePointerReadAccess, StoragePointerWriteAccess, StorageMapReadAccess, StorageMapWriteAccess};

    #[starknet::interface]
    trait IERC20<TContractState> {
        fn transfer(ref self: TContractState, recipient: ContractAddress, amount: u256) -> bool;
        fn transfer_from(ref self: TContractState, sender: ContractAddress, recipient: ContractAddress, amount: u256) -> bool;
    }

    #[storage]
    struct Storage {
        name: ByteArray, symbol: ByteArray, decimals: u8, total_supply: u256,
        balances: Map<ContractAddress, u256>, allowances: Map<(ContractAddress, ContractAddress), u256>,
        post_id: u64, creator: ContractAddress, base_price: u256, price_step: u256,
        circulating_sold: u256, strk_token: ContractAddress, treasury: u256,
        protocol_fee_bps: u256, protocol_fee_recipient: ContractAddress,
    }

    #[event]
    #[derive(Drop, starknet::Event)]
    pub enum Event { Transfer: Transfer, Approval: Approval, TokenBought: TokenBought, TokenSold: TokenSold }
    #[derive(Drop, starknet::Event)]
    pub struct Transfer { #[key] pub from: ContractAddress, #[key] pub to: ContractAddress, pub value: u256 }
    #[derive(Drop, starknet::Event)]
    pub struct Approval { #[key] pub owner: ContractAddress, #[key] pub spender: ContractAddress, pub value: u256 }
    #[derive(Drop, starknet::Event)]
    pub struct TokenBought { #[key] pub buyer: ContractAddress, pub amount: u256, pub price_paid: u256 }
    #[derive(Drop, starknet::Event)]
    pub struct TokenSold { #[key] pub seller: ContractAddress, pub amount: u256, pub strk_received: u256 }

    #[constructor]
    fn constructor(ref self: ContractState, name: ByteArray, symbol: ByteArray, post_id: u64, creator: ContractAddress, initial_supply: u256, base_price: u256, price_step: u256, strk_token: ContractAddress, protocol_fee_bps: u256, protocol_fee_recipient: ContractAddress) {
        self.name.write(name); self.symbol.write(symbol);
        self.decimals.write(18); self.post_id.write(post_id);
        self.creator.write(creator); self.base_price.write(base_price);
        self.price_step.write(price_step); self.strk_token.write(strk_token);
        self.protocol_fee_bps.write(protocol_fee_bps);
        self.protocol_fee_recipient.write(protocol_fee_recipient);
        if initial_supply > 0 {
            self.total_supply.write(initial_supply);
            self.balances.write(creator, initial_supply);
            self.emit(Transfer { from: 0.try_into().unwrap(), to: creator, value: initial_supply });
        }
    }

    #[abi(embed_v0)]
    impl ContentTokenImpl of IContentToken<ContractState> {
        fn name(self: @ContractState) -> ByteArray { self.name.read() }
        fn symbol(self: @ContractState) -> ByteArray { self.symbol.read() }
        fn decimals(self: @ContractState) -> u8 { self.decimals.read() }
        fn total_supply(self: @ContractState) -> u256 { self.total_supply.read() }
        fn post_id(self: @ContractState) -> u64 { self.post_id.read() }
        fn creator(self: @ContractState) -> ContractAddress { self.creator.read() }
        fn balance_of(self: @ContractState, account: ContractAddress) -> u256 { self.balances.read(account) }
        fn allowance(self: @ContractState, owner: ContractAddress, spender: ContractAddress) -> u256 { self.allowances.read((owner, spender)) }

        fn transfer(ref self: ContractState, recipient: ContractAddress, amount: u256) -> bool {
            let sender = get_caller_address();
            let bal = self.balances.read(sender); assert(bal >= amount, 'Insuf balance');
            self.balances.write(sender, bal - amount);
            self.balances.write(recipient, self.balances.read(recipient) + amount);
            self.emit(Transfer { from: sender, to: recipient, value: amount }); true
        }

        fn transfer_from(ref self: ContractState, sender: ContractAddress, recipient: ContractAddress, amount: u256) -> bool {
            let caller = get_caller_address();
            let allow = self.allowances.read((sender, caller)); assert(allow >= amount, 'Insuf allowance');
            self.allowances.write((sender, caller), allow - amount);
            let bal = self.balances.read(sender); assert(bal >= amount, 'Insuf balance');
            self.balances.write(sender, bal - amount);
            self.balances.write(recipient, self.balances.read(recipient) + amount);
            self.emit(Transfer { from: sender, to: recipient, value: amount }); true
        }

        fn approve(ref self: ContractState, spender: ContractAddress, amount: u256) -> bool {
            self.allowances.write((get_caller_address(), spender), amount);
            self.emit(Approval { owner: get_caller_address(), spender, value: amount }); true
        }

        fn buy(ref self: ContractState, amount: u256) {
            let cost = self.get_buy_price(amount);
            let fee = (cost * self.protocol_fee_bps.read()) / 10000_u256;
            let strk = IERC20Dispatcher { contract_address: self.strk_token.read() };
            strk.transfer_from(get_caller_address(), self.protocol_fee_recipient.read(), fee);
            strk.transfer_from(get_caller_address(), self.creator.read(), cost - fee);
            self.total_supply.write(self.total_supply.read() + amount);
            self.balances.write(get_caller_address(), self.balances.read(get_caller_address()) + amount);
            self.circulating_sold.write(self.circulating_sold.read() + amount);
            self.emit(Transfer { from: 0.try_into().unwrap(), to: get_caller_address(), value: amount });
            self.emit(TokenBought { buyer: get_caller_address(), amount, price_paid: cost });
        }

        fn sell(ref self: ContractState, amount: u256) {
            let caller = get_caller_address(); let bal = self.balances.read(caller); assert(bal >= amount, 'Insuf bal');
            let out = self.get_sell_price(amount);
            self.balances.write(caller, bal - amount);
            self.total_supply.write(self.total_supply.read() - amount);
            self.circulating_sold.write(self.circulating_sold.read() - amount);
            IERC20Dispatcher { contract_address: self.strk_token.read() }.transfer_from(self.creator.read(), caller, out);
            self.emit(Transfer { from: caller, to: 0.try_into().unwrap(), value: amount });
            self.emit(TokenSold { seller: caller, amount, strk_received: out });
        }

        fn get_buy_price(self: @ContractState, amount: u256) -> u256 {
            let base = self.base_price.read(); let step = self.price_step.read(); let sold = self.circulating_sold.read();
            amount * base + step * (sold * amount + (amount * (amount - 1)) / 2)
        }
        fn get_sell_price(self: @ContractState, amount: u256) -> u256 {
            let base = self.base_price.read(); let step = self.price_step.read(); let sold = self.circulating_sold.read();
            if sold < amount { return 0; }
            let s = amount * base + step * ((sold - amount) * amount + (amount * (amount - 1)) / 2); (s * 95) / 100
        }
    }
}
