-module(domain_validator).
-export([
    safe_divide/2,
    check_amount/1,
    validate_email/1,
    process_checkout_input/3
]).

safe_divide(Num, Den) when is_number(Num), is_number(Den) ->
    if
        Den == 0 -> {error, division_by_zero};
        true     -> {ok, Num / Den}
    end;
safe_divide(_Num, _Den) ->
    {error, non_numeric}.

check_amount(Amount) when is_integer(Amount) ->
    if
        Amount > 0 -> {ok, Amount};
        true       -> {error, non_positive_amount}
    end;
check_amount(_Other) ->
    {error, invalid_type}.

validate_email(EmailBin) when is_binary(EmailBin) ->
    case binary:split(EmailBin, <<"@">>) of
        [User, Domain] when byte_size(User) > 0, byte_size(Domain) > 0 ->
            case binary:match(Domain, <<".">>) of
                nomatch -> {error, invalid_email};
                _       -> {ok, EmailBin}
            end;
        _ ->
            {error, invalid_email}
    end;
validate_email(_Other) ->
    {error, invalid_email}.

process_checkout_input(EmailBin, TotalAmount, SplitCount) ->
    case validate_email(EmailBin) of
        {ok, ValidEmail} ->
            case check_amount(TotalAmount) of
                {ok, ValidTotal} ->
                    case safe_divide(ValidTotal, SplitCount) of
                        {ok, Share} ->
                            {ok, #{email => ValidEmail, per_person => Share}};
                        {error, DivErr} ->
                            {error, DivErr}
                    end;
                {error, AmtErr} ->
                    {error, AmtErr}
            end;
        {error, EmailErr} ->
            {error, EmailErr}
    end.
