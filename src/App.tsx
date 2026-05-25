import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";

type SongPosition =
  | "Opening number"
  | "I want song"
  | "Comedy turn"
  | "Conflict duet"
  | "Eleven o'clock number"
  | "Finale";

type SongSubmission = {
  id: string;
  title: string;
  creator: string;
  collaborators: string[];
  position: SongPosition;
  mood: string;
  key: string;
  tempo: number;
  lyrics: string;
  premise: string;
  musicNotes: string[];
  createdAt: string;
};

type SongDraft = {
  title: string;
  creator: string;
  collaborators: string;
  position: SongPosition;
  mood: string;
  key: string;
  tempo: number;
  lyrics: string;
  premise: string;
  musicNote: string;
};

type CollaborationDraft = {
  songId: string;
  contributor: string;
  lyricLine: string;
  musicNote: string;
};

type MusicalScene = {
  id: string;
  heading: string;
  songTitle: string;
  byline: string;
  transition: string;
  lyrics: string;
  tempo: number;
  key: string;
};

const storageKey = "crowdsourced-musical:songs:v1";

const positions: SongPosition[] = [
  "Opening number",
  "I want song",
  "Comedy turn",
  "Conflict duet",
  "Eleven o'clock number",
  "Finale",
];

const moods = ["Hopeful", "Haunting", "Comic", "Revolutionary", "Romantic", "Triumphant"];
const keys = ["C major", "D minor", "E minor", "F major", "G major", "A minor", "Bb major"];

const seedSongs: SongSubmission[] = [
  {
    id: "seed-wake-the-city",
    title: "Wake the City",
    creator: "Maya",
    collaborators: ["Theo", "Jun"],
    position: "Opening number",
    mood: "Hopeful",
    key: "C major",
    tempo: 124,
    lyrics:
      "Wake the city, lift the blinds\nEvery window keeps the time\nIf we sing it from the street\nEvery stranger finds the beat",
    premise: "The ensemble discovers that the city only moves when people create together.",
    musicNotes: ["Brassy piano vamp with handclaps on beats two and four."],
    createdAt: "2026-01-01T10:00:00.000Z",
  },
  {
    id: "seed-pencil-moon",
    title: "Pencil Moon",
    creator: "Rafi",
    collaborators: ["Elena"],
    position: "I want song",
    mood: "Romantic",
    key: "A minor",
    tempo: 86,
    lyrics:
      "I drew a moon in borrowed light\nA silver door above the night\nIf someone sees the shape I made\nMaybe I was not afraid",
    premise: "A quiet songwriter admits they want their fragment to matter.",
    musicNotes: ["Sparse guitar arpeggio that blooms into warm strings."],
    createdAt: "2026-01-02T14:30:00.000Z",
  },
  {
    id: "seed-committee-of-cats",
    title: "Committee of Cats",
    creator: "Priya",
    collaborators: ["Sam", "Nico"],
    position: "Comedy turn",
    mood: "Comic",
    key: "F major",
    tempo: 152,
    lyrics:
      "The cats convene at half past three\nTo judge our lack of dignity\nThey pass a law, they strike a pose\nThen nap upon the final prose",
    premise: "The town tries to crowdsource rules and accidentally elects a panel of cats.",
    musicNotes: ["Clarinet runs, pizzicato strings, and a tap break for the cats."],
    createdAt: "2026-01-03T09:20:00.000Z",
  },
  {
    id: "seed-same-bridge",
    title: "The Same Bridge",
    creator: "Ari",
    collaborators: ["Luz"],
    position: "Conflict duet",
    mood: "Haunting",
    key: "D minor",
    tempo: 96,
    lyrics:
      "You cross at dawn, I cross at night\nWe call the river wrong or right\nBut every echo underneath\nIs carrying the same belief",
    premise: "Two collaborators argue over authorship until their melodies interlock.",
    musicNotes: ["Minor-key counterpoint that resolves only when both voices overlap."],
    createdAt: "2026-01-04T18:15:00.000Z",
  },
  {
    id: "seed-build-the-sky",
    title: "Build the Sky",
    creator: "Morgan",
    collaborators: ["Noor", "Ivy"],
    position: "Eleven o'clock number",
    mood: "Revolutionary",
    key: "G major",
    tempo: 118,
    lyrics:
      "Pass the ladder, pass the line\nHold the thunder, make it rhyme\nWe are more than sparks that fly\nWe are here to build the sky",
    premise: "The crowd realizes no single author can finish the show alone.",
    musicNotes: ["Driving drums, stacked harmonies, and a rising gospel-style refrain."],
    createdAt: "2026-01-05T21:45:00.000Z",
  },
  {
    id: "seed-all-our-names",
    title: "All Our Names",
    creator: "The Commons",
    collaborators: ["Everyone"],
    position: "Finale",
    mood: "Triumphant",
    key: "Bb major",
    tempo: 132,
    lyrics:
      "Put our names upon the wall\nSmallest voices, standing tall\nWhen the curtain finds its flame\nEvery heartbeat signs its name",
    premise: "The final curtain call credits every contributor in the musical.",
    musicNotes: ["Full-company reprise that quotes every earlier theme."],
    createdAt: "2026-01-06T22:00:00.000Z",
  },
];

