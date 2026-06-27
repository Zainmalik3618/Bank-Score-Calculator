import React from 'react';
import { createRoot } from 'react-dom/client';
import { Plus, RotateCcw, Save, Trash2, Trophy, Undo2, Users } from 'lucide-react';
import './styles.css';

const STORAGE_KEY = 'bank-score-calculator-state';
const LIMIT = 500;
const SCORE_TYPES = [
  { value: 'single', label: 'Single', multiplier: 1, bonus: 0 },
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

function getTotals(players, rounds) {
  return players.reduce((totals, player) => {
    totals[player.id] = rounds.reduce((sum, round) => sum + Number(round.scores[player.id] || 0), 0);
    return totals;
  }, {});
}

function getActivePlayers(players, totals) {
  return players.filter((player) => totals[player.id] < LIMIT);
}

function formatScoreCalculation(round, playerId) {
  if (!round.scoreType || !round.enteredScores) return String(round.scores[playerId] ?? 0);

  const enteredScore = Number(round.enteredScores[playerId] || 0);
  const type = SCORE_TYPES.find((item) => item.value === round.scoreType);
  if (!type) return String(round.scores[playerId] ?? 0);

  const parts = [String(enteredScore)];
  if (type.multiplier === 2) parts.push('× 2');
  if (type.bonus) parts.push(`+ ${type.bonus}`);
  return `${parts.join(' ')} = ${round.scores[playerId] ?? 0}`;
}

function App() {
  const [state, setState] = useStoredState();
  const [setupNames, setSetupNames] = React.useState(['', '', '']);
  const [scoreDraft, setScoreDraft] = React.useState({});
  const [scoreType, setScoreType] = React.useState('');
  const [editingRoundId, setEditingRoundId] = React.useState(null);
  const [editDraft, setEditDraft] = React.useState({});

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
    setSetupNames((names) => [...names, '']);
  }

  function removeSetupPlayer(index) {
    setSetupNames((names) => names.filter((_, itemIndex) => itemIndex !== index));
  }

  function updateSetupName(index, value) {
    setSetupNames((names) => names.map((name, itemIndex) => (itemIndex === index ? value : name)));
  }

  function startGame(event) {
    event.preventDefault();
    const names = setupNames.map((name) => name.trim()).filter(Boolean);
    if (names.length < 2) return;
    setState({
      players: names.map((name) => ({ id: uid(), name })),
      rounds: [],
    });
    setScoreDraft({});
  }

  function addRound(event) {
    event.preventDefault();
    if (!activePlayers.length || !scoreType) return;

    const scores = {};
    const enteredScores = {};
    const selectedType = SCORE_TYPES.find((type) => type.value === scoreType);
    activePlayers.forEach((player) => {
      const enteredScore = Number(scoreDraft[player.id] || 0);
      enteredScores[player.id] = enteredScore;
      scores[player.id] = enteredScore * selectedType.multiplier + selectedType.bonus;
    });

    setState((current) => ({
      ...current,
      rounds: [{ id: uid(), createdAt: new Date().toISOString(), scoreType, enteredScores, scores }, ...current.rounds],
    }));
    setScoreDraft({});
    setScoreType('');
  }

  function beginEdit(round) {
    const draft = {};
    state.players.forEach((player) => {
      draft[player.id] = round.enteredScores?.[player.id] ?? round.scores[player.id] ?? '';
    });
    setEditingRoundId(round.id);
    setEditDraft(draft);
  }

  function saveEdit(roundId) {
    setState((current) => ({
      ...current,
      rounds: current.rounds.map((round) => {
        if (round.id !== roundId) return round;
        const scores = {};
        const enteredScores = {};
        const type = SCORE_TYPES.find((item) => item.value === round.scoreType);
        current.players.forEach((player) => {
          const enteredScore = Number(editDraft[player.id] || 0);
          enteredScores[player.id] = enteredScore;
          scores[player.id] = type
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
    setSetupNames(['', '', '']);
    setScoreDraft({});
    setEditingRoundId(null);
  }

  function newGameSamePlayers() {
    setState((current) => ({ ...current, rounds: [] }));
    setScoreDraft({});
    setEditingRoundId(null);
  }

  if (!state.players.length) {
    return (
      <main className="shell setup-shell">
        <section className="setup-panel">
          <div className="brand-row">
            <div className="brand-mark">
              <Trophy size={26} aria-hidden="true" />
            </div>
            <div>
              <p className="eyebrow">Bank</p>
              <h1>Score Calculator</h1>
            </div>
          </div>

          <form className="setup-form" onSubmit={startGame}>
            <div className="form-heading">
              <Users size={22} aria-hidden="true" />
              <h2>Players</h2>
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
                      placeholder={`Name ${index + 1}`}
                    />
                    {setupNames.length > 2 && (
                      <button type="button" className="icon-button danger" onClick={() => removeSetupPlayer(index)} aria-label="Remove player">
                        <Trash2 size={18} aria-hidden="true" />
                      </button>
                    )}
                  </div>
                </label>
              ))}
            </div>

            <div className="setup-actions">
              <button type="button" className="secondary-button" onClick={addSetupPlayer}>
                <Plus size={18} aria-hidden="true" />
                Add player
              </button>
              <button type="submit" className="primary-button" disabled={setupNames.filter((name) => name.trim()).length < 2}>
                Start game
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
        <div>
          <p className="eyebrow">Bank</p>
          <h1>Score Calculator</h1>
        </div>
        <div className="header-actions">
          <button className="secondary-button compact" onClick={newGameSamePlayers}>
            <RotateCcw size={18} aria-hidden="true" />
            New round set
          </button>
          <button className="secondary-button compact danger-text" onClick={clearData}>
            <Trash2 size={18} aria-hidden="true" />
            Clear data
          </button>
        </div>
      </header>

      {winner && (
        <section className="winner-band">
          <Trophy size={24} aria-hidden="true" />
          <strong>{winner.name} wins</strong>
          <span>All other players reached {LIMIT}.</span>
        </section>
      )}

      <section className="scoreboard" aria-label="Scoreboard">
        {state.players.map((player) => {
          const total = totals[player.id] || 0;
          const eliminated = total >= LIMIT;
          return (
            <article className={`player-card ${eliminated ? 'eliminated' : ''}`} key={player.id}>
              <div>
                <h2>{player.name}</h2>
                <p>{eliminated ? 'Eliminated' : `${LIMIT - total} points left`}</p>
              </div>
              <strong>{total}</strong>
            </article>
          );
        })}
      </section>

      <section className="work-grid">
        <form className="entry-panel" onSubmit={addRound}>
          <div className="section-title">
            <Plus size={20} aria-hidden="true" />
            <h2>Add scores</h2>
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
                    onChange={(event) => setScoreType(event.target.value)}
                  />
                  <span>{type.label}</span>
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
                  value={scoreDraft[player.id] ?? ''}
                  onChange={(event) => setScoreDraft((draft) => ({ ...draft, [player.id]: event.target.value }))}
                  placeholder="0"
                />
              </label>
            ))}
          </div>
          <button className="primary-button full-width" disabled={!activePlayers.length || !scoreType || Boolean(winner)}>
            Save scores
          </button>
        </form>

        <section className="history-panel">
          <div className="section-title">
            <Undo2 size={20} aria-hidden="true" />
            <h2>Score history</h2>
          </div>

          {state.rounds.length === 0 ? (
            <div className="empty-state">No scores added yet.</div>
          ) : (
            <div className="history-list">
              {state.rounds.map((round, index) => {
                const isEditing = editingRoundId === round.id;
                return (
                  <article className="history-item" key={round.id}>
                    <div className="history-top">
                      <strong>Entry {state.rounds.length - index}</strong>
                      <div className="history-actions">
                        {isEditing ? (
                          <button className="icon-button success" type="button" onClick={() => saveEdit(round.id)} aria-label="Save edited score">
                            <Save size={17} aria-hidden="true" />
                          </button>
                        ) : (
                          <button className="icon-button" type="button" onClick={() => beginEdit(round)} aria-label="Edit score entry">
                            <Undo2 size={17} aria-hidden="true" />
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
                              value={editDraft[player.id] ?? ''}
                              onChange={(event) => setEditDraft((draft) => ({ ...draft, [player.id]: event.target.value }))}
                            />
                          ) : (
                            <b>{formatScoreCalculation(round, player.id)}</b>
                          )}
                        </label>
                      ))}
                    </div>
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
