-module(iolist_builder).
-export([string_vs_binary_bytes/1, build_http_response_iolist/2, flatten_iolist/1]).

string_vs_binary_bytes(CharList) ->
    Bin = list_to_binary(CharList),
    {size_comparison, length(CharList) * 16, byte_size(Bin), Bin}.

build_http_response_iolist(StatusCodeInt, BodyBin) ->
    LenBin = integer_to_binary(byte_size(BodyBin)),
    CodeBin = integer_to_binary(StatusCodeInt),
    [
        <<"HTTP/1.1 ">>, CodeBin, <<" OK
Content-Length: ">>,
        LenBin, <<"

">>, BodyBin
    ].

flatten_iolist(IoList) ->
    {iolist_size(IoList), iolist_to_binary(IoList)}.