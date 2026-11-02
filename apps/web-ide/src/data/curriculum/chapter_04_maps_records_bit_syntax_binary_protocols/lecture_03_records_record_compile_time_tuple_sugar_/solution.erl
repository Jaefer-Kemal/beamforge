-module(record_frames).
-export([new_frame/3, advance_seq/1, frame_seq_index/0, find_frame_by_seq/2]).

-record(frame, {
    seq = 0 :: non_neg_integer(),
    type = data :: atom(),
    payload :: term()
}).

new_frame(Seq, Type, Payload) ->
    #frame{seq = Seq, type = Type, payload = Payload}.

advance_seq(#frame{seq = S} = Frame) ->
    Frame#frame{seq = S + 1}.

frame_seq_index() ->
    #frame.seq.

find_frame_by_seq(FrameList, TargetSeq) ->
    case lists:keyfind(TargetSeq, #frame.seq, FrameList) of
        {frame, TargetSeq, _, _} = Frame ->
            {ok, Frame};
        false ->
            not_found
    end.