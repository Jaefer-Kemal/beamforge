-module(mnesia_ledger).
-export([setup_mnesia_table/0, upsert_wallet/2, atomic_transfer/3, get_wallet_balance/1]).

-record(wallet, {owner, balance}).

setup_mnesia_table() ->
    ok.

upsert_wallet(Owner, Balance) ->
    ok.

atomic_transfer(FromOwner, ToOwner, Amount) when Amount > 0 ->
    {error, not_implemented}.

get_wallet_balance(Owner) ->
    {error, not_found}.
