# 📜 Social DApp — Smart Contracts Documentation

A **"Content as a Coin"** social platform on Starknet. Users create posts, tokenize content, trade tokens on a P2P marketplace, and auto-save earnings into savings vaults.

---

## Project Structure

```
src/
├── lib.cairo              # Module declarations (entry point)
├── social_post.cairo      # Content creation & tipping
├── content_token.cairo    # ERC-20 token per post (bonding curve)
├── profile.cairo          # User profiles & social graph
├── marketplace.cairo      # P2P token trading with auto-save
├── savings_vault.cairo    # Multi-token savings vault
└── tests.cairo            # Full test suite (20 tests)
```

---

## 1. `social_post.cairo` — SocialPost Contract

Handles content creation, retrieval, and creator tipping via STRK token transfers.

### Storage

| Field | Type | Description |
|-------|------|-------------|
| `posts` | `Map<u64, Post>` | Post ID → Post data |
| `post_count` | `u64` | Total number of posts created |
| `tips_received` | `Map<u64, u256>` | Post ID → total tips received |
| `creator_post_ids` | `Map<ContractAddress, Vec<u64>>` | Creator → list of their post IDs |
| `all_post_ids` | `Vec<u64>` | All post IDs in creation order |
| `strk_token` | `ContractAddress` | STRK token contract address |
| `owner` | `ContractAddress` | Contract owner |

### Functions

| Function | Mutability | Description |
|----------|-----------|-------------|
| `create_post(content_cid, title) → u64` | Write | Creates a new post with IPFS CID and title. Returns the new post ID. Increments `post_count` and tracks the post under the caller's creator list. |
| `tip_creator(post_id, amount)` | Write | Transfers `amount` of STRK from the caller to the post's creator via `transfer_from`. Updates the post's `tip_total` and `tips_received` map. |
| `set_token_address(post_id, token_address)` | Write | Lets the post creator link a ContentToken to their post. Only the original creator can call this. |
| `get_post(post_id) → Post` | Read | Returns the full `Post` struct for a given ID. |
| `get_all_posts() → Array<Post>` | Read | Returns all posts in **newest-first** order. |
| `get_posts_by_creator(creator) → Array<Post>` | Read | Returns all posts by a specific creator, newest first. |
| `get_post_count() → u64` | Read | Returns the total number of posts. |
| `get_tips_received(post_id) → u256` | Read | Returns total tips accumulated for a post. |

### Events

- **`PostCreated`** — Emitted when a new post is created (post_id, creator, title, content_cid, timestamp).
- **`CreatorTipped`** — Emitted when a creator receives a tip (post_id, tipper, recipient, amount).
- **`TokenAddressSet`** — Emitted when a token is linked to a post (post_id, token_address).

---

## 2. `content_token.cairo` — ContentToken Contract

A full **ERC-20 token** tied to a specific post, with a **bonding curve** for buy/sell pricing. Each post can have its own token that appreciates in value as more are bought.

### Storage

| Field | Type | Description |
|-------|------|-------------|
| `name` / `symbol` / `decimals` | `ByteArray` / `ByteArray` / `u8` | Standard ERC-20 metadata |
| `total_supply` | `u256` | Current total token supply |
| `balances` | `Map<ContractAddress, u256>` | User balances |
| `allowances` | `Map<(ContractAddress, ContractAddress), u256>` | Spender allowances |
| `post_id` | `u64` | The post this token represents |
| `creator` | `ContractAddress` | Original content creator |
| `base_price` / `price_step` | `u256` | Bonding curve parameters |
| `circulating_sold` | `u256` | Tokens sold via the bonding curve |
| `strk_token` | `ContractAddress` | STRK token for payments |
| `protocol_fee_bps` / `protocol_fee_recipient` | `u256` / `ContractAddress` | Protocol fee config (basis points) |

### Functions

| Function | Mutability | Description |
|----------|-----------|-------------|
| `name() → ByteArray` | Read | Returns the token name. |
| `symbol() → ByteArray` | Read | Returns the token symbol. |
| `decimals() → u8` | Read | Returns 18 (standard decimals). |
| `total_supply() → u256` | Read | Returns current total supply. |
| `balance_of(account) → u256` | Read | Returns balance of an account. |
| `allowance(owner, spender) → u256` | Read | Returns the spending allowance. |
| `post_id() → u64` | Read | Returns the linked post ID. |
| `creator() → ContractAddress` | Read | Returns the content creator address. |
| `transfer(recipient, amount) → bool` | Write | Standard ERC-20 transfer. |
| `transfer_from(sender, recipient, amount) → bool` | Write | Standard ERC-20 delegated transfer. |
| `approve(spender, amount) → bool` | Write | Approves a spender for a given amount. |
| `buy(amount)` | Write | Buys tokens via the bonding curve. Calculates cost, deducts protocol fee, sends remainder to creator, and mints tokens to the buyer. |
| `sell(amount)` | Write | Sells tokens back. Burns tokens, calculates payout (with 5% spread), and transfers STRK to the seller. |
| `get_buy_price(amount) → u256` | Read | Returns STRK cost to buy `amount` tokens at current supply. Formula: `amount * base + step * (sold * amount + amount*(amount-1)/2)`. |
| `get_sell_price(amount) → u256` | Read | Returns STRK received for selling `amount` tokens. Applies a 5% spread (95% of buy-side value). |

