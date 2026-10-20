-module(bf_json).

-export([encode/1]).

-spec encode(term()) -> binary().
encode(Term) ->
    iolist_to_binary(encode_term(Term)).

encode_term(null) -> <<"null">>;
encode_term(undefined) -> <<"null">>;
encode_term(true) -> <<"true">>;
encode_term(false) -> <<"false">>;
encode_term(Atom) when is_atom(Atom) ->
    encode_string(atom_to_binary(Atom, utf8));
encode_term(Int) when is_integer(Int) ->
    integer_to_binary(Int);
encode_term(Float) when is_float(Float) ->
    float_to_binary(Float, [{decimals, 4}, compact]);
encode_term(Binary) when is_binary(Binary) ->
    encode_string(Binary);
encode_term(Pid) when is_pid(Pid) ->
    encode_string(list_to_binary(pid_to_list(Pid)));
encode_term(Ref) when is_reference(Ref) ->
    encode_string(list_to_binary(ref_to_list(Ref)));
encode_term(Map) when is_map(Map) ->
    Pairs = maps:to_list(Map),
    EncodedPairs = [
        [encode_key(K), <<": ">>, encode_term(V)]
     || {K, V} <- Pairs
    ],
    [<<"{">>, join_commas(EncodedPairs), <<"}">>];
encode_term(List) when is_list(List) ->
    case io_lib:printable_unicode_list(List) of
        true ->
            encode_string(unicode:characters_to_binary(List));
        false ->
            EncodedItems = [encode_term(I) || I <- List],
            [<<"[">>, join_commas(EncodedItems), <<"]">>]
    end;
encode_term(Tuple) when is_tuple(Tuple) ->
    encode_term(tuple_to_list(Tuple));
encode_term(Other) ->
    encode_string(list_to_binary(io_lib:format("~p", [Other]))).

encode_key(Key) when is_binary(Key) ->
    encode_string(Key);
encode_key(Key) when is_atom(Key) ->
    encode_string(atom_to_binary(Key, utf8));
encode_key(Key) when is_list(Key) ->
    encode_string(unicode:characters_to_binary(Key));
encode_key(Key) ->
    encode_string(list_to_binary(io_lib:format("~p", [Key]))).

encode_string(Binary) ->
    [<<"\"">>, escape_binary(Binary), <<"\"">>].

escape_binary(<<>>) -> <<>>;
escape_binary(<<$\", Rest/binary>>) ->
    [<<"\\\"">> | escape_binary(Rest)];
escape_binary(<<$\\, Rest/binary>>) ->
    [<<"\\\\">> | escape_binary(Rest)];
escape_binary(<<$\n, Rest/binary>>) ->
    [<<"\\n">> | escape_binary(Rest)];
escape_binary(<<$\r, Rest/binary>>) ->
    [<<"\\r">> | escape_binary(Rest)];
escape_binary(<<$\t, Rest/binary>>) ->
    [<<"\\t">> | escape_binary(Rest)];
escape_binary(<<C, Rest/binary>>) ->
    [<<C>> | escape_binary(Rest)].

join_commas([]) -> [];
join_commas([Single]) -> [Single];
join_commas([First | Rest]) ->
    [First, <<", ">> | join_commas(Rest)].
