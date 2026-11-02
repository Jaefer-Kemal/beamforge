-module(exception_classifier).
-export([
    check_payment/1,
    safe_check/1,
    trigger_class/2
]).

%% @doc Validates incoming payment tuples, raising error, throw, or exit
%% based on the domain rules specified in the lesson guide.
check_payment(_PaymentTuple) ->
    %% % TODO: Validate PaymentTuple against Amount type and value bounds,
    %% % supported currencies, and return {approved, Amount, Currency}.
    ok.

%% @doc Evaluates check_payment/1 inside a try...catch expression,
%% normalizing each distinct exception class (throw, error, exit).
safe_check(_PaymentTuple) ->
    %% % TODO: Execute check_payment/1 in a try...catch block, mapping
    %% % success and each exception class to its canonical tagged tuple.
    ok.

%% @doc Directly raises the requested exception class and reason.
trigger_class(_ClassAtom, _Reason) ->
    %% % TODO: Match on the class atom (throw, error, exit) and invoke
    %% % the corresponding BEAM exception primitive.
    ok.