### Events

- **`Transfer`** — Standard ERC-20 transfer event.
- **`Approval`** — Standard ERC-20 approval event.
- **`TokenBought`** — Emitted on bonding curve purchase (buyer, amount, price_paid).
- **`TokenSold`** — Emitted on bonding curve sale (seller, amount, strk_received).

---

## 3. `profile.cairo` — Profile Contract

Manages user registration, profile data, and the **social graph** (follow/unfollow with follower/following lists).

### Storage

| Field | Type | Description |
|-------|------|-------------|
| `profiles` | `Map<ContractAddress, UserProfile>` | User → profile data |
| `follows` | `Map<(ContractAddress, ContractAddress), bool>` | (follower, target) → follow status |
| `follower_list` | `Map<ContractAddress, Vec<ContractAddress>>` | User → list of followers |
| `following_list` | `Map<ContractAddress, Vec<ContractAddress>>` | User → list of accounts they follow |
| `username_to_address` | `Map<felt252, ContractAddress>` | Username hash → owner address |
| `user_count` | `u64` | Total registered users |

### UserProfile Struct

```
owner, username, bio, avatar_cid, created_at, follower_count, following_count, registered
```

### Functions

| Function | Mutability | Description |
|----------|-----------|-------------|
| `register(username, bio, avatar_cid)` | Write | Registers a new profile. Asserts the caller hasn't registered before and the username is unique (via Poseidon hash). |
| `update_profile(bio, avatar_cid)` | Write | Updates bio and avatar for the caller. Must be registered. |
| `follow(target)` | Write | Follows another user. Both must be registered, can't self-follow, can't double-follow. Updates follower/following counts and lists. |
| `unfollow(target)` | Write | Unfollows a user. Decrements counts. |
| `get_profile(user) → UserProfile` | Read | Returns the full profile struct. |
| `is_registered(user) → bool` | Read | Checks if a user is registered. |
| `is_following(follower, target) → bool` | Read | Checks if `follower` follows `target`. |
| `get_follower_count(user) → u64` | Read | Returns follower count. |
| `get_following_count(user) → u64` | Read | Returns following count. |
| `get_followers(user) → Array<ContractAddress>` | Read | Returns active followers (filters out unfollowed). |
| `get_following(user) → Array<ContractAddress>` | Read | Returns accounts the user actively follows. |
| `username_taken(username) → bool` | Read | Checks if a username is already claimed. |
| `get_address_by_username(username) → ContractAddress` | Read | Resolves a username to its owner address. |

### Events

- **`ProfileRegistered`** — New user registered (user, username, timestamp).
- **`ProfileUpdated`** — Profile bio/avatar updated (user, bio).
- **`Followed`** — User followed another (follower, target).
- **`Unfollowed`** — User unfollowed another (follower, target).

---

## 4. `marketplace.cairo` — Marketplace Contract

A **P2P token marketplace** with escrow, protocol fees, and **auto-save to vault** — sellers can automatically route a percentage of their earnings into the SavingsVault.

### Storage

| Field | Type | Description |
|-------|------|-------------|
| `listings` | `Map<u64, Listing>` | Listing ID → listing data |
| `listing_count` | `u64` | Total listings created |
| `all_listing_ids` | `Vec<u64>` | All listing IDs |
| `seller_listing_ids` | `Map<ContractAddress, Vec<u64>>` | Seller → their listing IDs |
| `token_listing_ids` | `Map<ContractAddress, Vec<u64>>` | Token → listing IDs for that token |
| `strk_token` | `ContractAddress` | STRK payment token |
| `protocol_fee_bps` / `protocol_fee_recipient` | `u256` / `ContractAddress` | Fee config |
| `savings_vault` | `ContractAddress` | Vault for auto-saving |
| `owner` | `ContractAddress` | Contract owner |

### Listing Struct

```
listing_id, seller, content_token, amount, price_per_token, auto_save_pct, active, created_at
```

### Functions

| Function | Mutability | Description |
|----------|-----------|-------------|
| `list_token(content_token, amount, price_per_token, auto_save_pct) → u64` | Write | Lists tokens for sale. Escrows the tokens into the contract. `auto_save_pct` (0–100) sets the % of earnings auto-saved to vault. Returns listing ID. |
| `buy(listing_id, amount)` | Write | Buys tokens from a listing. Splits payment: protocol fee → fee recipient, auto-save portion → SavingsVault (via `deposit_earnings`), remainder → seller. Transfers tokens to buyer. Deactivates listing if fully sold. |
| `cancel_listing(listing_id)` | Write | Cancels a listing. Returns escrowed tokens to seller. Only seller or contract owner can cancel. |
| `update_price(listing_id, new_price)` | Write | Updates the price per token on an active listing. Only the seller can do this. |
| `get_listing(listing_id) → Listing` | Read | Returns listing data. |
| `get_all_active_listings() → Array<Listing>` | Read | Returns all currently active listings. |
| `get_listings_by_seller(seller) → Array<Listing>` | Read | Returns active listings for a seller. |
| `get_listings_by_token(token) → Array<Listing>` | Read | Returns active listings for a specific token. |
| `get_listing_count() → u64` | Read | Returns total listing count. |
| `get_protocol_fee_bps() → u256` | Read | Returns the protocol fee in basis points. |

