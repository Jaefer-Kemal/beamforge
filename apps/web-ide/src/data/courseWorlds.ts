/**
 * Course Worlds Definition for BeamForge
 * Groups the 12 Boot.dev Curriculum Chapters into 5 Thematic Progressive Worlds.
 */

export interface CourseWorld {
  id: string;
  worldNumber: number;
  title: string;
  subtitle: string;
  description: string;
  accentColor: string;
  gradient: string;
  iconName: 'Binary' | 'GitFork' | 'ShieldCheck' | 'Radio' | 'Globe';
  rankReward: string;
  chapterNumbers: number[];
}

export const COURSE_WORLDS: CourseWorld[] = [
  {
    id: 'world-1-functional-core',
    worldNumber: 1,
    title: 'The Functional Core & Term Anatomy',
    subtitle: 'Immutable Terms, Tail-Call Optimization & Binary Wire Protocol Craft',
    description:
      'Master pattern matching, accumulator loops, bit syntax packing, and sub-binary memory leak prevention directly on the BEAM heap.',
    accentColor: '#10B981',
    gradient: 'from-emerald-500 to-teal-400',
    iconName: 'Binary',
    rankReward: 'Functional Craftsman',
    chapterNumbers: [1, 2, 3, 4],
  },
  {
    id: 'world-2-actor-concurrency',
    worldNumber: 2,
    title: 'The Actor Model & "Let It Crash"',
    subtitle: 'Isolated Processes, Asynchronous Message Passing, Links & Monitors',
    description:
      'Spawn tens of thousands of isolated BEAM processes, master selective receive mailboxes, bidirectional links, and monitor DOWN signals.',
    accentColor: '#6366F1',
    gradient: 'from-indigo-600 to-blue-500',
    iconName: 'GitFork',
    rankReward: 'Concurrency Artisan',
    chapterNumbers: [5, 6],
  },
  {
    id: 'world-3-production-otp',
    worldNumber: 3,
    title: 'Production OTP Architecture',
    subtitle: 'gen_server, Supervision Trees & Shared ETS Tables',
    description:
      'Architect industrial-grade OTP systems: call/cast contracts, one_for_one supervision restart strategies, and crash-resilient ETS tables.',
    accentColor: '#8B5CF6',
    gradient: 'from-violet-600 to-purple-500',
    iconName: 'ShieldCheck',
    rankReward: 'OTP Systems Architect',
    chapterNumbers: [7, 8, 9],
  },
  {
    id: 'world-4-tcp-networking',
    worldNumber: 4,
    title: 'Raw TCP & Protocol Engineering',
    subtitle: 'Non-Blocking Sockets, Acceptor Pools & Live XMPP Wire Framing',
    description:
      'Build high-throughput TCP socket listeners, handle packet fragmentation, backpressure flow control, and stream XML stanzas.',
    accentColor: '#007AFF',
    gradient: 'from-sky-600 to-cyan-500',
    iconName: 'Radio',
    rankReward: 'Network Systems Engineer',
    chapterNumbers: [10, 11],
  },
  {
    id: 'world-5-xmpp-capstone',
    worldNumber: 5,
    title: 'The Distributed XMPP Capstone Engine',
    subtitle: 'Production Real-Time Chat Server Built from Scratch',
    description:
      'Unify parser, session ETS, connection state machines, router, and supervisor tree into a battle-tested distributed XMPP telecom engine.',
    accentColor: '#F59E0B',
    gradient: 'from-amber-500 to-orange-500',
    iconName: 'Globe',
    rankReward: 'BEAM Grandmaster',
    chapterNumbers: [12],
  },
];
