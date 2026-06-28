import React from 'react';
import { createRoot } from 'react-dom/client';
import {
  ArrowRight, Check, Edit3, History, Infinity as InfinityIcon, Plus, RotateCcw, Save,
  Trash2, Trophy, UserRoundPlus, Users, X,
} from 'lucide-react';
import './styles.css';

const STORAGE_KEY = 'bank-score-calculator-state';
const LIMIT = 500;
const MIN_PLAYERS = 2;
const MAX_PLAYERS = 4;
const SCORE_TYPES = [
  { value: 'single', label: 'Single', multiplier: 1, bonus: 0 },
  { value: 'single-50', label: 'Single 50', multiplier: 1, bonus: 50 },
  { value: 'single-100', label: 'Single 100', multiplier: 1, bonus: 100 },
  { value: 'double', label: 'Double', multiplier: 2, bonus: 0 },
  { value: 'double-50', label: 'Double 50', multiplier: 2, bonus: 50 },
  { value: 'double-75', label: 'Double 75', multiplier: 2, bonus: 75 },
  { value: 'double-100', label: 'Double 100', multiplier: 2, bonus: 100 },
];

const defaultState = {
  players: [],
  rounds: [],
};

function loadState() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : defaultState;
  } catch {
    return defaultState;
  }
}

function useStoredState() {
  const [state, setState] = React.useState(loadState);

  React.useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  return [state, setState];
}

function uid() {
  return crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
}

