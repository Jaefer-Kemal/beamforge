const fs = require('fs');

console.log('=== PATCHING CHAPTER 9 ===');
const ch09Path = 'apps/web-ide/src/data/chapters/ch09.ts';
let ch09 = fs.readFileSync(ch09Path, 'utf8');

// Catch 3: Integer division spec text fix in ch09-l06
const oldFeeSpec = "Returns fee: \\`usd\\` -> \\`div 1000 * 15\\`, \\`eur\\` -> \\`div 1000 * 20\\`, \\`etb\\` -> \\`div 1000 * 10\\`.";
const newFeeSpec = "Returns fee: \\`usd\\` -> \\`(Amount * 15) div 1000\\`, \\`eur\\` -> \\`(Amount * 20) div 1000\\`, \\`etb\\` -> \\`(Amount * 10) div 1000\\`.";
if (!ch09.includes(oldFeeSpec)) throw new Error("Could not find oldFeeSpec in ch09");
ch09 = ch09.replace(oldFeeSpec, newFeeSpec);
console.log('  ✓ Fixed ch09-l06 fee spec text');

// Catch 1: Stub session_cache.erl in ch09-l08 starterCode and files[2]
const ch09L08StarterStub = `-module(session_cache).
-behaviour(gen_server).

-export([start_link/0, put_session/3, get_session/1, increment_hits/1, delete_session/1, count_sessions/0]).
-export([start_pipeline/0, stop_pipeline/0]).
-export([init/1, handle_call/3, handle_cast/2, handle_info/2, terminate/2]).

-define(TAB, session_cache_tab).

start_link() ->
    gen_server:start_link({local, ?MODULE}, ?MODULE, [], []).

start_pipeline() ->
    session_sup:start_link().

stop_pipeline() ->
    case whereis(session_sup) of
        undefined -> ok;
        SupPid ->
            unlink(SupPid),
            try supervisor:stop(SupPid) catch _:_ -> ok end
    end,
    [case whereis(N) of undefined -> ok; P -> exit(P, kill) end || N <- [session_cache, table_manager, session_sup]],
    ok.

init([]) ->
    %% % TODO [Heir Failover Handshake]:
    %% % 1. Check if ?TAB already exists using ets:info(?TAB).
    %% % 2. If undefined (fresh boot):
    %% %    - Look up HeirPid via whereis(table_manager).
    %% %    - Create named table ?TAB with opts: [set, public, named_table,
    %% %      {read_concurrency, true}, {write_concurrency, true},
    %% %      {heir, HeirPid, session_backup}].
    %% % 3. If table already exists (worker restarted by supervisor after crash):
    %% %    - Reclaim table ownership from table_manager via table_manager:claim_table(?TAB).
    %% % 4. Return {ok, #{table => ?TAB}}.
    ok.

put_session(_SessionId, _UserId, _MetaMap) ->
    %% % TODO: Insert 4-tuple {SessionId, UserId, MetaMap, 0} into ?TAB and return ok.
    ok.

get_session(_SessionId) ->
    %% % TODO: Look up SessionId in ?TAB:
    %% % If found [{SessionId, UserId, MetaMap, HitCount}], return:
    %% %   {ok, #{user_id => UserId, meta => MetaMap, hit_count => HitCount}}
    %% % If not found [], return {error, not_found}.
    ok.

increment_hits(_SessionId) ->
    %% % TODO: Atomically increment 4th element (hit_count) by 1 via ets:update_counter/3:
    %% % On success, return {ok, NewCount}.
    %% % If SessionId does not exist, return {error, not_found}.
    ok.

delete_session(_SessionId) ->
    %% % TODO: Delete SessionId from ?TAB via ets:delete/2 and return ok.
    ok.

count_sessions() ->
    %% % TODO: Return number of items in ?TAB via ets:info(?TAB, size). Return 0 if undefined.
    0.

handle_call(_Req, _From, State) ->
    {reply, ok, State}.

handle_cast(_Msg, State) ->
    {noreply, State}.

handle_info({'ETS-TRANSFER', _Tab, _OldOwner, _GiftData}, State) ->
    {noreply, State};
handle_info(_Info, State) ->
    {noreply, State}.

terminate(_Reason, _State) ->
    ok.`;

// Replace ch09-l08 starterCode
const l08StartIdx = ch09.indexOf("id: 'ch09-l08'");
const l08StarterCodeMarker = "starterCode: `-module(session_cache).";
const l08StarterCodePos = ch09.indexOf(l08StarterCodeMarker, l08StartIdx);
const l08SolutionCodeMarker = "solutionCode: `-module(session_cache).";
const l08SolutionCodePos = ch09.indexOf(l08SolutionCodeMarker, l08StartIdx);

