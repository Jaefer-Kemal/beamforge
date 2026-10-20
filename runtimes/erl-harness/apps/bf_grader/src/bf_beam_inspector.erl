-module(bf_beam_inspector).

-export([
    assert_tail_recursive/4,
    assert_no_sub_binary_leak/2,
    inspect_state/3
]).

-define(DEFAULT_MAX_STACK_WORDS, 64).

-spec assert_tail_recursive(node(), module(), atom(), list()) -> ok | {error, term()}.
assert_tail_recursive(Node, Mod, Fun, Args) ->
    Self = self(),
    Ref = make_ref(),
    
    SpawnFun = fun() ->
        WorkerPid = spawn_link(fun() ->
            Res = apply(Mod, Fun, Args),
            Self ! {Ref, completed, Res}
        end),
        
        %% Sample stack size over the worker's execution
        MaxStack = sample_worker_stack(WorkerPid, 0, 0),
        Self ! {Ref, max_stack, MaxStack}
    end,

    case Node =:= node() of
        true ->
            spawn_link(SpawnFun);
        false ->
            rpc:call(Node, erlang, apply, [SpawnFun, []])
    end,

    receive
        {Ref, max_stack, PeakStack} ->
            receive
                {Ref, completed, _Result} ->
                    case PeakStack =< ?DEFAULT_MAX_STACK_WORDS of
                        true ->
                            ok;
                        false ->
                            {error, {not_tail_recursive, #{
                                peak_stack_words => PeakStack,
                                max_allowed_words => ?DEFAULT_MAX_STACK_WORDS,
                                hint => "Stack size grew during recursion. Ensure recursive calls are in strict tail position."
                            }}}
                    end
            after 5000 ->
                {error, worker_timeout}
            end
    after 5000 ->
        {error, sampler_timeout}
    end.

sample_worker_stack(Pid, PeakStack, Ticks) when Ticks < 100 ->
    case erlang:process_info(Pid, [stack_size, status]) of
        [{stack_size, StackSize}, {status, _Status}] ->
            NewPeak = max(PeakStack, StackSize),
            timer:sleep(2),
            sample_worker_stack(Pid, NewPeak, Ticks + 1);
        _ ->
            PeakStack
    end;
sample_worker_stack(_Pid, PeakStack, _Ticks) ->
    PeakStack.

-spec assert_no_sub_binary_leak(binary(), number()) -> ok | {error, term()}.
assert_no_sub_binary_leak(BinaryTerm, MaxRatio) when is_binary(BinaryTerm) ->
    RefSize = binary:referenced_byte_size(BinaryTerm),
    ActualSize = byte_size(BinaryTerm),
    
    case ActualSize of
        0 ->
            ok;
        _ ->
            Ratio = RefSize / ActualSize,
            case (RefSize > 64) andalso (Ratio > MaxRatio) of
                true ->
                    {error, {sub_binary_leak, #{
                        referenced_byte_size => RefSize,
                        actual_byte_size => ActualSize,
                        leak_ratio => Ratio,
                        max_allowed_ratio => MaxRatio,
                        hint => "Binary slice pins large socket buffer in memory. Use binary:copy/1 to free original payload."
                    }}};
                false ->
                    ok
            end
    end;
assert_no_sub_binary_leak(_NotBinary, _MaxRatio) ->
    {error, not_a_binary}.

-spec inspect_state(node(), atom() | pid(), timeout()) -> {ok, term()} | {error, term()}.
inspect_state(Node, Target, Timeout) ->
    case Node =:= node() of
        true ->
            try sys:get_state(Target, Timeout) of
                State -> {ok, State}
            catch
                Class:Reason:Stack ->
                    {error, #{class => Class, reason => Reason, stacktrace => Stack}}
            end;
        false ->
            case rpc:call(Node, sys, get_state, [Target, Timeout], Timeout + 1000) of
                {badrpc, Reason} ->
                    {error, {badrpc, Reason}};
                State ->
                    {ok, State}
            end
    end.