### Events

- **`Listed`** — New listing created (listing_id, seller, content_token, amount, price_per_token).
- **`Bought`** — Purchase made (listing_id, buyer, seller, amount, total_cost, seller_received, saved_to_vault).
- **`ListingCancelled`** — Listing cancelled (listing_id, seller).
- **`PriceUpdated`** — Price changed (listing_id, old_price, new_price).

---

## 5. `savings_vault.cairo` — SavingsVault Contract

A **multi-token savings vault** where users can deposit/withdraw tokens. Also allows authorized contracts (like the Marketplace) to deposit earnings on behalf of users.

### Storage

| Field | Type | Description |
|-------|------|-------------|
| `balances` | `Map<(ContractAddress, ContractAddress), u256>` | (user, token) → balance |
| `total_earned` | `Map<(ContractAddress, ContractAddress), u256>` | (user, token) → lifetime earnings |
| `deposit_count` | `Map<ContractAddress, u64>` | User → number of deposits made |
| `supported_tokens` | `Vec<ContractAddress>` | List of supported tokens |
| `supported_token_index` | `Map<ContractAddress, bool>` | Token → is supported |
| `owner` | `ContractAddress` | Contract owner |
| `authorized_depositors` | `Map<ContractAddress, bool>` | Authorized contracts for `deposit_earnings` |

### Functions

| Function | Mutability | Description |
|----------|-----------|-------------|
| `deposit(token, amount)` | Write | Deposits tokens into the vault. Token must be supported. Transfers from caller via `transfer_from`. |
| `withdraw(token, amount)` | Write | Withdraws tokens from the vault. Checks sufficient balance. |
| `deposit_earnings(beneficiary, token, amount)` | Write | Deposits on behalf of another user (e.g., auto-save from marketplace sales). Only authorized depositors can call this. |
| `get_balance(user, token) → u256` | Read | Returns a user's vault balance for a specific token. |
| `get_total_earned(user, token) → u256` | Read | Returns lifetime earnings deposited for a user. |
| `get_deposit_count(user) → u64` | Read | Returns how many deposits a user has made. |
| `get_supported_tokens() → Array<ContractAddress>` | Read | Returns all supported token addresses. |
| `is_supported_token(token) → bool` | Read | Checks if a token is supported. |
| `add_supported_token(token)` | Write | Adds a new supported token. Owner only. |
| `remove_supported_token(token)` | Write | Removes a supported token. Owner only. |

### Events

- **`Deposited`** — User deposited tokens (user, token, amount, new_balance).
- **`Withdrawn`** — User withdrew tokens (user, token, amount, remaining_balance).
- **`EarningsDeposited`** — Earnings deposited on behalf of user (beneficiary, token, amount, deposited_by).

---

## 6. `tests.cairo` — Test Suite

**20 tests** covering all contracts:

| Module | Tests | What's Covered |
|--------|-------|----------------|
| `test_social_post` (6) | Post creation, count, data retrieval, newest-first ordering, per-creator filtering, token address setting (success + unauthorized rejection) |
| `test_profile` (6) | Registration, duplicate prevention, username uniqueness, follow/unfollow with counts, self-follow rejection, profile updates |
| `test_savings_vault` (4) | Initial zero balance, default STRK support, adding tokens, rejecting unsupported token deposits |
| `test_marketplace` (3) | Zero initial listing count, protocol fee verification, empty active listings |

---

## How It All Connects

```
┌──────────┐    creates post     ┌─────────────┐   tokenize    ┌──────────────┐
│  User    │ ──────────────────► │ SocialPost  │ ◄───────────► │ ContentToken │
└──────────┘                     └─────────────┘               └──────┬───────┘
     │                                                                │
     │  register / follow                                   list token│
     ▼                                                                ▼
┌──────────┐                     ┌─────────────┐   auto-save   ┌─────────────┐
│ Profile  │                     │ Marketplace │ ─────────────► │SavingsVault │
└──────────┘                     └─────────────┘               └─────────────┘
```

1. Users **register** via `Profile` and build a social graph.
2. Users **create posts** via `SocialPost` with IPFS content.
3. Posts can be **tokenized** by deploying a `ContentToken` with a bonding curve.
4. Tokens are **traded** on the `Marketplace` with escrow and protocol fees.
5. Sellers can **auto-save** a percentage of sales proceeds into the `SavingsVault`.