const initialDraft: SongDraft = {
  title: "",
  creator: "",
  collaborators: "",
  position: "I want song",
  mood: "Hopeful",
  key: "C major",
  tempo: 108,
  lyrics: "",
  premise: "",
  musicNote: "",
};

const rootFrequencies: Record<string, number> = {
  C: 261.63,
  "C#": 277.18,
  Db: 277.18,
  D: 293.66,
  Eb: 311.13,
  E: 329.63,
  F: 349.23,
  "F#": 369.99,
  Gb: 369.99,
  G: 392,
  Ab: 415.3,
  A: 440,
  Bb: 466.16,
  B: 493.88,
};

const moodIntervals: Record<string, number[]> = {
  Hopeful: [0, 4, 7, 12, 7, 4, 2, 0],
  Haunting: [0, 3, 7, 10, 7, 3, -2, 0],
  Comic: [0, 7, 5, 9, 2, 11, 4, 0],
  Revolutionary: [0, 5, 7, 12, 14, 12, 7, 0],
  Romantic: [0, 4, 7, 9, 7, 4, 5, 0],
  Triumphant: [0, 7, 12, 16, 12, 9, 7, 0],
};

function loadSongs() {
  try {
    const saved = window.localStorage.getItem(storageKey);
    if (!saved) {
      return seedSongs;
    }

    const parsed = JSON.parse(saved);
    if (!Array.isArray(parsed)) {
      return seedSongs;
    }

    return parsed as SongSubmission[];
  } catch {
    return seedSongs;
  }
}

