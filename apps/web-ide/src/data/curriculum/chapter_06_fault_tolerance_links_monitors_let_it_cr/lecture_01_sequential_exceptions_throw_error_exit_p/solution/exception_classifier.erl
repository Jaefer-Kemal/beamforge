-module(exception_classifier).
-export([
    check_payment/1,
    safe_check/1,
    trigger_class/2
]).

check_payment({payment, Amount, Currency}) ->
    if
        not is_integer(Amount) ->
            erlang:error(bad_amount_type);
        Amount < 0 ->
            throw(negative_amount);
        Amount =:= 0 ->
            exit(zero_payment_abort);
        Currency =/= usd andalso Currency =/= eur andalso Currency =/= etb ->
            throw({unsupported_currency, Currency});
        true ->
            {approved, Amount, Currency}
    end;
check_payment(_InvalidTuple) ->
    erlang:error(invalid_payment_tuple).

safe_check(PaymentTuple) ->
    try check_payment(PaymentTuple) of
        {approved, Amount, Currency} ->
            {approved, Amount, Currency}
    catch
        throw:Reason ->
            {rejected, Reason};
        error:Reason ->
            {bug_detected, Reason};
        exit:Reason ->
            {process_aborted, Reason}
    end.

trigger_class(throw, Reason) ->
    throw(Reason);
trigger_class(error, Reason) ->
    erlang:error(Reason);
trigger_class(exit, Reason) ->
    exit(Reason).
