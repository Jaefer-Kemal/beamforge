-module(telecom_events).
-export([make_event/3, extract_caller/1, swap_endpoints/1]).

%% @doc Construct a 5-element tagged tuple starting with call_event and initial duration 0.
make_event(Id, Caller, Callee) ->
    %% Construct and return a 5-element tagged tuple starting with the atom 'call_event'
    %% and an initial duration of 0.
    ok.

%% @doc Extract the Caller atom from a call_event tuple.
extract_caller(Event) ->
    %% Destructure the incoming call_event tuple using pattern matching and extract the Caller atom.
    ok.

%% @doc Swap Caller and Callee positions in the call_event tuple.
swap_endpoints(Event) ->
    %% Destructure the event and construct a new call_event tuple where Caller and Callee
    %% positions are exchanged, keeping Id and Duration intact.
    ok.