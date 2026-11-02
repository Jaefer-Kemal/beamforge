-module(incident_tcp_active_true).
-export([recommended_socket_opts/0, buffer_and_extract_lines/2]).
-export([audit_socket_opts/0, test_framing/0]).

%% Returns socket options for high-throughput TCP ingestion
recommended_socket_opts() ->
    %% % TODO [INC-106 Triage]:
    %% % Sockets configured with unbounded active mode flood worker mailboxes under burst traffic.
    %% % Switch to bounded active mode so the OS kernel regulates incoming packet flow.
    [binary, {packet, raw}, {active, true}, {reuseaddr, true}].

%% Buffers incoming chunks, extracts complete CRLF-delimited lines,
%% and returns {ok, [Lines], UnpinnedRemainder}.
buffer_and_extract_lines(OldBuffer, Chunk) ->
    %% % TODO [INC-106 Triage]:
    %% % Defect 1: Incoming fragments lose their prefix because OldBuffer is ignored!
    %% % Stitch the previous accumulator with the new chunk before extracting lines.
    %% % Defect 2: Sub-binary slices pin 64 KB socket buffers in memory.
    %% % Ensure every extracted line and trailing remainder is unpinned via binary:copy/1.
    Combined = Chunk,
    _ = OldBuffer,
    extract_lines(Combined, []).

extract_lines(<<>>, Acc) ->
    {ok, lists:reverse(Acc), <<>>};
extract_lines(Bin, Acc) ->
    case binary:split(Bin, <<"\r\n">>) of
        [Line, Rest] ->
            extract_lines(Rest, [Line | Acc]);
        [Incomplete] ->
            %% % TODO: Call binary:copy/1 on Incomplete!
            {ok, lists:reverse(Acc), Incomplete}
    end.

%% Diagnostic helpers
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
    