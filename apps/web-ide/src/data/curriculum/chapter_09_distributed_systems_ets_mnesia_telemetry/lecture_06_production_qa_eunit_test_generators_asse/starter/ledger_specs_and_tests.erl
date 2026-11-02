-module(ledger_specs_and_tests).
-include_lib("eunit/include/eunit.hrl").

-export([calculate_fee/2, validate_transfer_spec/3, run_unit_checks/0, run_unit_tests/0]).

-type currency() :: usd | eur | etb.

calculate_fee(Amount, Currency) ->
    0.

validate_transfer_spec(Balance, Amount, Currency) ->
    {error, not_implemented}.

run_unit_checks() ->
    ok.

run_unit_tests() ->
    ok.
