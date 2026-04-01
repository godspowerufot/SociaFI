use starknet::ContractAddress;

#[starknet::interface]
pub trait ISavingsVault<TContractState> {
    fn deposit(ref self: TContractState, token: ContractAddress, amount: u256);
    fn withdraw(ref self: TContractState, token: ContractAddress, amount: u256);
    fn deposit_earnings(ref self: TContractState, beneficiary: ContractAddress, token: ContractAddress, amount: u256);
    fn get_balance(self: @TContractState, user: ContractAddress, token: ContractAddress) -> u256;
    fn get_total_earned(self: @TContractState, user: ContractAddress, token: ContractAddress) -> u256;
    fn get_deposit_count(self: @TContractState, user: ContractAddress) -> u64;
    fn get_supported_tokens(self: @TContractState) -> Array<ContractAddress>;
    fn is_supported_token(self: @TContractState, token: ContractAddress) -> bool;
    fn add_supported_token(ref self: TContractState, token: ContractAddress);
    fn remove_supported_token(ref self: TContractState, token: ContractAddress);
}

#[starknet::contract]
pub mod SavingsVault {
    use super::ISavingsVault;
    use starknet::{get_caller_address, ContractAddress};
    use starknet::storage::{Map, Vec, VecTrait, MutableVecTrait, StoragePointerReadAccess, StoragePointerWriteAccess, StorageMapReadAccess, StorageMapWriteAccess};

    #[starknet::interface]
    trait IERC20<TContractState> {
        fn transfer(ref self: TContractState, recipient: ContractAddress, amount: u256) -> bool;
        fn transfer_from(ref self: TContractState, sender: ContractAddress, recipient: ContractAddress, amount: u256) -> bool;
    }

    #[storage]
    struct Storage {
        balances: Map<(ContractAddress, ContractAddress), u256>, total_earned: Map<(ContractAddress, ContractAddress), u256>,
        deposit_count: Map<ContractAddress, u64>, supported_tokens: Vec<ContractAddress>,
        supported_token_index: Map<ContractAddress, bool>, owner: ContractAddress, authorized_depositors: Map<ContractAddress, bool>,
    }

    #[event]
    #[derive(Drop, starknet::Event)]
    pub enum Event { Deposited: Deposited, Withdrawn: Withdrawn, EarningsDeposited: EarningsDeposited }
    #[derive(Drop, starknet::Event)]
    pub struct Deposited { #[key] pub user: ContractAddress, #[key] pub token: ContractAddress, pub amount: u256, pub new_balance: u256 }
    #[derive(Drop, starknet::Event)]
    pub struct Withdrawn { #[key] pub user: ContractAddress, #[key] pub token: ContractAddress, pub amount: u256, pub remaining_balance: u256 }
    #[derive(Drop, starknet::Event)]
    pub struct EarningsDeposited { #[key] pub beneficiary: ContractAddress, #[key] pub token: ContractAddress, pub amount: u256, pub deposited_by: ContractAddress }

    #[constructor]
    fn constructor(ref self: ContractState, owner: ContractAddress, strk_token: ContractAddress) {
        self.owner.write(owner);
        self.supported_tokens.push(strk_token);
        self.supported_token_index.write(strk_token, true);
        self.authorized_depositors.write(owner, true);
    }

    #[abi(embed_v0)]
    impl SavingsVaultImpl of ISavingsVault<ContractState> {
        fn deposit(ref self: ContractState, token: ContractAddress, amount: u256) {
            assert(self.supported_token_index.read(token), 'Token not supported');
            let caller = get_caller_address();
            assert(IERC20Dispatcher { contract_address: token }.transfer_from(caller, starknet::get_contract_address(), amount), 'Transf failed');
            let bal = self.balances.read((caller, token));
            self.balances.write((caller, token), bal + amount);
            self.total_earned.write((caller, token), self.total_earned.read((caller, token)) + amount);
            let cnt = self.deposit_count.read(caller);
            self.deposit_count.write(caller, cnt + 1);
            self.emit(Deposited { user: caller, token, amount, new_balance: bal + amount });
        }

        fn withdraw(ref self: ContractState, token: ContractAddress, amount: u256) {
            let caller = get_caller_address(); let bal = self.balances.read((caller, token));
            assert(bal >= amount, 'Insuf balance'); self.balances.write((caller, token), bal - amount);
            assert(IERC20Dispatcher { contract_address: token }.transfer(caller, amount), 'Transf failed');
            self.emit(Withdrawn { user: caller, token, amount, remaining_balance: bal - amount });
        }

        fn deposit_earnings(ref self: ContractState, beneficiary: ContractAddress, token: ContractAddress, amount: u256) {
            assert(self.authorized_depositors.read(get_caller_address()), 'Unauthorized');
            assert(IERC20Dispatcher { contract_address: token }.transfer_from(get_caller_address(), starknet::get_contract_address(), amount), 'Transf failed');
            let bal = self.balances.read((beneficiary, token));
            self.balances.write((beneficiary, token), bal + amount);
            self.total_earned.write((beneficiary, token), self.total_earned.read((beneficiary, token)) + amount);
            let cnt = self.deposit_count.read(beneficiary);
            self.deposit_count.write(beneficiary, cnt + 1);
            self.emit(EarningsDeposited { beneficiary, token, amount, deposited_by: get_caller_address() });
        }

        fn get_balance(self: @ContractState, user: ContractAddress, token: ContractAddress) -> u256 { self.balances.read((user, token)) }
        fn get_total_earned(self: @ContractState, user: ContractAddress, token: ContractAddress) -> u256 { self.total_earned.read((user, token)) }
        fn get_deposit_count(self: @ContractState, user: ContractAddress) -> u64 { self.deposit_count.read(user) }
        fn get_supported_tokens(self: @ContractState) -> Array<ContractAddress> {
            let mut res = array![]; let len = self.supported_tokens.len(); let mut i = 0;
            loop { if i >= len { break; } res.append(self.supported_tokens.at(i).read()); i += 1; }; res
        }
        fn is_supported_token(self: @ContractState, token: ContractAddress) -> bool { self.supported_token_index.read(token) }
        fn add_supported_token(ref self: ContractState, token: ContractAddress) {
            assert(get_caller_address() == self.owner.read(), 'Only owner');
            if !self.supported_token_index.read(token) { self.supported_tokens.push(token); self.supported_token_index.write(token, true); }
        }
        fn remove_supported_token(ref self: ContractState, token: ContractAddress) {
            assert(get_caller_address() == self.owner.read(), 'Only owner');
            self.supported_token_index.write(token, false);
        }
    }
}
