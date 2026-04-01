#[starknet::contract]
mod TestStorage2 {
    #[storage] struct Storage {}
    #[external(v0)]
    fn test_hash(ref self: ContractState, username: ByteArray) -> felt252 {
        let mut arr: Array<felt252> = array![];
        let len = username.len();
        let mut i: u32 = 0;
        loop {
            if i >= len { break; }
            let byte_val: u8 = username.at(i).unwrap();
            arr.append(byte_val.into());
            i += 1;
        };
        arr.append(len.into());
        core::poseidon::poseidon_hash_span(arr.span())
    }
}
