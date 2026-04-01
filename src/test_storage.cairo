#[starknet::contract]
mod TestStorage {
    use starknet::storage::{Map, Vec};

    #[storage]
    struct Storage {
        my_map: Map<u64, u64>,
        my_val: u64,
        my_vec: Vec<u64>,
    }

    #[external(v0)]
    fn test_access(ref self: ContractState) {
        self.my_val.write(100);
        let _ = self.my_val.read();
        
        self.my_map.write(1, 100);
        let _ = self.my_map.read(1);
        
        self.my_vec.push(100);
        let _ = self.my_vec.len();
        let _ = self.my_vec.at(0).read();
    }
}