if (l08StarterCodePos === -1 || l08SolutionCodePos === -1) throw new Error("Could not find ch09-l08 starterCode or solutionCode");

ch09 = ch09.slice(0, l08StarterCodePos) + "starterCode: `" + ch09L08StarterStub + "`,\n    " + ch09.slice(l08SolutionCodePos);

// Replace ch09-l08 files[2] (session_cache.erl) content
const l08FilesIdx = ch09.indexOf("name: 'session_cache.erl'", l08StartIdx);
if (l08FilesIdx === -1) throw new Error("Could not find session_cache.erl in files");
const l08ContentIdx = ch09.indexOf("content: `-module(session_cache).", l08FilesIdx);
const l08ContentEndIdx = ch09.indexOf("`\n      }", l08ContentIdx);
if (l08ContentIdx === -1 || l08ContentEndIdx === -1) throw new Error("Could not find session_cache.erl content block");

ch09 = ch09.slice(0, l08ContentIdx) + "content: `" + ch09L08StarterStub + ch09.slice(l08ContentEndIdx);
console.log('  ✓ Replaced ch09-l08 starterCode & files[2] with challenge skeleton');

// Multi-file normalization for ch09-l01..ch09-l07
const ch09Mods = [
  { id: 'ch09-l01', mod: 'ets_telemetry' },
  { id: 'ch09-l02', mod: 'ets_query_engine' },
  { id: 'ch09-l03', mod: 'ets_heir_handshake' },
  { id: 'ch09-l04', mod: 'cluster_pubsub_pg' },
  { id: 'ch09-l05', mod: 'mnesia_ledger' },
  { id: 'ch09-l06', mod: 'ledger_specs_and_tests' },
  { id: 'ch09-l07', mod: 'incident_ets_wipeout' },
];

for (const { id, mod } of ch09Mods) {
  const lessonIdx = ch09.indexOf(`id: '${id}'`);
  const nextLessonIdx = ch09.indexOf(`id: 'ch09-l0`, lessonIdx + 10);
  const chunk = nextLessonIdx === -1 ? ch09.slice(lessonIdx) : ch09.slice(lessonIdx, nextLessonIdx);

  if (!chunk.includes('files: [')) {
    const starterMarker = `starterCode: \`-module(${mod}).`;
    const starterIdx = chunk.indexOf(starterMarker);
    const solutionMarker = `solutionCode: \`-module(${mod}).`;
    const solutionIdx = chunk.indexOf(solutionMarker);
    const vtcMarker = "visibleTestCases: [";
    const vtcIdx = chunk.indexOf(vtcMarker);

    if (starterIdx === -1 || solutionIdx === -1 || vtcIdx === -1) {
      throw new Error(`Failed to locate markers for ${id} (mod=${mod})`);
    }

    const starterCodeStr = chunk.slice(starterIdx + "starterCode: ".length, solutionIdx).trim();
    const cleanStarter = starterCodeStr.endsWith(',') ? starterCodeStr.slice(0, -1) : starterCodeStr;

    const solCodeStr = chunk.slice(solutionIdx + "solutionCode: ".length, vtcIdx).trim();
    const cleanSol = solCodeStr.endsWith(',') ? solCodeStr.slice(0, -1) : solCodeStr;

    const filesBlock = `    files: [
      {
        name: '${mod}.erl',
        path: 'src/${mod}.erl',
        content: ${cleanStarter},
      },
    ],
    solutionFiles: {
      'src/${mod}.erl': ${cleanSol},
    },
`;

    const targetPos = lessonIdx + vtcIdx;
    ch09 = ch09.slice(0, targetPos) + filesBlock + ch09.slice(targetPos);
    console.log(`  ✓ Added files & solutionFiles to ${id}`);
  }
}

fs.writeFileSync(ch09Path, ch09);
console.log('Chapter 9 successfully patched and saved.');

console.log('\n=== PATCHING CHAPTER 10 ===');
const ch10Path = 'apps/web-ide/src/data/chapters/ch10.ts';
let ch10 = fs.readFileSync(ch10Path, 'utf8');

// Catch 2: Fix tcp_acceptor_pool.erl in ch10-l05
const oldPoolAcceptor = `        {ok, ClientSocket} ->
            WorkerPid = spawn(fun() -> pool_worker_init(ClientSocket, ManagerPid) end),
            ok = gen_tcp:controlling_process(ClientSocket, WorkerPid),
            WorkerPid ! {socket_assigned, ClientSocket},
            ManagerPid ! {worker_spawned, WorkerPid},
            pool_acceptor(ListenSocket, ManagerPid);`;