function makeId() {
  if ("crypto" in window && "randomUUID" in window.crypto) {
    return window.crypto.randomUUID();
  }

  return `song-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function splitNames(value: string) {
  return value
    .split(",")
    .map((name) => name.trim())
    .filter(Boolean);
}

function getRootFrequency(key: string) {
  const root = key.replace(" major", "").replace(" minor", "");
  return rootFrequencies[root] ?? rootFrequencies.C;
}

function semitoneToFrequency(root: number, interval: number) {
  return root * 2 ** (interval / 12);
}

function getSongDuration(song: SongSubmission) {
  const beatMs = 60000 / song.tempo;
  return Math.max(3600, Math.round(beatMs * 8));
}

function buildScenes(songs: SongSubmission[]): MusicalScene[] {
  return songs.map((song, index) => {
    const previous = songs[index - 1];
    const next = songs[index + 1];
    const bridge = previous
      ? `The lights shift from "${previous.title}" into a ${song.mood.toLowerCase()} pulse.`
      : "The house lights fall and the crowd-sourced overture begins.";
    const exit = next
      ? `A shared motif points toward "${next.title}".`
      : "The company gathers every theme for the curtain call.";

    return {
      id: song.id,
      heading: `Scene ${index + 1}: ${song.position}`,
      songTitle: song.title,
      byline: `Submitted by ${song.creator}${
        song.collaborators.length ? ` with ${song.collaborators.join(", ")}` : ""
      }`,
      transition: `${bridge} ${song.premise} ${exit}`,
      lyrics: song.lyrics,
      tempo: song.tempo,
      key: song.key,
    };
  });
}

function scheduleSongAudio(context: AudioContext, song: SongSubmission, startAt: number, durationSeconds: number) {
  const intervals = moodIntervals[song.mood] ?? moodIntervals.Hopeful;
  const root = getRootFrequency(song.key);
  const noteLength = durationSeconds / intervals.length;
  const wave: OscillatorType = song.mood === "Comic" ? "square" : song.mood === "Haunting" ? "sine" : "triangle";

  intervals.forEach((interval, index) => {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const noteStart = startAt + index * noteLength;
    const noteEnd = noteStart + noteLength * 0.9;

    oscillator.type = wave;
    oscillator.frequency.setValueAtTime(semitoneToFrequency(root, interval), noteStart);
    gain.gain.setValueAtTime(0.0001, noteStart);
    gain.gain.exponentialRampToValueAtTime(0.16, noteStart + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.0001, noteEnd);

    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start(noteStart);
    oscillator.stop(noteEnd + 0.02);
  });
}

function App() {
  const [songs, setSongs] = useState<SongSubmission[]>(loadSongs);
  const [draft, setDraft] = useState<SongDraft>(initialDraft);
  const [collaboration, setCollaboration] = useState<CollaborationDraft>({
    songId: seedSongs[0].id,
    contributor: "",
    lyricLine: "",
    musicNote: "",
  });
  const [selectedIds, setSelectedIds] = useState<string[]>(seedSongs.map((song) => song.id));
  const [nowPlayingId, setNowPlayingId] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackProgress, setPlaybackProgress] = useState(0);
  const [message, setMessage] = useState("");
  const audioContextRef = useRef<AudioContext | null>(null);
  const timeoutRefs = useRef<number[]>([]);
  const progressIntervalRef = useRef<number | null>(null);

  const selectedSongs = useMemo(
    () =>
      selectedIds
        .map((id) => songs.find((song) => song.id === id))
        .filter((song): song is SongSubmission => Boolean(song)),
    [selectedIds, songs],
  );

  const scenes = useMemo(() => buildScenes(selectedSongs), [selectedSongs]);

  const stats = useMemo(() => {
    const contributors = new Set<string>();
    songs.forEach((song) => {
      contributors.add(song.creator);
      song.collaborators.forEach((name) => contributors.add(name));
    });

    return {
      songs: songs.length,
      contributors: contributors.size,
      minutes: Math.max(1, Math.round(songs.reduce((sum, song) => sum + getSongDuration(song), 0) / 60000)),
    };
  }, [songs]);

  const clearPlaybackTimers = useCallback(() => {
    timeoutRefs.current.forEach((timeoutId) => window.clearTimeout(timeoutId));
    timeoutRefs.current = [];

    if (progressIntervalRef.current !== null) {
      window.clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
  }, []);

  const stopPlayback = useCallback(() => {
    clearPlaybackTimers();
    if (audioContextRef.current) {
      void audioContextRef.current.close();
      audioContextRef.current = null;
    }
    setIsPlaying(false);
    setNowPlayingId(null);
    setPlaybackProgress(0);
  }, [clearPlaybackTimers]);

  useEffect(() => {
    window.localStorage.setItem(storageKey, JSON.stringify(songs));
  }, [songs]);

  useEffect(() => {
    if (!songs.some((song) => song.id === collaboration.songId) && songs[0]) {
      setCollaboration((current) => ({ ...current, songId: songs[0].id }));
    }
  }, [collaboration.songId, songs]);

  useEffect(() => () => stopPlayback(), [stopPlayback]);

  function handleCreateSong(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!draft.title.trim() || !draft.creator.trim() || !draft.lyrics.trim()) {
      setMessage("Add a title, creator, and at least one lyric before submitting.");
      return;
    }

    const newSong: SongSubmission = {
      id: makeId(),
      title: draft.title.trim(),
      creator: draft.creator.trim(),
      collaborators: splitNames(draft.collaborators),
      position: draft.position,
      mood: draft.mood,
      key: draft.key,
      tempo: draft.tempo,
      lyrics: draft.lyrics.trim(),
      premise: draft.premise.trim() || "A new community-made moment enters the story.",
      musicNotes: draft.musicNote.trim() ? [draft.musicNote.trim()] : [],
      createdAt: new Date().toISOString(),
    };

    setSongs((current) => [newSong, ...current]);
    setSelectedIds((current) => [newSong.id, ...current]);
    setCollaboration((current) => ({ ...current, songId: newSong.id }));
    setDraft(initialDraft);
    setMessage(`"${newSong.title}" joined the song pool and the stitched musical.`);
  }

  function handleAddCollaboration(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!collaboration.contributor.trim() && !collaboration.lyricLine.trim() && !collaboration.musicNote.trim()) {
      setMessage("Add a contributor, lyric, or music note before sharing a collaboration.");
      return;
    }

    const contributor = collaboration.contributor.trim();
    setSongs((current) =>
      current.map((song) => {
        if (song.id !== collaboration.songId) {
          return song;
        }

        const lyricAddition = collaboration.lyricLine.trim();
        const noteAddition = collaboration.musicNote.trim();

        return {
          ...song,
          collaborators:
            contributor && !song.collaborators.includes(contributor)
              ? [...song.collaborators, contributor]
              : song.collaborators,
          lyrics: lyricAddition ? `${song.lyrics}\n${lyricAddition}` : song.lyrics,
          musicNotes: noteAddition ? [...song.musicNotes, noteAddition] : song.musicNotes,
        };
      }),
    );
    setMessage("Collaboration added to the shared songbook.");
    setCollaboration((current) => ({
      ...current,
      contributor: "",
      lyricLine: "",
      musicNote: "",
    }));
  }

  function toggleSelected(songId: string) {
    setSelectedIds((current) =>
      current.includes(songId) ? current.filter((id) => id !== songId) : [...current, songId],
    );
  }

  function moveSelected(songId: string, direction: -1 | 1) {
    setSelectedIds((current) => {
      const index = current.indexOf(songId);
      const target = index + direction;
      if (index === -1 || target < 0 || target >= current.length) {
        return current;
      }

      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  function autoBuildArc() {
    const nextIds = positions
      .map((position) => songs.find((song) => song.position === position)?.id)
      .filter((id): id is string => Boolean(id));
    setSelectedIds(nextIds);
    setMessage("Built a classic musical arc from the current song pool.");
  }

  async function playMusical() {
    if (!selectedSongs.length) {
      setMessage("Select at least one song before pressing play.");
      return;
    }

    stopPlayback();

    type AudioWindow = Window &
      typeof globalThis & {
        webkitAudioContext?: typeof AudioContext;
      };
    const AudioContextConstructor = window.AudioContext ?? (window as AudioWindow).webkitAudioContext;

    if (!AudioContextConstructor) {
      setMessage("This browser does not support Web Audio playback.");
      return;
    }

    const context = new AudioContextConstructor();
    audioContextRef.current = context;
    await context.resume();

    const durations = selectedSongs.map(getSongDuration);
    const totalDuration = durations.reduce((sum, duration) => sum + duration, 0);
    let offsetMs = 0;
    const startedAt = Date.now();

    selectedSongs.forEach((song, index) => {
      const durationMs = durations[index];
      scheduleSongAudio(context, song, context.currentTime + offsetMs / 1000 + 0.08, durationMs / 1000);

      const cueTimeout = window.setTimeout(() => {
        setNowPlayingId(song.id);
      }, offsetMs);
      timeoutRefs.current.push(cueTimeout);
      offsetMs += durationMs;
    });

    progressIntervalRef.current = window.setInterval(() => {
      const elapsed = Date.now() - startedAt;
      setPlaybackProgress(Math.min(100, Math.round((elapsed / totalDuration) * 100)));
    }, 100);

    const finishTimeout = window.setTimeout(() => {
      clearPlaybackTimers();
      if (audioContextRef.current) {
        void audioContextRef.current.close();
        audioContextRef.current = null;
      }
      setPlaybackProgress(100);
      setIsPlaying(false);
      setNowPlayingId(null);
    }, totalDuration + 250);
    timeoutRefs.current.push(finishTimeout);

    setIsPlaying(true);
    setPlaybackProgress(0);
    setMessage("Playing the stitched musical.");
  }

  function resetSongbook() {
    stopPlayback();
    setSongs(seedSongs);
    setSelectedIds(seedSongs.map((song) => song.id));
    setMessage("Restored the demo community songbook.");
  }

  return (
    <main>
      <section className="hero">
        <div className="hero__copy">
          <p className="eyebrow">Crowdsourced Musical Lab</p>
          <h1>Create songs together, stitch the best into a complete musical, and play it.</h1>
          <p>
            Submit lyrics, describe musical ideas, invite collaborators, select the songs that belong in the show,
            then hear a generated motif sequence while the stitched libretto rolls below.
          </p>
          <div className="hero__actions">
            <a href="#create" className="button button--primary">
              Add a song
            </a>
            <a href="#musical" className="button">
              Build the musical
            </a>
          </div>
        </div>
        <div className="hero__panel" aria-label="Community statistics">
          <span>{stats.songs}</span>
          <p>songs in the pool</p>
          <span>{stats.contributors}</span>
          <p>named contributors</p>
          <span>{stats.minutes}</span>
          <p>minutes of generated motifs</p>
        </div>
      </section>

      {message && (
        <div className="message" role="status">
          {message}
        </div>
      )}

      <section className="grid grid--forms" id="create">
        <form className="card form" onSubmit={handleCreateSong}>
          <div className="section-heading">
            <p className="eyebrow">Create</p>
            <h2>Submit a song</h2>
          </div>
          <label>
            Song title
            <input
              value={draft.title}
              onChange={(event) => setDraft({ ...draft, title: event.target.value })}
              placeholder="The Ballad of Block 42"
            />
          </label>
          <label>
            Creator
            <input
              value={draft.creator}
              onChange={(event) => setDraft({ ...draft, creator: event.target.value })}
              placeholder="Your name"
            />
          </label>
          <label>
            Collaborators
            <input
              value={draft.collaborators}
              onChange={(event) => setDraft({ ...draft, collaborators: event.target.value })}
              placeholder="Names separated by commas"
            />
          </label>
          <div className="form__row">
            <label>
              Story slot
              <select
                value={draft.position}
                onChange={(event) => setDraft({ ...draft, position: event.target.value as SongPosition })}
              >
                {positions.map((position) => (
                  <option key={position}>{position}</option>
                ))}
              </select>
            </label>
            <label>
              Mood
              <select value={draft.mood} onChange={(event) => setDraft({ ...draft, mood: event.target.value })}>
                {moods.map((mood) => (
                  <option key={mood}>{mood}</option>
                ))}
              </select>
            </label>
          </div>
          <div className="form__row">
            <label>
              Key
              <select value={draft.key} onChange={(event) => setDraft({ ...draft, key: event.target.value })}>
                {keys.map((key) => (
                  <option key={key}>{key}</option>
                ))}
              </select>
            </label>
            <label>
              Tempo
              <input
                type="number"
                min="60"
                max="180"
                value={draft.tempo}
                onChange={(event) => setDraft({ ...draft, tempo: Number(event.target.value) })}
              />
            </label>
          </div>
          <label>
            Story premise
            <textarea
              value={draft.premise}
              onChange={(event) => setDraft({ ...draft, premise: event.target.value })}
              placeholder="What happens during this song?"
            />
          </label>
          <label>
            Lyrics
            <textarea
              className="textarea--large"
              value={draft.lyrics}
              onChange={(event) => setDraft({ ...draft, lyrics: event.target.value })}
              placeholder={"Write a verse, chorus, or hook...\nLine breaks are preserved."}
            />
          </label>
          <label>
            Music idea
            <textarea
              value={draft.musicNote}
              onChange={(event) => setDraft({ ...draft, musicNote: event.target.value })}
              placeholder="Describe instrumentation, groove, motif, or harmony."
            />
          </label>
          <button className="button button--primary" type="submit">
            Submit to song pool
          </button>
        </form>

        <form className="card form" onSubmit={handleAddCollaboration}>
          <div className="section-heading">
            <p className="eyebrow">Collaborate</p>
            <h2>Add to an existing song</h2>
          </div>
          <label>
            Song
            <select
              value={collaboration.songId}
              onChange={(event) => setCollaboration({ ...collaboration, songId: event.target.value })}
            >
              {songs.map((song) => (
                <option key={song.id} value={song.id}>
                  {song.title}
                </option>
              ))}
            </select>
          </label>
          <label>
            Contributor
            <input
              value={collaboration.contributor}
              onChange={(event) => setCollaboration({ ...collaboration, contributor: event.target.value })}
              placeholder="Who is adding this?"
            />
          </label>
          <label>
            New lyric line
            <textarea
              value={collaboration.lyricLine}
              onChange={(event) => setCollaboration({ ...collaboration, lyricLine: event.target.value })}
              placeholder="Add a line, rhyme, or alternate lyric."
            />
          </label>
          <label>
            New music note
            <textarea
              value={collaboration.musicNote}
              onChange={(event) => setCollaboration({ ...collaboration, musicNote: event.target.value })}
              placeholder="Add chord notes, instrumentation, dance break ideas, or vocal parts."
            />
          </label>
          <button className="button button--primary" type="submit">
            Share collaboration
          </button>
          <button className="button button--ghost" type="button" onClick={resetSongbook}>
            Reset demo data
          </button>
        </form>
      </section>

      <section className="section" aria-labelledby="pool-title">
        <div className="section-heading">
          <p className="eyebrow">Song pool</p>
          <h2 id="pool-title">Choose submissions for the show</h2>
        </div>
        <div className="song-grid">
          {songs.map((song) => {
            const selected = selectedIds.includes(song.id);
            const active = nowPlayingId === song.id;

            return (
              <article className={`song-card ${selected ? "song-card--selected" : ""} ${active ? "song-card--active" : ""}`} key={song.id}>
                <div className="song-card__top">
                  <div>
                    <p className="eyebrow">{song.position}</p>
                    <h3>{song.title}</h3>
                  </div>
                  <button
                    className={`pill ${selected ? "pill--selected" : ""}`}
                    type="button"
                    onClick={() => toggleSelected(song.id)}
                    aria-pressed={selected}
                  >
                    {selected ? "In show" : "Select"}
                  </button>
                </div>
                <p className="song-card__meta">
                  {song.mood} - {song.key} - {song.tempo} BPM
                </p>
                <p>{song.premise}</p>
                <pre>{song.lyrics}</pre>
                {song.musicNotes.length > 0 && (
                  <ul className="notes">
                    {song.musicNotes.map((note, index) => (
                      <li key={`${song.id}-note-${index}`}>{note}</li>
                    ))}
                  </ul>
                )}
                <p className="song-card__contributors">
                  By {song.creator}
                  {song.collaborators.length ? ` with ${song.collaborators.join(", ")}` : ""}
                </p>
              </article>
            );
          })}
        </div>
      </section>

      <section className="grid grid--builder" id="musical">
        <div className="card">
          <div className="section-heading">
            <p className="eyebrow">Stitcher</p>
            <h2>Show order</h2>
          </div>
          <p className="muted">
            The stitcher keeps the selected order, generates connective scene text, and plays each song's motif in
            sequence.
          </p>
          <div className="builder-actions">
            <button className="button button--primary" type="button" onClick={playMusical}>
              {isPlaying ? "Restart musical" : "Play musical"}
            </button>
            <button className="button" type="button" onClick={stopPlayback} disabled={!isPlaying}>
              Stop
            </button>
            <button className="button" type="button" onClick={autoBuildArc}>
              Auto-build arc
            </button>
            <button className="button button--ghost" type="button" onClick={() => setSelectedIds([])}>
              Clear
            </button>
          </div>
          <div className="progress" aria-label="Playback progress">
            <span style={{ width: `${playbackProgress}%` }} />
          </div>
          <ol className="show-order">
            {selectedSongs.length ? (
              selectedSongs.map((song, index) => (
                <li key={song.id} className={nowPlayingId === song.id ? "show-order__item--active" : ""}>
                  <span>
                    {index + 1}. {song.title}
                  </span>
                  <div>
                    <button type="button" onClick={() => moveSelected(song.id, -1)} disabled={index === 0}>
                      Up
                    </button>
                    <button
                      type="button"
                      onClick={() => moveSelected(song.id, 1)}
                      disabled={index === selectedSongs.length - 1}
                    >
                      Down
                    </button>
                  </div>
                </li>
              ))
            ) : (
              <li className="empty">No songs selected yet.</li>
            )}
          </ol>
        </div>

        <div className="card libretto">
          <div className="section-heading">
            <p className="eyebrow">Generated musical</p>
            <h2>Stitched libretto</h2>
          </div>
          {scenes.length ? (
            <>
              <p className="overture">
                Overture: The orchestra samples every selected melody while usernames glow across the proscenium.
              </p>
              {scenes.map((scene) => (
                <article className={nowPlayingId === scene.id ? "scene scene--active" : "scene"} key={scene.id}>
                  <p className="eyebrow">{scene.heading}</p>
                  <h3>{scene.songTitle}</h3>
                  <p className="scene__byline">{scene.byline}</p>
                  <p>{scene.transition}</p>
                  <pre>{scene.lyrics}</pre>
                  <p className="scene__music">
                    Music direction: {scene.key}, {scene.tempo} BPM.
                  </p>
                </article>
              ))}
              <p className="overture">
                Finale button: The audience votes for reprises, the ensemble bows, and the shared songbook stays open.
              </p>
            </>
          ) : (
            <p className="empty">Select songs from the pool to generate a musical.</p>
          )}
        </div>
      </section>
    </main>
  );
}

export default App;
