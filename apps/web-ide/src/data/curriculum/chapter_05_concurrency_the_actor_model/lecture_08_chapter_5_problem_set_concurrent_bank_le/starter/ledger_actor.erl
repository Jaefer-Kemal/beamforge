-module(ledger_actor).
-export([
    start/1,
    get_balance/2,
    process_transaction/2,
    process_batch/2,
    stop/1,
    loop/1
]).

%% Spawns the ledger actor initialized with InitialAccounts
start(InitialAccounts) ->
    %% Architectural Requirement: Spawn loop(InitialAccounts) and return PID
    ok.

%% Client API: queries account balance with 1000ms timeout
get_balance(Pid, AccountId) ->
    %% Architectural Requirement: make_ref(), send {get_balance, self(), Ref, AccountId}, receive reply
    ok.

%% Client API: processes single transaction: {deposit, Id, Amt} | {withdraw, Id, Amt} | {transfer, From, To, Amt}
process_transaction(Pid, TxTuple) ->
    %% Architectural Requirement: make_ref(), send {transaction, self(), Ref, TxTuple}, receive reply
    ok.

%% Client API: processes batch of transactions, returning {ok, AppliedCount, RejectedCount}
process_batch(Pid, TransactionsList) ->
    %% Architectural Requirement: make_ref(), send {process_batch, self(), Ref, TransactionsList}, receive reply
    ok.

%% Client API: stops actor cleanly
stop(Pid) ->
    %% Architectural Requirement: make_ref(), send {stop, self(), Ref}, receive reply
    ok.

%% ── Internal Actor Loop ──────────────────────────────────────────────────────
loop(Accounts) ->
    %% Architectural Requirement:
    %% Implement tail-recursive receive loop handling:
    %% 1. {get_balance, From, Ref, AccountId}
    %% 2. {transaction, From, Ref, Tx}
    %% 3. {process_batch, From, Ref, TxList}
    %% 4. {stop, From, Ref}
    ok.
