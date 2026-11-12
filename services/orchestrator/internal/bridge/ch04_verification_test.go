package bridge_test

import (
	"context"
	"fmt"
	"testing"
	"time"
)

func TestChapter4Verification(t *testing.T) {
	runner, poolMgr := setupTestRunner(t)

	mapRegistrySolution := `-module(map_registry).
-export([create_session/2, update_presence/3, is_admin_session/1]).

%% @doc Construct a new session map initialized for UserId and Role with offline presence and zero logins.
create_session(UserId, Role) ->
    #{
        user_id => UserId,
        role => Role,
        presence => offline,
        login_count => 0
    }.

%% @doc Update Session presence and increment login count when user identity matches ExpectedUserId, otherwise returning a session mismatch error tuple.
update_presence(#{user_id := ExpectedUserId, login_count := Count} = Session, ExpectedUserId, NewPresence) ->
    Session#{
        presence := NewPresence,
        login_count := Count + 1
    };
update_presence(_Session, _ExpectedUserId, _NewPresence) ->
    {error, session_mismatch}.

%% @doc Return true when Session is a map representing an active online administrator, and false for any other map or non-map input.
is_admin_session(#{role := admin, presence := online}) ->
    true;
is_admin_session(_) ->
    false.
`

	mapStdlibSolution := `-module(map_stdlib).
-export([safe_get_load/2, increment_tag_counts/2, merge_configs/2, sum_map_values/1]).

%% @doc Return the integer load recorded for NodeAtom in NodeMetricsMap, or zero when NodeAtom is absent.
safe_get_load(NodeMetricsMap, NodeAtom) ->
    maps:get(NodeAtom, NodeMetricsMap, 0).

%% @doc Fold across TagList and update InitialCountsMap so existing tags increment by one and unseen tags initialize to one.
increment_tag_counts(TagList, InitialCountsMap) ->
    lists:foldl(fun(Tag, AccMap) ->
        maps:update_with(Tag, fun(Count) -> Count + 1 end, 1, AccMap)
    end, InitialCountsMap, TagList).

%% @doc Merge UserCfgMap overrides over DefaultCfgMap and remove secret_key and debug_token entries from the resulting map.
merge_configs(DefaultCfgMap, UserCfgMap) ->
    Merged = maps:merge(DefaultCfgMap, UserCfgMap),
    maps:without([secret_key, debug_token], Merged).

%% @doc Sum all numeric values stored in NumericMap using direct map folding without intermediate list allocation, returning zero for an empty map.
sum_map_values(NumericMap) ->
    maps:fold(fun(_Key, Val, Acc) ->
        Acc + Val
    end, 0, NumericMap).
`

	recordFramesSolution := `-module(record_frames).
-export([new_frame/3, advance_seq/1, frame_seq_index/0, find_frame_by_seq/2]).

-record(frame, {
    seq = 0 :: non_neg_integer(),
    type = data :: atom(),
    payload :: term()
}).

%% @doc Construct and return a frame record populated with Seq, Type, and Payload.
new_frame(Seq, Type, Payload) ->
    #frame{seq = Seq, type = Type, payload = Payload}.

%% @doc Return a copy of Frame with its sequence number incremented by one while keeping type and payload unchanged.
advance_seq(#frame{seq = S} = Frame) ->
    Frame#frame{seq = S + 1}.

%% @doc Return the compile-time 1-based tuple position index of the seq field inside the frame record.
frame_seq_index() ->
    #frame.seq.

%% @doc Search FrameList for the first frame matching TargetSeq by sequence field index, returning an ok pair if found or not_found otherwise.
find_frame_by_seq(FrameList, TargetSeq) ->
    case lists:keyfind(TargetSeq, #frame.seq, FrameList) of
        #frame{} = Frame ->
            {ok, Frame};
        false ->
            not_found
    end.
`

	iolistBuilderSolution := `-module(iolist_builder).
-export([string_vs_binary_bytes/1, build_http_response_iolist/2, flatten_iolist/1]).

%% @doc Convert CharList into a binary and return a size comparison tuple recording linked-list heap bytes, binary byte size, and the binary itself.
string_vs_binary_bytes(CharList) ->
    Bin = list_to_binary(CharList),
    {size_comparison, length(CharList) * 16, byte_size(Bin), Bin}.

%% @doc Build and return an unflattened HTTP response IOList embedding StatusCodeInt, computed content length, and BodyBin without copying the payload.
build_http_response_iolist(StatusCodeInt, BodyBin) ->
    LenBin = integer_to_binary(byte_size(BodyBin)),
    CodeBin = integer_to_binary(StatusCodeInt),
    [
        <<"HTTP/1.1 ">>, CodeBin, <<" OK\r\nContent-Length: ">>,
        LenBin, <<"\r\n\r\n">>, BodyBin
    ].

%% @doc Measure total byte length across IoList without extra copying during sizing, flatten it into one contiguous binary, and return the size-and-binary pair.
flatten_iolist(IoList) ->
    {iolist_size(IoList), iolist_to_binary(IoList)}.
`

	bitPackerSolution := `-module(bit_packer).
-export([pack_header/3, unpack_header/1, encode_utf8_tagged/1]).

%% @doc Pack caller-supplied 4-bit Version, 4-bit Flags, and 16-bit big-endian Length into a compact 3-byte binary header.
pack_header(Version, Flags, Length) ->
    <<Version:4, Flags:4, Length:16/big-unsigned-integer>>.

%% @doc Decode a 3-byte big-endian header and remaining payload binary from Binary, or return an insufficient-bytes error tuple when shorter than 3 bytes.
unpack_header(<<Version:4, Flags:4, Length:16/big-unsigned-integer, Payload/binary>>) ->
    {ok, Version, Flags, Length, Payload};
unpack_header(_) ->
    {error, insufficient_bytes}.

%% @doc Reject non-binary inputs via guard validation and return TextBinary prefixed with a 1-byte version tag of value 1 and a 16-bit big-endian byte length.
encode_utf8_tagged(TextBinary) when is_binary(TextBinary) ->
    Len = byte_size(TextBinary),
    <<16#01:8, Len:16/big-unsigned-integer, TextBinary/binary>>.
`

	binaryScannerSolution := `-module(binary_scanner).
-export([split_key_value/1, extract_lines/1, xor_mask_payload/2]).

%% @doc Split HeaderBin on the first colon-space separator and return an ok tuple holding key and value binaries, or a malformed-header error tuple when the separator is missing.
split_key_value(HeaderBin) ->
    case binary:split(HeaderBin, <<": ">>) of
        [Key, Value] ->
            {ok, Key, Value};
        _ ->
            {error, malformed_header}
    end.

%% @doc Split MultiLineBin on every CRLF sequence while discarding empty tokens and return the list of non-empty line binaries.
extract_lines(MultiLineBin) ->
    binary:split(MultiLineBin, <<"\r\n">>, [global, trim_all]).

%% @doc Transform each 8-bit byte of PayloadBin via bitwise XOR against caller-supplied MaskByte using a binary comprehension and return the masked binary.
xor_mask_payload(PayloadBin, MaskByte) ->
    << <<(B bxor MaskByte):8>> || <<B:8>> <= PayloadBin >>.
`

	binaryUnpinnerSolution := `-module(binary_unpinner).
-export([extract_token_safe/1, slice_packet_safe/2, inspect_refc_ratio/1]).

%% @doc Extract the first 16 bytes of LargePacket into an independent binary detached from any backing buffer, returning an ok pair or an insufficient-data error tuple when shorter than 16 bytes.
extract_token_safe(<<Token:16/binary, _Rest/binary>>) ->
    {ok, binary:copy(Token)};
extract_token_safe(_) ->
    {error, insufficient_data}.

%% @doc Guarded to verify Packet is a binary containing at least non-negative Length bytes, returning a detached standalone copy of the leading Length bytes.
slice_packet_safe(Packet, Length) when is_binary(Packet), is_integer(Length), Length >= 0, byte_size(Packet) >= Length ->
    <<Slice:Length/binary, _Rest/binary>> = Packet,
    binary:copy(Slice).

%% @doc Return a two-element tuple pairing the logical byte length of Bin with the byte capacity of its backing allocation.
inspect_refc_ratio(Bin) ->
    {byte_size(Bin), binary:referenced_byte_size(Bin)}.
`

	tests := []struct {
		exerciseID   string
		visibleCount int
		files        map[string]string
	}{
		{
			exerciseID:   "ch04-l01",
			visibleCount: 4,
			files:        map[string]string{"src/map_registry.erl": mapRegistrySolution},
		},
		{
			exerciseID:   "ch04-l02",
			visibleCount: 4,
			files:        map[string]string{"src/map_stdlib.erl": mapStdlibSolution},
		},
		{
			exerciseID:   "ch04-l03",
			visibleCount: 4,
			files:        map[string]string{"src/record_frames.erl": recordFramesSolution},
		},
		{
			exerciseID:   "ch04-l04",
			visibleCount: 3,
			files:        map[string]string{"src/iolist_builder.erl": iolistBuilderSolution},
		},
		{
			exerciseID:   "ch04-l05",
			visibleCount: 4,
			files:        map[string]string{"src/bit_packer.erl": bitPackerSolution},
		},
		{
			exerciseID:   "ch04-l06",
			visibleCount: 4,
			files:        map[string]string{"src/binary_scanner.erl": binaryScannerSolution},
		},
		{
			exerciseID:   "ch04-l07",
			visibleCount: 4,
			files:        map[string]string{"src/binary_unpinner.erl": binaryUnpinnerSolution},
		},
	}

	for _, tc := range tests {
		tc := tc
		t.Run(tc.exerciseID, func(t *testing.T) {
			sessionID := fmt.Sprintf("test-%s", tc.exerciseID)
			session, err := poolMgr.ClaimSession(sessionID)
			if err != nil {
				t.Fatalf("Failed to claim session: %v", err)
			}
			defer poolMgr.ReleaseSession(sessionID)

			ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
			defer cancel()

			report, err := runner.RunVerification(ctx, session, tc.exerciseID, tc.files)
			if err != nil {
				t.Fatalf("RunVerification failed with error: %v", err)
			}

			if report.Verdict != "PASSED" {
				t.Errorf("[%s] Expected verdict PASSED, got %s", tc.exerciseID, report.Verdict)
				for _, st := range report.Stages {
					t.Logf("  Stage %-32s status=%s details=%s", st.ID, st.Status, st.Details)
				}
			} else {
				t.Logf("[%s] VERIFIED 100%% PASSED (score=%d, %d stages)", tc.exerciseID, report.Score, len(report.Stages))
				for _, st := range report.Stages {
					t.Logf("  + Stage %s: %s", st.ID, st.Status)
				}
			}

			runRes, err := runner.RunCode(ctx, session, tc.exerciseID, tc.files, nil)
			if err != nil {
				t.Fatalf("RunCode failed with error: %v", err)
			}
			if !runRes.CompileOk || len(runRes.VisibleTests) != tc.visibleCount {
				t.Fatalf("[%s] Expected CompileOk=true and %d visible test results, got CompileOk=%v count=%d", tc.exerciseID, tc.visibleCount, runRes.CompileOk, len(runRes.VisibleTests))
			}
			for _, vt := range runRes.VisibleTests {
				if !vt.Passed {
					t.Errorf("[%s] Visible test failed: %s -> expected %s, got %s", tc.exerciseID, vt.CallStr, vt.Expected, vt.Actual)
				}
			}
		})
	}

	t.Run("ch04-l01 rejects maps:get/maps:put bypass missing exact := matching via AST audit", func(t *testing.T) {
		sessionID := "test-ch04-l01-neg-ast"
		session, err := poolMgr.ClaimSession(sessionID)
		if err != nil {
			t.Fatalf("Failed to claim session: %v", err)
		}
		defer poolMgr.ReleaseSession(sessionID)

		ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
		defer cancel()

		mapsApiBypass := map[string]string{
			"src/map_registry.erl": `-module(map_registry).
-export([create_session/2, update_presence/3, is_admin_session/1]).

create_session(UserId, Role) ->
    maps:from_list([{user_id, UserId}, {role, Role}, {presence, offline}, {login_count, 0}]).

update_presence(Session, ExpectedUserId, NewPresence) when is_map(Session) ->
    case maps:find(user_id, Session) of
        {ok, ExpectedUserId} ->
            Cnt = maps:get(login_count, Session, 0),
            maps:put(login_count, Cnt + 1, maps:put(presence, NewPresence, Session));
        _ ->
            {error, session_mismatch}
    end;
update_presence(_, _, _) ->
    {error, session_mismatch}.

is_admin_session(Session) when is_map(Session) ->
    maps:get(role, Session, undefined) =:= admin andalso maps:get(presence, Session, undefined) =:= online;
is_admin_session(_) ->
    false.
`,
		}
		report, err := runner.RunVerification(ctx, session, "ch04-l01", mapsApiBypass)
		if err != nil {
			t.Fatalf("RunVerification failed unexpectedly: %v", err)
		}
		if report.Verdict == "PASSED" {
			t.Fatalf("Expected FAILED verdict when := exact matching/updating is bypassed with maps module calls, got PASSED")
		}
		astFailed := false
		for _, st := range report.Stages {
			if st.ID == "ast_map_registry_audit" && st.Status == "failed" {
				astFailed = true
			}
		}
		if !astFailed {
			t.Errorf("Expected ast_map_registry_audit stage to fail when map_exact_match (:=) is bypassed, stages=%+v", report.Stages)
		}
	})

	t.Run("ch04-l01 rejects stale login_count and crashing non-map is_admin_session", func(t *testing.T) {
		sessionID := "test-ch04-l01-neg-edge"
		session, err := poolMgr.ClaimSession(sessionID)
		if err != nil {
			t.Fatalf("Failed to claim session: %v", err)
		}
		defer poolMgr.ReleaseSession(sessionID)

		ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
		defer cancel()

		buggy := map[string]string{
			"src/map_registry.erl": `-module(map_registry).
-export([create_session/2, update_presence/3, is_admin_session/1]).

create_session(UserId, Role) ->
    #{user_id => UserId, role => Role, presence => offline, login_count => 0}.

%% Bug: hardcodes login_count := 1 instead of incrementing Count + 1.
update_presence(#{user_id := ExpectedUserId} = Session, ExpectedUserId, NewPresence) ->
    Session#{presence := NewPresence, login_count := 1};
update_presence(_, _, _) ->
    {error, session_mismatch}.

%% Bug: matches role without presence, returns true on offline admin.
is_admin_session(#{role := admin}) ->
    true;
is_admin_session(_) ->
    false.
`,
		}
		report, err := runner.RunVerification(ctx, session, "ch04-l01", buggy)
		if err != nil {
			t.Fatalf("RunVerification failed unexpectedly: %v", err)
		}
		if report.Verdict == "PASSED" {
			t.Fatalf("Expected FAILED verdict for hardcoded login_count and offline-admin bug, got PASSED")
		}
		funcFailed := false
		for _, st := range report.Stages {
			if st.ID == "maps_operations" && st.Status == "failed" {
				funcFailed = true
			}
		}
		if !funcFailed {
			t.Errorf("Expected maps_operations stage to fail for hardcoded login_count and role-only check, stages=%+v", report.Stages)
		}
	})

	t.Run("ch04-l02 rejects maps:to_list/1 bypass and missing required maps stdlib calls via AST audit", func(t *testing.T) {
		sessionID := "test-ch04-l02-neg-ast"
		session, err := poolMgr.ClaimSession(sessionID)
		if err != nil {
			t.Fatalf("Failed to claim session: %v", err)
		}
		defer poolMgr.ReleaseSession(sessionID)

		ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
		defer cancel()

		toListBypass := map[string]string{
			"src/map_stdlib.erl": `-module(map_stdlib).
-export([safe_get_load/2, increment_tag_counts/2, merge_configs/2, sum_map_values/1]).

safe_get_load(NodeMetricsMap, NodeAtom) ->
    maps:get(NodeAtom, NodeMetricsMap, 0).

increment_tag_counts(TagList, InitialCountsMap) ->
    lists:foldl(fun(Tag, Acc) -> maps:update_with(Tag, fun(C) -> C + 1 end, 1, Acc) end, InitialCountsMap, TagList).

merge_configs(DefaultCfgMap, UserCfgMap) ->
    maps:without([secret_key, debug_token], maps:merge(DefaultCfgMap, UserCfgMap)).

%% Bypass: allocates intermediate tuple list with maps:to_list/1 instead of maps:fold/3.
sum_map_values(NumericMap) ->
    lists:foldl(fun({_K, V}, Acc) -> Acc + V end, 0, maps:to_list(NumericMap)).
`,
		}
		report, err := runner.RunVerification(ctx, session, "ch04-l02", toListBypass)
		if err != nil {
			t.Fatalf("RunVerification failed unexpectedly: %v", err)
		}
		if report.Verdict == "PASSED" {
			t.Fatalf("Expected FAILED verdict when maps:to_list/1 is used instead of maps:fold/3, got PASSED")
		}
		astFailed := false
		for _, st := range report.Stages {
			if st.ID == "ast_map_stdlib_audit" && st.Status == "failed" {
				astFailed = true
			}
		}
		if !astFailed {
			t.Errorf("Expected ast_map_stdlib_audit stage to fail on forbidden maps:to_list/1 and missing maps:fold/3, stages=%+v", report.Stages)
		}
	})

	t.Run("ch04-l02 rejects inverted merge precedence and non-additive update_with bug", func(t *testing.T) {
		sessionID := "test-ch04-l02-neg-edge"
		session, err := poolMgr.ClaimSession(sessionID)
		if err != nil {
			t.Fatalf("Failed to claim session: %v", err)
		}
		defer poolMgr.ReleaseSession(sessionID)

		ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
		defer cancel()

		buggy := map[string]string{
			"src/map_stdlib.erl": `-module(map_stdlib).
-export([safe_get_load/2, increment_tag_counts/2, merge_configs/2, sum_map_values/1]).

safe_get_load(NodeMetricsMap, NodeAtom) ->
    maps:get(NodeAtom, NodeMetricsMap, 0).

%% Bug: overwrites existing count back to 1 instead of C + 1.
increment_tag_counts(TagList, InitialCountsMap) ->
    lists:foldl(fun(Tag, Acc) -> maps:update_with(Tag, fun(_C) -> 1 end, 1, Acc) end, InitialCountsMap, TagList).

%% Bug: inverted merge order lets DefaultCfgMap overwrite UserCfgMap overrides.
merge_configs(DefaultCfgMap, UserCfgMap) ->
    maps:without([secret_key, debug_token], maps:merge(UserCfgMap, DefaultCfgMap)).

sum_map_values(NumericMap) ->
    maps:fold(fun(_K, V, Acc) -> Acc + V end, 0, NumericMap).
`,
		}
		report, err := runner.RunVerification(ctx, session, "ch04-l02", buggy)
		if err != nil {
			t.Fatalf("RunVerification failed unexpectedly: %v", err)
		}
		if report.Verdict == "PASSED" {
			t.Fatalf("Expected FAILED verdict for inverted merge precedence and reset counter bug, got PASSED")
		}
		funcFailed := false
		for _, st := range report.Stages {
			if st.ID == "maps_stdlib_functions" && st.Status == "failed" {
				funcFailed = true
			}
		}
		if !funcFailed {
			t.Errorf("Expected maps_stdlib_functions stage to fail for merge precedence and update_with bugs, stages=%+v", report.Stages)
		}
	})

	t.Run("ch04-l03 rejects hardcoded tuple and magic index 2 bypass missing -record/#frame.seq via AST audit", func(t *testing.T) {
		sessionID := "test-ch04-l03-neg-ast"
		session, err := poolMgr.ClaimSession(sessionID)
		if err != nil {
			t.Fatalf("Failed to claim session: %v", err)
		}
		defer poolMgr.ReleaseSession(sessionID)

		ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
		defer cancel()

		magicNumberBypass := map[string]string{
			"src/record_frames.erl": `-module(record_frames).
-export([new_frame/3, advance_seq/1, frame_seq_index/0, find_frame_by_seq/2]).

%% Bypass: no -record(frame, ...), uses raw tuples and hardcoded magic index 2.
new_frame(Seq, Type, Payload) ->
    {frame, Seq, Type, Payload}.

advance_seq({frame, Seq, Type, Payload}) ->
    {frame, Seq + 1, Type, Payload}.

frame_seq_index() ->
    2.

find_frame_by_seq(FrameList, TargetSeq) ->
    case lists:keyfind(TargetSeq, 2, FrameList) of
        {frame, TargetSeq, _, _} = Frame -> {ok, Frame};
        false -> not_found
    end.
`,
		}
		report, err := runner.RunVerification(ctx, session, "ch04-l03", magicNumberBypass)
		if err != nil {
			t.Fatalf("RunVerification failed unexpectedly: %v", err)
		}
		if report.Verdict == "PASSED" {
			t.Fatalf("Expected FAILED verdict when -record and #frame.seq are bypassed with magic index 2, got PASSED")
		}
		astFailed := false
		for _, st := range report.Stages {
			if st.ID == "ast_record_frames_audit" && st.Status == "failed" {
				astFailed = true
			}
		}
		if !astFailed {
			t.Errorf("Expected ast_record_frames_audit stage to fail when record_def/#frame.seq are bypassed, stages=%+v", report.Stages)
		}
	})

	t.Run("ch04-l03 rejects wrong record update and missing not_found clause in record_definitions_and_indices", func(t *testing.T) {
		sessionID := "test-ch04-l03-neg-edge"
		session, err := poolMgr.ClaimSession(sessionID)
		if err != nil {
			t.Fatalf("Failed to claim session: %v", err)
		}
		defer poolMgr.ReleaseSession(sessionID)

		ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
		defer cancel()

		buggy := map[string]string{
			"src/record_frames.erl": `-module(record_frames).
-export([new_frame/3, advance_seq/1, frame_seq_index/0, find_frame_by_seq/2]).

-record(frame, {seq = 0, type = data, payload}).

new_frame(Seq, Type, Payload) ->
    #frame{seq = Seq, type = Type, payload = Payload}.

%% Bug: creates a fresh #frame without preserving Frame's type field.
advance_seq(#frame{seq = S, payload = P}) ->
    #frame{seq = S + 1, payload = P}.

frame_seq_index() ->
    #frame.seq.

%% Bug: returns raw false on missing frame instead of not_found.
find_frame_by_seq(FrameList, TargetSeq) ->
    case lists:keyfind(TargetSeq, #frame.seq, FrameList) of
        #frame{} = Frame -> {ok, Frame};
        false -> false
    end.
`,
		}
		report, err := runner.RunVerification(ctx, session, "ch04-l03", buggy)
		if err != nil {
			t.Fatalf("RunVerification failed unexpectedly: %v", err)
		}
		if report.Verdict == "PASSED" {
			t.Fatalf("Expected FAILED verdict for lost record type field and raw false miss return, got PASSED")
		}
		funcFailed := false
		for _, st := range report.Stages {
			if st.ID == "record_definitions_and_indices" && st.Status == "failed" {
				funcFailed = true
			}
		}
		if !funcFailed {
			t.Errorf("Expected record_definitions_and_indices stage to fail for record update and not_found bugs, stages=%+v", report.Stages)
		}
	})

	t.Run("ch04-l04 rejects integer_to_list/manual size bypass missing required binary/IOList BIFs via AST audit", func(t *testing.T) {
		sessionID := "test-ch04-l04-neg-ast"
		session, err := poolMgr.ClaimSession(sessionID)
		if err != nil {
			t.Fatalf("Failed to claim session: %v", err)
		}
		defer poolMgr.ReleaseSession(sessionID)

		ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
		defer cancel()

		bypass := map[string]string{
			"src/iolist_builder.erl": `-module(iolist_builder).
-export([string_vs_binary_bytes/1, build_http_response_iolist/2, flatten_iolist/1]).

string_vs_binary_bytes(CharList) ->
    Bin = list_to_binary(CharList),
    {size_comparison, length(CharList) * 16, byte_size(Bin), Bin}.

%% Bypass: avoids integer_to_binary/1 by converting list formatting instead.
build_http_response_iolist(StatusCodeInt, BodyBin) ->
    LenBin = list_to_binary(integer_to_list(byte_size(BodyBin))),
    CodeBin = list_to_binary(integer_to_list(StatusCodeInt)),
    [<<"HTTP/1.1 ">>, CodeBin, <<" OK\r\nContent-Length: ">>, LenBin, <<"\r\n\r\n">>, BodyBin].

%% Bypass: measures flattened binary with byte_size/1 instead of allocation-free iolist_size/1.
flatten_iolist(IoList) ->
    Flat = iolist_to_binary(IoList),
    {byte_size(Flat), Flat}.
`,
		}
		report, err := runner.RunVerification(ctx, session, "ch04-l04", bypass)
		if err != nil {
			t.Fatalf("RunVerification failed unexpectedly: %v", err)
		}
		if report.Verdict == "PASSED" {
			t.Fatalf("Expected FAILED verdict when integer_to_binary/1 and iolist_size/1 are bypassed, got PASSED")
		}
		astFailed := false
		for _, st := range report.Stages {
			if st.ID == "ast_iolist_builder_audit" && st.Status == "failed" {
				astFailed = true
			}
		}
		if !astFailed {
			t.Errorf("Expected ast_iolist_builder_audit stage to fail when required binary/IOList BIFs are bypassed, stages=%+v", report.Stages)
		}
	})

	t.Run("ch04-l04 rejects eager flat-binary HTTP response instead of zero-copy nested IOList", func(t *testing.T) {
		sessionID := "test-ch04-l04-neg-edge"
		session, err := poolMgr.ClaimSession(sessionID)
		if err != nil {
			t.Fatalf("Failed to claim session: %v", err)
		}
		defer poolMgr.ReleaseSession(sessionID)

		ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
		defer cancel()

		flatCopyBug := map[string]string{
			"src/iolist_builder.erl": `-module(iolist_builder).
-export([string_vs_binary_bytes/1, build_http_response_iolist/2, flatten_iolist/1]).

string_vs_binary_bytes(CharList) ->
    Bin = list_to_binary(CharList),
    {size_comparison, length(CharList) * 16, byte_size(Bin), Bin}.

%% Bug: eagerly flattens HTTP response into one copied binary instead of returning a zero-copy nested IOList.
build_http_response_iolist(StatusCodeInt, BodyBin) ->
    LenBin = integer_to_binary(byte_size(BodyBin)),
    CodeBin = integer_to_binary(StatusCodeInt),
    iolist_to_binary([<<"HTTP/1.1 ">>, CodeBin, <<" OK\r\nContent-Length: ">>, LenBin, <<"\r\n\r\n">>, BodyBin]).

flatten_iolist(IoList) ->
    {iolist_size(IoList), iolist_to_binary(IoList)}.
`,
		}
		report, err := runner.RunVerification(ctx, session, "ch04-l04", flatCopyBug)
		if err != nil {
			t.Fatalf("RunVerification failed unexpectedly: %v", err)
		}
		if report.Verdict == "PASSED" {
			t.Fatalf("Expected FAILED verdict when build_http_response_iolist/2 eagerly flattens to a binary, got PASSED")
		}
		funcFailed := false
		for _, st := range report.Stages {
			if st.ID == "binary_and_iolist_construction" && st.Status == "failed" {
				funcFailed = true
			}
		}
		if !funcFailed {
			t.Errorf("Expected binary_and_iolist_construction stage to fail when HTTP response is flattened binary instead of IOList, stages=%+v", report.Stages)
		}
	})

	t.Run("ch04-l05 rejects bitwise shift/list_to_binary bypass and missing is_binary guard via AST audit", func(t *testing.T) {
		sessionID := "test-ch04-l05-neg-ast"
		session, err := poolMgr.ClaimSession(sessionID)
		if err != nil {
			t.Fatalf("Failed to claim session: %v", err)
		}
		defer poolMgr.ReleaseSession(sessionID)

		ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
		defer cancel()

		bypass := map[string]string{
			"src/bit_packer.erl": `-module(bit_packer).
-export([pack_header/3, unpack_header/1, encode_utf8_tagged/1]).

%% Bypass: manually shifts bits via list_to_binary instead of explicit bit syntax segments.
pack_header(Version, Flags, Length) ->
    list_to_binary([(Version bsl 4) bor Flags, Length bsr 8, Length band 255]).

unpack_header(<<Byte1, Hi, Lo, Payload/binary>>) ->
    {ok, Byte1 bsr 4, Byte1 band 15, (Hi bsl 8) bor Lo, Payload};
unpack_header(_) ->
    {error, insufficient_bytes}.

%% Bypass: omits is_binary/1 guard on encode_utf8_tagged/1.
encode_utf8_tagged(TextBinary) ->
    Len = byte_size(TextBinary),
    <<16#01:8, Len:16/big-unsigned-integer, TextBinary/binary>>.
`,
		}
		report, err := runner.RunVerification(ctx, session, "ch04-l05", bypass)
		if err != nil {
			t.Fatalf("RunVerification failed unexpectedly: %v", err)
		}
		if report.Verdict == "PASSED" {
			t.Fatalf("Expected FAILED verdict when bit syntax or is_binary/1 guard is bypassed, got PASSED")
		}
		astFailed := false
		for _, st := range report.Stages {
			if st.ID == "ast_bit_packer_audit" && st.Status == "failed" {
				astFailed = true
			}
		}
		if !astFailed {
			t.Errorf("Expected ast_bit_packer_audit stage to fail when bit syntax / is_binary guard is bypassed, stages=%+v", report.Stages)
		}
	})

	t.Run("ch04-l05 rejects little-endian packing bug and empty-binary unpack bug", func(t *testing.T) {
		sessionID := "test-ch04-l05-neg-edge"
		session, err := poolMgr.ClaimSession(sessionID)
		if err != nil {
			t.Fatalf("Failed to claim session: %v", err)
		}
		defer poolMgr.ReleaseSession(sessionID)

		ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
		defer cancel()

		littleEndianBug := map[string]string{
			"src/bit_packer.erl": `-module(bit_packer).
-export([pack_header/3, unpack_header/1, encode_utf8_tagged/1]).

%% Bug: encodes Length in little-endian instead of big-endian network byte order.
pack_header(Version, Flags, Length) ->
    <<Version:4, Flags:4, Length:16/little-unsigned-integer>>.

unpack_header(<<Version:4, Flags:4, Length:16/little-unsigned-integer, Payload/binary>>) ->
    {ok, Version, Flags, Length, Payload};
unpack_header(_) ->
    {error, insufficient_bytes}.

encode_utf8_tagged(TextBinary) when is_binary(TextBinary) ->
    Len = byte_size(TextBinary),
    <<16#01:8, Len:16/little-unsigned-integer, TextBinary/binary>>.
`,
		}
		report, err := runner.RunVerification(ctx, session, "ch04-l05", littleEndianBug)
		if err != nil {
			t.Fatalf("RunVerification failed unexpectedly: %v", err)
		}
		if report.Verdict == "PASSED" {
			t.Fatalf("Expected FAILED verdict when little-endian ordering is used instead of big-endian, got PASSED")
		}
		funcFailed := false
		for _, st := range report.Stages {
			if st.ID == "bit_syntax_wire_format" && st.Status == "failed" {
				funcFailed = true
			}
		}
		if !funcFailed {
			t.Errorf("Expected bit_syntax_wire_format stage to fail when little-endian ordering is used, stages=%+v", report.Stages)
		}
	})

	t.Run("ch04-l06 rejects list comprehension + list_to_binary bypass instead of <= binary comprehension via AST audit", func(t *testing.T) {
		sessionID := "test-ch04-l06-neg-ast"
		session, err := poolMgr.ClaimSession(sessionID)
		if err != nil {
			t.Fatalf("Failed to claim session: %v", err)
		}
		defer poolMgr.ReleaseSession(sessionID)

		ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
		defer cancel()

		bypass := map[string]string{
			"src/binary_scanner.erl": `-module(binary_scanner).
-export([split_key_value/1, extract_lines/1, xor_mask_payload/2]).

split_key_value(HeaderBin) ->
    case binary:split(HeaderBin, <<": ">>) of
        [Key, Value] -> {ok, Key, Value};
        _ -> {error, malformed_header}
    end.

extract_lines(MultiLineBin) ->
    binary:split(MultiLineBin, <<"\r\n">>, [global, trim_all]).

%% Bypass: allocates intermediate linked list via list comprehension instead of binary comprehension <=.
xor_mask_payload(PayloadBin, MaskByte) ->
    list_to_binary([B bxor MaskByte || <<B:8>> <= PayloadBin]).
`,
		}
		report, err := runner.RunVerification(ctx, session, "ch04-l06", bypass)
		if err != nil {
			t.Fatalf("RunVerification failed unexpectedly: %v", err)
		}
		if report.Verdict == "PASSED" {
			t.Fatalf("Expected FAILED verdict when list comprehension bypass replaces <= binary comprehension, got PASSED")
		}
		astFailed := false
		for _, st := range report.Stages {
			if st.ID == "ast_binary_scanner_audit" && st.Status == "failed" {
				astFailed = true
			}
		}
		if !astFailed {
			t.Errorf("Expected ast_binary_scanner_audit stage to fail on list comprehension bypass, stages=%+v", report.Stages)
		}
	})

	t.Run("ch04-l06 rejects global header split bug and missing trim_all blank-line bug", func(t *testing.T) {
		sessionID := "test-ch04-l06-neg-edge"
		session, err := poolMgr.ClaimSession(sessionID)
		if err != nil {
			t.Fatalf("Failed to claim session: %v", err)
		}
		defer poolMgr.ReleaseSession(sessionID)

		ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
		defer cancel()

		buggy := map[string]string{
			"src/binary_scanner.erl": `-module(binary_scanner).
-export([split_key_value/1, extract_lines/1, xor_mask_payload/2]).

%% Bug: splits globally so multi-colon values fail to preserve full value.
split_key_value(HeaderBin) ->
    case binary:split(HeaderBin, <<": ">>, [global]) of
        [Key, Value] -> {ok, Key, Value};
        _ -> {error, malformed_header}
    end.

%% Bug: omits trim_all so leading/consecutive/trailing empty lines remain.
extract_lines(MultiLineBin) ->
    binary:split(MultiLineBin, <<"\r\n">>, [global]).

xor_mask_payload(PayloadBin, MaskByte) ->
    << <<(B bxor MaskByte):8>> || <<B:8>> <= PayloadBin >>.
`,
		}
		report, err := runner.RunVerification(ctx, session, "ch04-l06", buggy)
		if err != nil {
			t.Fatalf("RunVerification failed unexpectedly: %v", err)
		}
		if report.Verdict == "PASSED" {
			t.Fatalf("Expected FAILED verdict on global split / missing trim_all bug, got PASSED")
		}
		funcFailed := false
		for _, st := range report.Stages {
			if st.ID == "binary_scanner_and_comprehension" && st.Status == "failed" {
				funcFailed = true
			}
		}
		if !funcFailed {
			t.Errorf("Expected binary_scanner_and_comprehension stage to fail on global split / missing trim_all bug, stages=%+v", report.Stages)
		}
	})

	t.Run("ch04-l07 rejects binary_to_list bypass and missing referenced_byte_size/guard via AST audit", func(t *testing.T) {
		sessionID := "test-ch04-l07-neg-ast"
		session, err := poolMgr.ClaimSession(sessionID)
		if err != nil {
			t.Fatalf("Failed to claim session: %v", err)
		}
		defer poolMgr.ReleaseSession(sessionID)

		ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
		defer cancel()

		bypass := map[string]string{
			"src/binary_unpinner.erl": `-module(binary_unpinner).
-export([extract_token_safe/1, slice_packet_safe/2, inspect_refc_ratio/1]).

%% Bypass: rebuilds slice through binary_to_list/list_to_binary instead of binary:copy/1.
extract_token_safe(<<Token:16/binary, _Rest/binary>>) ->
    {ok, list_to_binary(binary_to_list(Token))};
extract_token_safe(_) ->
    {error, insufficient_data}.

%% Bypass: omits guard validation on slice_packet_safe/2.
slice_packet_safe(Packet, Length) ->
    <<Slice:Length/binary, _Rest/binary>> = Packet,
    binary:copy(Slice).

%% Bypass: fabricates referenced size instead of calling binary:referenced_byte_size/1.
inspect_refc_ratio(Bin) ->
    {byte_size(Bin), byte_size(Bin)}.
`,
		}
		report, err := runner.RunVerification(ctx, session, "ch04-l07", bypass)
		if err != nil {
			t.Fatalf("RunVerification failed unexpectedly: %v", err)
		}
		if report.Verdict == "PASSED" {
			t.Fatalf("Expected FAILED verdict when binary_to_list bypass or missing guard/referenced_byte_size occurs, got PASSED")
		}
		astFailed := false
		for _, st := range report.Stages {
			if st.ID == "ast_binary_unpinner_audit" && st.Status == "failed" {
				astFailed = true
			}
		}
		if !astFailed {
			t.Errorf("Expected ast_binary_unpinner_audit stage to fail on binary_to_list / missing guard bypass, stages=%+v", report.Stages)
		}
	})

	t.Run("ch04-l07 rejects un-copied sub-binary pinning leak and negative-length guard omission", func(t *testing.T) {
		sessionID := "test-ch04-l07-neg-edge"
		session, err := poolMgr.ClaimSession(sessionID)
		if err != nil {
			t.Fatalf("Failed to claim session: %v", err)
		}
		defer poolMgr.ReleaseSession(sessionID)

		ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
		defer cancel()

		leakBug := map[string]string{
			"src/binary_unpinner.erl": `-module(binary_unpinner).
-export([extract_token_safe/1, slice_packet_safe/2, inspect_refc_ratio/1]).

extract_token_safe(<<Token:16/binary, _Rest/binary>>) ->
    {ok, binary:copy(Token)};
extract_token_safe(_) ->
    {error, insufficient_data}.

%% Bug: returns un-copied 128-byte sub-binary slice directly (pins full 4096-byte ProcBin!).
slice_packet_safe(Packet, Length) when is_binary(Packet), is_integer(Length), Length >= 0, byte_size(Packet) >= Length ->
    <<Slice:Length/binary, _Rest/binary>> = Packet,
    _ = binary:copy(<<>>),
    Slice.

inspect_refc_ratio(Bin) ->
    {byte_size(Bin), binary:referenced_byte_size(Bin)}.
`,
		}
		report, err := runner.RunVerification(ctx, session, "ch04-l07", leakBug)
		if err != nil {
			t.Fatalf("RunVerification failed unexpectedly: %v", err)
		}
		if report.Verdict == "PASSED" {
			t.Fatalf("Expected FAILED verdict when sub-binary stays pinned or negative Length bypasses guard, got PASSED")
		}
		funcFailed := false
		for _, st := range report.Stages {
			if st.ID == "procbin_subbinary_unpinning" && st.Status == "failed" {
				funcFailed = true
			}
		}
		if !funcFailed {
			t.Errorf("Expected procbin_subbinary_unpinning stage to fail on sub-binary leak / negative length bug, stages=%+v", report.Stages)
		}
	})
}