const newPoolAcceptor = `        {ok, ClientSocket} ->
            WorkerPid = spawn(fun() -> pool_worker_init(ClientSocket, ManagerPid) end),
            ok = handoff_socket(ClientSocket, WorkerPid),
            ManagerPid ! {worker_spawned, WorkerPid},
            pool_acceptor(ListenSocket, ManagerPid);`;

if (!ch10.includes(oldPoolAcceptor)) throw new Error("Could not find oldPoolAcceptor in ch10-l05 starterCode");
ch10 = ch10.replaceAll(oldPoolAcceptor, newPoolAcceptor);
console.log('  ✓ Updated pool_acceptor/2 in ch10-l05 to delegate to handoff_socket/2');

// Add tc-ch10-l05-2 visible test case if not present
if (!ch10.includes('tc-ch10-l05-2')) {
  const oldTc1005 = `    visibleTestCases: [
      {
        id: 'tc-ch10-l05-1',
        title: 'Start Acceptor Pool & Connect 2 Clients',
        erlangCall: 'begin {ok, Mgr, Port} = tcp_acceptor_pool:start_pool(0, 3), {ok, S1} = gen_tcp:connect("127.0.0.1", Port, [binary, {packet, raw}, {active, false}], 2000), {ok, S2} = gen_tcp:connect("127.0.0.1", Port, [binary, {packet, raw}, {active, false}], 2000), timer:sleep(50), Cnt = tcp_acceptor_pool:get_active_workers(Mgr), ok = gen_tcp:send(S1, <<"PING\\\\r\\\\n">>), {ok, Rep} = gen_tcp:recv(S1, 0, 2000), gen_tcp:close(S1), gen_tcp:close(S2), tcp_acceptor_pool:stop_pool(Mgr), {Cnt, Rep} end',
        expectedOutput: '{2,<<"+REPLY: PING\\\\r\\\\n">>}',
        explanation: 'Verifies 2 concurrent connections accepted and request/reply executed.',
      },
    ],`;

  const newTc1005 = `    visibleTestCases: [
      {
        id: 'tc-ch10-l05-1',
        title: 'Start Acceptor Pool & Connect 2 Clients',
        erlangCall: 'begin {ok, Mgr, Port} = tcp_acceptor_pool:start_pool(0, 3), {ok, S1} = gen_tcp:connect("127.0.0.1", Port, [binary, {packet, raw}, {active, false}], 2000), {ok, S2} = gen_tcp:connect("127.0.0.1", Port, [binary, {packet, raw}, {active, false}], 2000), timer:sleep(50), Cnt = tcp_acceptor_pool:get_active_workers(Mgr), ok = gen_tcp:send(S1, <<"PING\\\\r\\\\n">>), {ok, Rep} = gen_tcp:recv(S1, 0, 2000), gen_tcp:close(S1), gen_tcp:close(S2), tcp_acceptor_pool:stop_pool(Mgr), {Cnt, Rep} end',
        expectedOutput: '{2,<<"+REPLY: PING\\\\r\\\\n">>}',
        explanation: 'Verifies 2 concurrent connections accepted and request/reply executed.',
      },
      {
        id: 'tc-ch10-l05-2',
        title: 'Direct Socket Handoff to Worker',
        erlangCall: 'begin {ok, L} = gen_tcp:listen(0, [binary, {active, false}]), {ok, Port} = inet:port(L), Receiver = spawn(fun() -> receive {socket_assigned, S} -> inet:setopts(S, [{active, once}]), receive {tcp, S, <<"HI\\\\r\\\\n">>} -> ok = gen_tcp:send(S, <<"ACK\\\\r\\\\n">>) end end end), {ok, Client} = gen_tcp:connect("127.0.0.1", Port, [binary, {active, false}], 2000), {ok, ServerSock} = gen_tcp:accept(L, 2000), ok = tcp_acceptor_pool:handoff_socket(ServerSock, Receiver), ok = gen_tcp:send(Client, <<"HI\\\\r\\\\n">>), {ok, Rep} = gen_tcp:recv(Client, 0, 2000), gen_tcp:close(Client), gen_tcp:close(L), Rep end',
        expectedOutput: '<<"ACK\\\\r\\\\n">>',
        explanation: 'Directly validates handoff_socket/2 transfers controlling process and signals receiver.',
      },
    ],`;

  if (!ch10.includes(oldTc1005)) throw new Error("Could not find oldTc1005 in ch10");
  ch10 = ch10.replace(oldTc1005, newTc1005);
  console.log('  ✓ Added direct handoff_socket/2 test case to ch10-l05');
}

