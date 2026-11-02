-module(cluster_pubsub_pg).
-export([cluster_node_info/0, safe_remote_call/4, join_topic/2, publish_to_topic/2, leave_topic/2]).
-export([init_pubsub/0, broadcast/2, get_subscribers/1]).

cluster_node_info() ->
    #{}.

safe_remote_call(TargetNode, Mod, Fun, Args) ->
    {ok, ok}.

join_topic(Topic, Pid) ->
    ok.

publish_to_topic(Topic, Message) ->
    {published, 0}.

leave_topic(Topic, Pid) ->
    ok.

init_pubsub() ->
    ok.

broadcast(Topic, Message) ->
    {ok, 0}.

get_subscribers(Topic) ->
    [].
