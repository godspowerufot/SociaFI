export const SOCIAL_POST_ABI = [
  {
    "type": "struct",
    "name": "core::byte_array::ByteArray",
    "members": [
      { "name": "data", "type": "core::array::Array::<core::felt252>" },
      { "name": "pending_word", "type": "core::felt252" },
      { "name": "pending_word_len", "type": "core::integer::u32" }
    ]
  },
  {
    "type": "struct",
    "name": "social_dapp::social_post::Post",
    "members": [
      { "name": "post_id", "type": "core::integer::u64" },
      { "name": "creator", "type": "core::starknet::contract_address::ContractAddress" },
      { "name": "title", "type": "core::byte_array::ByteArray" },
      { "name": "content_cid", "type": "core::byte_array::ByteArray" },
      { "name": "timestamp", "type": "core::integer::u64" },
      { "name": "token_address", "type": "core::starknet::contract_address::ContractAddress" },
      { "name": "tip_total", "type": "core::integer::u256" }
    ]
  },
  {
    "type": "function",
    "name": "create_post",
    "inputs": [
      { "name": "content_cid", "type": "core::byte_array::ByteArray" },
      { "name": "title", "type": "core::byte_array::ByteArray" }
    ],
    "outputs": [{ "type": "core::integer::u64" }],
    "state_mutability": "external"
  },
  {
    "type": "function",
    "name": "tip_creator",
    "inputs": [
      { "name": "post_id", "type": "core::integer::u64" },
      { "name": "amount", "type": "core::integer::u256" }
    ],
    "outputs": [],
    "state_mutability": "external"
  },
  {
    "type": "function",
    "name": "get_all_posts",
    "inputs": [],
    "outputs": [{ "type": "core::array::Array::<social_dapp::social_post::Post>" }],
    "state_mutability": "view"
  },
  {
    "type": "function",
    "name": "get_tips_received",
    "inputs": [{ "name": "post_id", "type": "core::integer::u64" }],
    "outputs": [{ "type": "core::integer::u256" }],
    "state_mutability": "view"
  }
];
