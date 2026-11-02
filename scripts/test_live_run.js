const http = require('http');

const code = `-module(monitor_hygiene).
-export([call_with_clean_mailbox/2, count_lingering_downs/0]).

call_with_clean_mailbox(WorkerFun, Input) when is_function(WorkerFun, 1) ->
    Caller = self(),
    {WorkerPid, MRef} = spawn_monitor(fun() ->
        Res = WorkerFun(Input),
        Caller ! {done, self(), Res},
        exit(worker_completed)
    end),
    timer:sleep(10),
    receive
        {done, WorkerPid, Result} ->
            erlang:demonitor(MRef, [flush]),
            Lingering = count_lingering_downs(),
            {ok, Result, Lingering}
    after 1000 ->
        erlang:demonitor(MRef, [flush]),
        {error, timeout}
    end.

count_lingering_downs() ->
    drain_downs(0).

drain_downs(Count) ->
    receive
        {'DOWN', _Ref, process, _Pid, _Reason} ->
            drain_downs(Count + 1)
    after 0 ->
        Count
    end.
`;

const payload = JSON.stringify({
  exercise_id: 'ch06-l07',
  session_id: 'live-test-session',
  files: {
    'src/monitor_hygiene.erl': code
  },
  visible_tests: [
    {
      id: 'tc-ch06-07-1',
      title: 'Zero Lingering DOWN Messages With [flush]',
      erlang_call: 'monitor_hygiene:call_with_clean_mailbox(fun(X) -> X * 2 end, 21)',
      expected_output: '{ok, 42, 0}'
    }
  ]
});

function post(endpoint) {
  return new Promise((resolve, reject) => {
    const req = http.request({
      hostname: 'localhost',
      port: 8080,
      path: endpoint,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      }
    }, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          console.error('Non-JSON response:', data);
          reject(e);
        }
      });
    });
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

async function main() {
  console.log('1. Testing POST /api/v1/run for ch06-l07...');
  const runRes = await post('/api/v1/run');
  console.log('   Status:', runRes.status);
  console.log('   Compiled:', runRes.compiled);
  console.log('   Tests:', runRes.visible_tests);

  console.log('\n2. Testing POST /api/v1/verify for ch06-l07...');
  const verifyRes = await post('/api/v1/verify');
  console.log('   Verdict:', verifyRes.verdict);
  console.log('   Score:', verifyRes.score);
  console.log('   Stages:', verifyRes.stages ? verifyRes.stages.map(s => `${s.id}: ${s.status}`) : 'none');
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
