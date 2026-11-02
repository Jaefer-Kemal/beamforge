-module(record_frames).
-export([new_frame/3, advance_seq/1, frame_seq_index/0, find_frame_by_seq/2]).

%% % TODO: Declare -record(frame, {seq = 0, type = data, payload}).

%% @doc Return new #frame record.
new_frame(Seq, Type, Payload) ->
    %% % TODO: Instantiate and return the frame record with given fields.
    {frame, Seq, Type, Payload}.

%% @doc Increment seq field by 1.
advance_seq(Frame) ->
    %% % TODO: Return the record with an incremented sequence number.
    Frame.

%% @doc Return compile-time index integer for seq.
frame_seq_index() ->
    %% % TODO: Return the compile-time field offset for sequence number.
    0.

%% @doc Find frame matching TargetSeq using lists:keyfind/3 with record index.
find_frame_by_seq(_FrameList, _TargetSeq) ->
    %% % TODO: Search the list for the frame matching TargetSeq.
    not_found.