// Catch 4: Fix invalid astRules in ch10
const astFixes = [
  {
    old: `    astRules: {
      requireTailRecursion: ['echo_loop/3'],
      forbiddenCalls: [],
      requiredCalls: ['gen_tcp:listen', 'gen_tcp:accept', 'gen_tcp:send', 'gen_tcp:recv'],
      requiredConstructs: ['case', 'receive'],
    },`,
    new: `    astRules: {
      requireTailRecursion: ['echo_loop/3'],
      forbiddenCalls: [],
      requiredCalls: ['gen_tcp:listen/2', 'gen_tcp:accept/1', 'gen_tcp:send/2', 'gen_tcp:recv/3'],
      requiredConstructs: ['receive_after'],
    },`,
    desc: 'ch10-l01'
  },
  {
    old: `    astRules: {
      requireTailRecursion: [],
      forbiddenCalls: [],
      requiredCalls: ['byte_size/1'],
      requiredConstructs: ['bit_syntax', 'guards'],
    },`,
    new: `    astRules: {
      requireTailRecursion: [],
      forbiddenCalls: [],
      requiredCalls: ['erlang:byte_size/1'],
      requiredConstructs: ['bit_syntax', 'guards'],
    },`,
    desc: 'ch10-l02'
  },
  {
    old: `    astRules: {
      requireTailRecursion: [],
      forbiddenCalls: [],
      requiredCalls: ['inet:setopts/2', 'gen_tcp:send/2'],
      requiredConstructs: ['record'],
    },`,
    new: `    astRules: {
      requireTailRecursion: [],
      forbiddenCalls: [],
      requiredCalls: ['inet:setopts/2', 'gen_tcp:send/2'],
      requiredConstructs: ['record_def'],
    },`,
    desc: 'ch10-l03'
  },
  {
    old: `    astRules: {
      requireTailRecursion: ['extract_lines/2'],
      forbiddenCalls: [],
      requiredCalls: ['binary:split/2', 'binary:copy/1'],
      requiredConstructs: ['bit_syntax', 'case'],
    },`,
    new: `    astRules: {
      requireTailRecursion: ['extract_lines/2'],
      forbiddenCalls: [],
      requiredCalls: ['binary:split/2', 'binary:copy/1'],
      requiredConstructs: ['bit_syntax'],
    },`,
    desc: 'ch10-l04'
  },
  {
    old: `    astRules: {
      requireTailRecursion: ['manager_loop/3', 'pool_worker_loop/2'],
      forbiddenCalls: [],
      requiredCalls: ['gen_tcp:controlling_process/2', 'gen_tcp:listen/2', 'gen_tcp:accept/1'],
      requiredConstructs: ['receive', 'spawn_link'],
    },`,
    new: `    astRules: {
      requireTailRecursion: ['manager_loop/3', 'pool_worker_loop/2'],
      forbiddenCalls: [],
      requiredCalls: ['gen_tcp:controlling_process/2', 'gen_tcp:listen/2', 'gen_tcp:accept/1'],
      requiredConstructs: ['receive_after'],
    },`,
    desc: 'ch10-l05'
  },
  {
    old: `    astRules: {
      requireTailRecursion: ['extract_lines/2'],
      forbiddenCalls: [],
      requiredCalls: ['binary:split/2', 'binary:copy/1'],
      requiredConstructs: ['bit_syntax', 'case'],
    },`,
    new: `    astRules: {
      requireTailRecursion: ['extract_lines/2'],
      forbiddenCalls: [],
      requiredCalls: ['binary:split/2', 'binary:copy/1'],
      requiredConstructs: ['bit_syntax'],
    },`,
    desc: 'ch10-l06'
  },
  {
    old: `    astRules: {
      requireTailRecursion: ['accept_loop/2', 'worker_loop/3', 'extract_lines/2'],
      forbiddenCalls: [],
      requiredCalls: ['inet:setopts/2', 'gen_tcp:send/2', 'ets:insert/2', 'ets:lookup/2'],
      requiredConstructs: ['case', 'receive', 'bit_syntax'],
    },`,
    new: `    astRules: {
      requireTailRecursion: ['accept_loop/2', 'worker_loop/3', 'extract_lines/2'],
      forbiddenCalls: [],
      requiredCalls: ['inet:setopts/2', 'gen_tcp:send/2', 'ets:insert/2', 'ets:lookup/2'],
      requiredConstructs: ['bit_syntax'],
    },`,
    desc: 'ch10-l07'
  }
];