function CardGameIcon({ size = 18 }) {
  return (
    <svg
      className="card-game-icon"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <rect x="3.5" y="5.5" width="11" height="15" rx="2.2" transform="rotate(-12 3.5 5.5)" stroke="currentColor" strokeWidth="1.8" />
      <path d="M7.1 9.1c.8-.9 2.2-.8 2.8.2.2.3.3.6.3.9.3-.1.7-.1 1 .1 1.1.4 1.5 1.8.8 2.7-.9 1.2-2.7.8-3.4-.2-.3 1-.2 1.8.2 2.4" stroke="currentColor" strokeWidth="1.45" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="10" y="3" width="10.5" height="15" rx="2.2" fill="#176b52" stroke="currentColor" strokeWidth="1.8" />
      <path d="M15.25 7.1c-1.2 1.4-2.35 2.25-2.35 3.55a2.35 2.35 0 0 0 4.7 0c0-1.3-1.15-2.15-2.35-3.55Z" fill="currentColor" />
      <path d="M15.25 12.65v2.05m-1.2 0h2.4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}

function getTotals(players, rounds) {
  return players.reduce((totals, player) => {
    totals[player.id] = rounds.reduce((sum, round) => sum + Number(round.scores[player.id] || 0), 0);
    return totals;
  }, {});
}

function getActivePlayers(players, totals) {
  return players.filter((player) => totals[player.id] < LIMIT);
}

function parseScore(value) {
  if (value === '' || value === null || value === undefined) return null;
  const score = Number(value);
  return Number.isFinite(score) && score >= 0 && score <= 130 ? score : undefined;
}

function formatScoreCalculation(round, playerId) {
  if (!round.scoreType || !round.enteredScores) return String(round.scores[playerId] ?? 0);

  const enteredScore = round.enteredScores[playerId];
  if (enteredScore === null || enteredScore === undefined || enteredScore === '') return 'Won';
  const type = SCORE_TYPES.find((item) => item.value === round.scoreType);
  if (!type) return String(round.scores[playerId] ?? 0);

  const parts = [String(enteredScore)];
  if (type.multiplier === 2) parts.push('× 2');
  if (type.bonus) parts.push(`+ ${type.bonus}`);
  return `${parts.join(' ')} = ${round.scores[playerId] ?? 0}`;
}

function App() {
  const [state, setState] = useStoredState();
  const [setupNames, setSetupNames] = React.useState(['', '']);
  const [scoreDraft, setScoreDraft] = React.useState({});
  const [scoreType, setScoreType] = React.useState('');
  const [editingRoundId, setEditingRoundId] = React.useState(null);
  const [editDraft, setEditDraft] = React.useState({});
  const [setupError, setSetupError] = React.useState('');
  const [scoreError, setScoreError] = React.useState('');

  const totals = React.useMemo(() => getTotals(state.players, state.rounds), [state.players, state.rounds]);
  const activePlayers = React.useMemo(() => getActivePlayers(state.players, totals), [state.players, totals]);
  const eliminatedPlayers = state.players.filter((player) => totals[player.id] >= LIMIT);
  const winner = state.players.length > 1 && activePlayers.length === 1 ? activePlayers[0] : null;

  React.useEffect(() => {
    const nextDraft = {};
    activePlayers.forEach((player) => {
      nextDraft[player.id] = scoreDraft[player.id] ?? '';
    });
    setScoreDraft(nextDraft);
  }, [activePlayers.length]);

  function addSetupPlayer() {
    setSetupNames((names) => (names.length < MAX_PLAYERS ? [...names, ''] : names));
  }

  function removeSetupPlayer(index) {
    setSetupNames((names) => names.filter((_, itemIndex) => itemIndex !== index));
  }

  function updateSetupName(index, value) {
    setSetupNames((names) => names.map((name, itemIndex) => (itemIndex === index ? value : name)));
    setSetupError('');
  }

  function startGame(event) {
    event.preventDefault();
    const names = setupNames.map((name) => name.trim()).filter(Boolean);
    if (names.length < MIN_PLAYERS || names.length > MAX_PLAYERS) {
      setSetupError('Add at least two player names to continue.');
      return;
    }
    if (new Set(names.map((name) => name.toLowerCase())).size !== names.length) {
      setSetupError('Each player needs a unique name.');
      return;
    }
    setState({
      players: names.map((name) => ({ id: uid(), name })),
      rounds: [],
    });
    setScoreDraft({});
  }

  function addRound(event) {
    event.preventDefault();
    if (!activePlayers.length || !scoreType) {
      setScoreError('Choose a score type before saving.');
      return;
    }

    const scores = {};
    const enteredScores = {};
    const selectedType = SCORE_TYPES.find((type) => type.value === scoreType);
    const parsedScores = activePlayers.map((player) => [player.id, parseScore(scoreDraft[player.id])]);
    if (parsedScores.some(([, score]) => score === undefined)) {
      setScoreError('Scores must be between 0 and 130. Leave the winner blank.');
      return;
    }
    parsedScores.forEach(([playerId, enteredScore]) => {
      enteredScores[playerId] = enteredScore;
      scores[playerId] = enteredScore === null
        ? 0
        : enteredScore * selectedType.multiplier + selectedType.bonus;
    });

    setState((current) => ({
      ...current,
      rounds: [{ id: uid(), createdAt: new Date().toISOString(), scoreType, enteredScores, scores }, ...current.rounds],
    }));
    setScoreDraft({});
    setScoreType('');
    setScoreError('');
  }

  function beginEdit(round) {
    const draft = {};
    state.players.forEach((player) => {
      const hasEnteredScore = round.enteredScores
        && Object.prototype.hasOwnProperty.call(round.enteredScores, player.id);
      const enteredScore = hasEnteredScore ? round.enteredScores[player.id] : round.scores[player.id];
      draft[player.id] = enteredScore === null || enteredScore === undefined ? '' : enteredScore;
    });
    setEditingRoundId(round.id);
    setEditDraft(draft);
  }

  function saveEdit(roundId) {
    const parsedScores = state.players.map((player) => [player.id, parseScore(editDraft[player.id])]);
    if (parsedScores.some(([, score]) => score === undefined)) return;
    setState((current) => ({
      ...current,
      rounds: current.rounds.map((round) => {
        if (round.id !== roundId) return round;
        const scores = {};
        const enteredScores = {};
        const type = SCORE_TYPES.find((item) => item.value === round.scoreType);
        parsedScores.forEach(([playerId, enteredScore]) => {
          enteredScores[playerId] = enteredScore;
          scores[playerId] = enteredScore === null
            ? 0
            : type
            ? enteredScore * type.multiplier + type.bonus
            : enteredScore;
        });
        return { ...round, enteredScores: type ? enteredScores : round.enteredScores, scores };
      }),
    }));
    setEditingRoundId(null);
    setEditDraft({});
  }

  function deleteRound(roundId) {
    setState((current) => ({
      ...current,
      rounds: current.rounds.filter((round) => round.id !== roundId),
    }));
  }

  function clearData() {
    const confirmed = window.confirm('Clear all saved players and scores?');
    if (!confirmed) return;
    localStorage.removeItem(STORAGE_KEY);
    setState(defaultState);
    setSetupNames(['', '']);
    setScoreDraft({});
    setEditingRoundId(null);
  }

  function newGameSamePlayers() {
    setState((current) => ({ ...current, rounds: [] }));
    setScoreDraft({});
    setEditingRoundId(null);
  }

  const canStart = setupNames.filter((name) => name.trim()).length >= MIN_PLAYERS;

  if (!state.players.length) {
    return (
      <main className="shell setup-shell">
        <section className="setup-panel">
          <div className="setup-intro">
            <div className="brand-chip"><CardGameIcon size={19} /> Bank scorekeeper</div>
            <div>
              <h1>Keep score.<br /><span>Stay in the game.</span></h1>
              <p>A fast, hassle-free scorekeeper for 2–4 players. First to 500 is out; last player standing wins.</p>
            </div>
            <div className="setup-rules" aria-label="Game overview">
              <div><strong>2–4</strong><span>players</span></div>
              <div><strong>500</strong><span>point limit</span></div>
              <div><strong className="infinity-value"><InfinityIcon size={23} strokeWidth={2.4} aria-hidden="true" /></strong><span>good times</span></div>
            </div>
          </div>

          <form className="setup-form" onSubmit={startGame}>
            <div className="form-heading">
              <div className="title-icon"><Users size={20} aria-hidden="true" /></div>
              <div><p className="eyebrow">New game</p><h2>Who’s playing?</h2></div>
            </div>

            <div className="player-list">
              {setupNames.map((name, index) => (
                <label className="name-field" key={index}>
                  <span>Player {index + 1}</span>
                  <div>
                    <input
                      type="text"
                      value={name}
                      onChange={(event) => updateSetupName(index, event.target.value)}
                      placeholder="Enter a name"
                      maxLength="24"
                      autoFocus={index === 0}
                    />
                    {setupNames.length > MIN_PLAYERS && (
                      <button type="button" className="icon-button danger" onClick={() => removeSetupPlayer(index)} aria-label="Remove player">
                        <Trash2 size={18} aria-hidden="true" />
                      </button>
                    )}
                  </div>
                </label>
              ))}
            </div>

            {setupError && <p className="form-error" role="alert">{setupError}</p>}

            <div className="setup-actions">
              <button
                type="button"
                className="secondary-button"
                onClick={addSetupPlayer}
                disabled={setupNames.length >= MAX_PLAYERS}
              >
                <UserRoundPlus size={18} aria-hidden="true" />
                Add another
              </button>
              <button
                type="submit"
                className="primary-button"
                disabled={!canStart}
              >
                Start game <ArrowRight size={18} aria-hidden="true" />
              </button>
            </div>
          </form>
        </section>
      </main>
    );
  }

  return (
    <main className="shell">
      <header className="app-header">
        <div className="app-brand">
          <div className="brand-mark"><Trophy size={21} aria-hidden="true" /></div>
          <div><p className="eyebrow">Live game</p><h1>Bank</h1></div>
        </div>
        <div className="header-actions">
          <button className="secondary-button compact restart-action" onClick={newGameSamePlayers} title="Restart game" aria-label="Restart game">
            <RotateCcw size={18} aria-hidden="true" />
            Restart game
          </button>
          <button className="secondary-button compact danger-text clear-action" onClick={clearData} title="Clear all data" aria-label="Clear all data">
            <Trash2 size={18} aria-hidden="true" />
            Clear data
          </button>
        </div>
      </header>

      {winner && (
        <section className="winner-band">
          <div className="winner-icon"><Trophy size={26} aria-hidden="true" /></div>
          <div><p>We have a winner</p><strong>{winner.name} takes the game!</strong><span> Everyone else reached {LIMIT} points.</span></div>
        </section>
      )}

      <div className="content-heading">
        <div><p className="eyebrow">Scoreboard</p><h2>Game overview</h2></div>
        <span>{state.rounds.length} {state.rounds.length === 1 ? 'entry' : 'entries'} played</span>
      </div>

      <section className="scoreboard" aria-label="Scoreboard">
        {state.players.map((player) => {
          const total = totals[player.id] || 0;
          const eliminated = total >= LIMIT;
          const progress = Math.min(total / LIMIT, 1);
          const progressLevel = progress >= 0.9
            ? 'critical'
            : progress >= 0.7
              ? 'high'
              : progress >= 0.4
                ? 'medium'
                : 'safe';
          return (
            <article className={`player-card ${eliminated ? 'eliminated' : ''}`} key={player.id}>
              <div className="player-card-top">
                <div className="player-avatar">{player.name.charAt(0).toUpperCase()}</div>
                <span className="status-pill">{eliminated ? 'Out' : 'Playing'}</span>
              </div>
              <div className="player-score"><h3>{player.name}</h3><strong>{total}</strong><span>/ {LIMIT}</span></div>
              <div className={`progress-track ${progressLevel}`}>
                <span style={{ width: `${progress * 100}%` }} />
              </div>
              <p>{eliminated ? 'Reached the limit' : `${LIMIT - total} points until elimination`}</p>
            </article>
          );
        })}
      </section>

      <section className="work-grid">
        <form className="entry-panel" onSubmit={addRound}>
          <div className="section-title">
            <div className="title-icon accent"><Plus size={20} aria-hidden="true" /></div>
            <div><p className="eyebrow">Next entry</p><h2>Add scores</h2></div>
          </div>
          <fieldset className="score-types">
            <legend>Score type</legend>
            <div className="score-type-options">
              {SCORE_TYPES.map((type) => (
                <label className="score-type-option" key={type.value}>
                  <input
                    type="radio"
                    name="score-type"
                    value={type.value}
                    checked={scoreType === type.value}
                    required
                    onChange={(event) => {
                      setScoreType(event.target.value);
                      setScoreError('');
                    }}
                  />
                  <span>{type.label}<small>{type.multiplier === 2 ? '2× score' : 'Base score'}{type.bonus ? ` + ${type.bonus}` : ''}</small></span>
                </label>
              ))}
            </div>
          </fieldset>
          <div className="score-inputs">
            {activePlayers.map((player) => (
              <label className="score-field" key={player.id}>
                <span>{player.name}</span>
                <input
                  type="number"
                  inputMode="numeric"
                  min="0"
                  max="130"
                  value={scoreDraft[player.id] ?? ''}
                  onChange={(event) => {
                    setScoreDraft((draft) => ({ ...draft, [player.id]: event.target.value }));
                    setScoreError('');
                  }}
                  placeholder="0"
                  aria-describedby={`score-help-${player.id}`}
                />
                <small id={`score-help-${player.id}`}>Leave blank if they won</small>
              </label>
            ))}
          </div>
          {scoreError && <p className="form-error" role="alert">{scoreError}</p>}
          <button className="primary-button full-width" disabled={!activePlayers.length || !scoreType || Boolean(winner)}>
            <Check size={18} /> Save entry
          </button>
        </form>

        <section className="history-panel">
          <div className="section-title">
            <div className="title-icon"><History size={20} aria-hidden="true" /></div>
            <div><p className="eyebrow">Timeline</p><h2>Score history</h2></div>
          </div>

          {state.rounds.length === 0 ? (
            <div className="empty-state"><History size={26} /><strong>No entries yet</strong><span>Your saved scores will appear here.</span></div>
          ) : (
            <div className="history-list">
              {state.rounds.map((round, index) => {
                const isEditing = editingRoundId === round.id;
                return (
                  <article className="history-item" key={round.id}>
                    <div className="history-top">
                      <div><strong>Entry {state.rounds.length - index}</strong><span>{SCORE_TYPES.find((type) => type.value === round.scoreType)?.label || 'Score'}</span></div>
                      <div className="history-actions">
                        {isEditing ? (
                          <button className="icon-button success" type="button" onClick={() => saveEdit(round.id)} aria-label="Save edited score">
                            <Save size={17} aria-hidden="true" />
                          </button>
                        ) : (
                          <button className="icon-button" type="button" onClick={() => beginEdit(round)} aria-label="Edit score entry">
                            <Edit3 size={17} aria-hidden="true" />
                          </button>
                        )}
                        <button className="icon-button danger" type="button" onClick={() => deleteRound(round.id)} aria-label="Delete score entry">
                          <Trash2 size={17} aria-hidden="true" />
                        </button>
                      </div>
                    </div>

                    <div className="history-scores">
                      {state.players.map((player) => (
                        <label className="mini-score" key={player.id}>
                          <span>{player.name}</span>
                          {isEditing ? (
                            <input
                              type="number"
                              inputMode="numeric"
                              min="0"
                              max="130"
                              value={editDraft[player.id] ?? ''}
                              onChange={(event) => setEditDraft((draft) => ({ ...draft, [player.id]: event.target.value }))}
                            />
                          ) : (
                            <b className={round.enteredScores?.[player.id] == null ? 'round-winner' : 'round-loser'}>
                              {formatScoreCalculation(round, player.id)}
                            </b>
                          )}
                        </label>
                      ))}
                    </div>
                    {isEditing && <button type="button" className="cancel-edit" onClick={() => setEditingRoundId(null)}><X size={15} /> Cancel editing</button>}
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </section>
    </main>
  );
}

createRoot(document.getElementById('root')).render(<App />);
