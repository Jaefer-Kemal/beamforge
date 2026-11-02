-module(incident_tcp_active_true).
-export([recommended_socket_opts/0, buffer_and_extract_lines/2]).
-export([audit_socket_opts/0, test_framing/0]).

recommended_socket_opts() ->
    [binary, {packet, raw}, {active, once}, {reuseaddr, true}].

buffer_and_extract_lines(OldBuffer, Chunk) ->
    Combined = <<OldBuffer/binary, Chunk/binary>>,
    extract_lines(Combined, []).

extract_lines(<<>>, Acc) ->
    {ok, lists:reverse(Acc), <<>>};
extract_lines(Bin, Acc) ->
    case binary:split(Bin, <<"\r\n">>) of
        [Line, Rest] ->
            extract_lines(Rest, [binary:copy(Line) | Acc]);
        [Incomplete] ->
            {ok, lists:reverse(Acc), binary:copy(Incomplete)}
    end.

audit_socket_opts() ->
    Opts = recommended_socket_opts(),
    case lists:member({active, once}, Opts) andalso not lists:member({active, true}, Opts) of
        true -> {ok, active_once_enforced};
        false -> {error, {bad_options, Opts}}
    end.

test_framing() ->
    Chunk1 = <<"PIN">>,
    {ok, Lines1, Rem1} = buffer_and_extract_lines(<<>>, Chunk1),
    Chunk2 = <<"G\r\nPONG\r\nPAR">>,
    {ok, Lines2, Rem2} = buffer_and_extract_lines(Rem1, Chunk2),
    Chunk3 = <<"TIAL">>,
    {ok, Lines3, Rem3} = buffer_and_extract_lines(Rem2, Chunk3),
    AllLines = Lines1 ++ Lines2 ++ Lines3,
    {ok, AllLines, Rem3}.
    