for (const { old, new: n, desc } of astFixes) {
  if (ch10.includes(old)) {
    ch10 = ch10.replace(old, n);
    console.log(`  ✓ Fixed astRules in ${desc}`);
  }
}

// Catch 5: Fix unescaped \\r\\n in ch10-l04 and ch10-l07
ch10 = ch10.replaceAll('case binary:split(Buffer, <<"\r\n">>) of', 'case binary:split(Buffer, <<"\\\\r\\\\n">>) of');
ch10 = ch10.replaceAll('<<"+PONG\r\n">>;', '<<"+PONG\\\\r\\\\n">>;');
ch10 = ch10.replaceAll('<<"+OK\r\n">>;', '<<"+OK\\\\r\\\\n">>;');
ch10 = ch10.replaceAll('<<"$", Value/binary, "\r\n">>;', '<<"$", Value/binary, "\\\\r\\\\n">>;');
ch10 = ch10.replaceAll('<<"$-1\r\n">>', '<<"$-1\\\\r\\\\n">>');
ch10 = ch10.replaceAll('<<":1\r\n">>;', '<<":1\\\\r\\\\n">>;');
ch10 = ch10.replaceAll('<<":0\r\n">>', '<<":0\\\\r\\\\n">>');
ch10 = ch10.replaceAll('<<"-ERR unknown command\r\n">>;', '<<"-ERR unknown command\\\\r\\\\n">>;');
ch10 = ch10.replaceAll(
  "expectedOutput: '{<<\"+OK\\r\\n\">>,<<\"$val1\\r\\n\">>,<<\":1\\r\\n\">>,<<\"$-1\\r\\n\">>}',",
  "expectedOutput: '{<<\"+OK\\\\r\\\\n\">>,<<\"$val1\\\\r\\\\n\">>,<<\":1\\\\r\\\\n\">>,<<\"$-1\\\\r\\\\n\">>}',"
);
console.log('  ✓ Fixed unescaped \\\\r\\\\n in ch10-l04 and ch10-l07');

// Multi-file normalization for ch10-l01..ch10-l07
const ch10Mods = [
  { id: 'ch10-l01', mod: 'tcp_live_demo' },
  { id: 'ch10-l02', mod: 'tcp_socket_opts' },
  { id: 'ch10-l03', mod: 'tcp_flow_worker' },
  { id: 'ch10-l04', mod: 'tcp_frame_buffer' },
  { id: 'ch10-l05', mod: 'tcp_acceptor_pool' },
  { id: 'ch10-l06', mod: 'incident_tcp_active_true' },
  { id: 'ch10-l07', mod: 'tcp_kv_backend' },
];

for (const { id, mod } of ch10Mods) {
  const lessonIdx = ch10.indexOf(`id: '${id}'`);
  const nextLessonIdx = ch10.indexOf(`id: 'ch10-l0`, lessonIdx + 10);
  const chunk = nextLessonIdx === -1 ? ch10.slice(lessonIdx) : ch10.slice(lessonIdx, nextLessonIdx);

  if (!chunk.includes('files: [')) {
    const starterMarker = `starterCode: \`-module(${mod}).`;
    const starterIdx = chunk.indexOf(starterMarker);
    const solutionMarker = `solutionCode: \`-module(${mod}).`;
    const solutionIdx = chunk.indexOf(solutionMarker);
    const expMarker = "solutionExplanation: ";
    const expIdx = chunk.indexOf(expMarker);

    if (starterIdx === -1 || solutionIdx === -1 || expIdx === -1) {
      throw new Error(`Failed to locate markers for ${id} (mod=${mod})`);
    }

    const starterCodeStr = chunk.slice(starterIdx + "starterCode: ".length, solutionIdx).trim();
    const cleanStarter = starterCodeStr.endsWith(',') ? starterCodeStr.slice(0, -1) : starterCodeStr;

    const solCodeStr = chunk.slice(solutionIdx + "solutionCode: ".length, expIdx).trim();
    const cleanSol = solCodeStr.endsWith(',') ? solCodeStr.slice(0, -1) : solCodeStr;

    const filesBlock = `    files: [
      {
        name: '${mod}.erl',
        path: 'src/${mod}.erl',
        content: ${cleanStarter},
      },
    ],
    solutionFiles: {
      'src/${mod}.erl': ${cleanSol},
    },
`;

    const targetPos = lessonIdx + expIdx;
    ch10 = ch10.slice(0, targetPos) + filesBlock + ch10.slice(targetPos);
    console.log(`  ✓ Added files & solutionFiles to ${id}`);
  }
}

fs.writeFileSync(ch10Path, ch10);
console.log('Chapter 10 successfully patched and saved.');

